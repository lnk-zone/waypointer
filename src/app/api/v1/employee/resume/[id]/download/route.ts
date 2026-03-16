/**
 * POST /api/v1/employee/resume/[id]/download
 *
 * Generates a PDF or DOCX file from resume content, uploads to Supabase Storage,
 * and returns a presigned URL with 1-hour expiry.
 *
 * Uses Node.js Runtime (not Edge) because document generation libraries require Node APIs.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumePDF } from "@/lib/documents/resume-pdf";
import { buildResumeDocx } from "@/lib/documents/resume-docx";
import React from "react";

export const runtime = "nodejs";

const requestSchema = z.object({
  format: z.enum(["pdf", "docx"]),
});

import type {
  ResumeExperienceEntry,
  ResumeEducationEntry,
} from "@/types/resume";

interface FullContent {
  summary_statement?: string;
  skills_section?: string[];
  experience_section?: ResumeExperienceEntry[];
  education_section?: ResumeEducationEntry[];
  certifications_section?: string[];
}

const GENERATION_TIMEOUT_MS = 30000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "format must be 'pdf' or 'docx'");
  }

  const { format } = parsed.data;
  const resumeId = params.id;
  const supabase = createServiceClient();

  // Get employee with seat name
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, seats!inner(employee_name, employee_email)")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Get the resume and verify ownership
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select(
      "id, role_path_id, version, summary_statement, skills_section, experience_section, keywords, full_content"
    )
    .eq("id", resumeId)
    .eq("employee_id", employee.id)
    .single();

  if (resumeError || !resume) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Resume not found or does not belong to this employee"
    );
  }

  // Extract content — prefer full_content, fallback to individual columns
  const fullContent = resume.full_content as FullContent | null;
  const summaryStatement =
    fullContent?.summary_statement ?? resume.summary_statement ?? "";
  const skillsSection =
    (fullContent?.skills_section ?? resume.skills_section ?? []) as string[];
  const experienceSection =
    (fullContent?.experience_section ??
      resume.experience_section ??
      []) as ResumeExperienceEntry[];
  const educationSection =
    (fullContent?.education_section ?? []) as ResumeEducationEntry[];
  const certificationsSection =
    (fullContent?.certifications_section ?? []) as string[];

  // Extract employee name/contact from seat
  const rawSeat = employee.seats as
    | { employee_name: string | null; employee_email: string | null }
    | { employee_name: string | null; employee_email: string | null }[]
    | null;
  const seat = Array.isArray(rawSeat) ? rawSeat[0] : rawSeat;
  const employeeName = seat?.employee_name ?? "Employee";
  const contactInfo = seat?.employee_email ?? undefined;

  // Generate document with timeout
  let fileBuffer: Buffer;
  let contentType: string;

  try {
    const generationPromise = (async () => {
      if (format === "pdf") {
        const pdfElement = React.createElement(ResumePDF, {
          employeeName,
          contactInfo,
          summaryStatement,
          skillsSection,
          experienceSection,
          educationSection,
          certificationsSection,
        });
        const pdfBuffer = await renderToBuffer(
          pdfElement as unknown as React.ReactElement
        );
        return {
          buffer: Buffer.from(pdfBuffer),
          type: "application/pdf",
        };
      } else {
        const docxBuffer = await buildResumeDocx({
          employeeName,
          contactInfo,
          summaryStatement,
          skillsSection,
          experienceSection,
          educationSection,
          certificationsSection,
        });
        return {
          buffer: docxBuffer,
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Document generation timed out")),
        GENERATION_TIMEOUT_MS
      )
    );

    const result = await Promise.race([generationPromise, timeoutPromise]);
    fileBuffer = result.buffer;
    contentType = result.type;
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      `Failed to generate ${format.toUpperCase()} document`
    );
  }

  // Upload to Supabase Storage
  const storagePath = `generated/${employee.id}/resume-${resume.role_path_id}-v${resume.version}.${format}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to upload generated document"
    );
  }

  // Update resume record with file URL
  const urlField = format === "pdf" ? "pdf_url" : "docx_url";
  const { error: updateError } = await supabase
    .from("resumes")
    .update({ [urlField]: storagePath })
    .eq("id", resumeId);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Document generated but failed to save file reference"
    );
  }

  // Generate presigned URL (1 hour expiry = 3600 seconds)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to generate download link"
    );
  }

  return NextResponse.json({
    data: {
      download_url: signedUrlData.signedUrl,
      format,
      file_size_bytes: fileBuffer.length,
    },
  });
}
