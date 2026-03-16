/**
 * PATCH /api/v1/employee/resume/[id]
 *
 * Inline edit endpoint for resume content fields. Updates the individual columns
 * and keeps full_content JSONB in sync. No AI calls — pure database update.
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

export const runtime = "edge";

const experienceEntrySchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  dates: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});

const patchResumeSchema = z
  .object({
    summary_statement: z.string().min(1).optional(),
    skills_section: z.array(z.string().min(1)).min(1).optional(),
    experience_section: z.array(experienceEntrySchema).min(1).optional(),
    keywords: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (data) =>
      data.summary_statement !== undefined ||
      data.skills_section !== undefined ||
      data.experience_section !== undefined ||
      data.keywords !== undefined,
    { message: "At least one field must be provided for update" }
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = patchResumeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const updates = parsed.data;
  const resumeId = params.id;

  const supabase = createServiceClient();

  // Get employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch the existing resume to verify ownership and to merge full_content
  const { data: existingResume, error: resumeError } = await supabase
    .from("resumes")
    .select(
      "id, summary_statement, skills_section, experience_section, keywords, full_content"
    )
    .eq("id", resumeId)
    .eq("employee_id", employee.id)
    .single();

  if (resumeError || !existingResume) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Resume not found or does not belong to this employee"
    );
  }

  // Build the column-level update payload
  const columnUpdates: Record<string, unknown> = {};
  if (updates.summary_statement !== undefined) {
    columnUpdates.summary_statement = updates.summary_statement;
  }
  if (updates.skills_section !== undefined) {
    columnUpdates.skills_section = updates.skills_section;
  }
  if (updates.experience_section !== undefined) {
    columnUpdates.experience_section = updates.experience_section;
  }
  if (updates.keywords !== undefined) {
    columnUpdates.keywords = updates.keywords;
  }

  // Merge into full_content JSONB, preserving unedited sections
  const currentFullContent =
    (existingResume.full_content as Record<string, unknown>) ?? {};

  const updatedFullContent: Record<string, unknown> = {
    ...currentFullContent,
    ...(updates.summary_statement !== undefined && {
      summary_statement: updates.summary_statement,
    }),
    ...(updates.skills_section !== undefined && {
      skills_section: updates.skills_section,
    }),
    ...(updates.experience_section !== undefined && {
      experience_section: updates.experience_section,
    }),
    ...(updates.keywords !== undefined && { keywords: updates.keywords }),
  };

  columnUpdates.full_content = updatedFullContent;
  columnUpdates.updated_at = new Date().toISOString();

  // Apply update
  const { data: updatedResume, error: updateError } = await supabase
    .from("resumes")
    .update(columnUpdates)
    .eq("id", resumeId)
    .eq("employee_id", employee.id)
    .select(
      "id, role_path_id, tone, version, summary_statement, skills_section, experience_section, keywords, full_content, ats_score, clarity_score, specificity_score, score_feedback, created_at, updated_at"
    )
    .single();

  if (updateError || !updatedResume) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update resume");
  }

  return NextResponse.json({
    resume_id: updatedResume.id,
    role_path_id: updatedResume.role_path_id,
    tone: updatedResume.tone,
    version: updatedResume.version,
    summary_statement: updatedResume.summary_statement,
    skills_section: updatedResume.skills_section,
    experience_section: updatedResume.experience_section,
    keywords: updatedResume.keywords,
    full_content: updatedResume.full_content,
    scores: {
      ats: updatedResume.ats_score,
      clarity: updatedResume.clarity_score,
      specificity: updatedResume.specificity_score,
      feedback: updatedResume.score_feedback,
    },
    created_at: updatedResume.created_at,
    updated_at: updatedResume.updated_at,
  });
}
