/**
 * /api/v1/employee/interviews/prep
 *
 * POST — Generate new interview prep from a job description (or job_match_id).
 *         Caches by SHA-256 hash of (job_description + stage + format).
 * GET  — List all preps (`?list=true`) or fetch a single prep (`?prep_id=UUID`).
 * DELETE — Remove a prep by ID.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import {
  generateInterviewPrepSchema,
  type GenerateInterviewPrepOutput,
} from "@/lib/validators/ai";

// ─── Request Schemas ────────────────────────────────────────────────

const prepRequestSchema = z.object({
  job_description: z.string().min(50, "Job description must be at least 50 characters"),
  job_match_id: z.string().uuid().optional(),
  interviewer_titles: z.array(z.string()).max(5).optional(),
  interview_stage: z
    .enum(["phone_screen", "first_round", "second_round", "final_round"])
    .optional(),
  format: z.enum(["behavioral", "technical", "mixed"]).default("mixed"),
  regenerate: z.boolean().default(false),
});

const deleteRequestSchema = z.object({
  prep_id: z.string().uuid(),
});

// ─── Types ──────────────────────────────────────────────────────────

interface JobMatchRow {
  id: string;
  job_listings: {
    title: string;
    company_name: string;
    description_full: string | null;
  };
}

// ─── POST Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = prepRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const {
    job_description: userJobDescription,
    job_match_id: jobMatchId,
    interviewer_titles: interviewerTitles,
    interview_stage: interviewStage,
    format,
    regenerate,
  } = parsed.data;

  const supabase = createServiceClient();

  // Get employee and snapshot
  const {
    employee,
    snapshotId,
    error: empError,
  } = await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (empError || !employee || !snapshotId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      empError?.message ?? "Employee profile not found"
    );
  }

  // Resolve job details from job_match_id if provided
  let jobDescription = userJobDescription;
  let jobTitle = "";
  let companyName = "";

  if (jobMatchId) {
    const { data: rawMatch } = await supabase
      .from("job_matches")
      .select("id, job_listings!inner(title, company_name, description_full)")
      .eq("id", jobMatchId)
      .eq("employee_id", employee.id)
      .single();

    if (rawMatch) {
      const match = rawMatch as unknown as JobMatchRow;
      jobTitle = match.job_listings.title;
      companyName = match.job_listings.company_name;

      // Use fetched description if user-provided one is shorter
      const fetchedDesc = match.job_listings.description_full ?? "";
      if (fetchedDesc.length > jobDescription.length) {
        jobDescription = fetchedDesc;
      }
    }
  }

  // If no job_match_id, extract job title from first line of pasted JD
  if (!jobMatchId || !jobTitle) {
    const firstLine = jobDescription.split("\n")[0]?.trim();
    jobTitle = firstLine && firstLine.length <= 120 ? firstLine : "Custom Position";
  }

  // ─── Cache Deduplication ────────────────────────────────────────

  const hashInput = jobDescription + (interviewStage ?? "") + format;
  const jobDescriptionHash = createHash("sha256").update(hashInput).digest("hex");

  // Check for existing cache
  if (!regenerate) {
    const { data: cached } = await supabase
      .from("interview_prep")
      .select("id, content, job_title, company_name, interview_stage, format, created_at")
      .eq("employee_id", employee.id)
      .eq("job_description_hash", jobDescriptionHash)
      .single();

    if (cached) {
      return NextResponse.json({
        data: {
          id: cached.id,
          ...cached.content as Record<string, unknown>,
          job_title: cached.job_title,
          company_name: cached.company_name,
          interview_stage: cached.interview_stage,
          format: cached.format,
          created_at: cached.created_at,
        },
        cached: true,
      });
    }
  }

  // Delete existing cache if regenerating
  if (regenerate) {
    await supabase
      .from("interview_prep")
      .delete()
      .eq("employee_id", employee.id)
      .eq("job_description_hash", jobDescriptionHash);
  }

  // ─── AI Generation ────────────────────────────────────────────

  const context = await assemblePathContext(supabase, employee, snapshotId);

  const variables: Record<string, string> = {
    ...context.variables,
    career_snapshot_json: context.careerSnapshotJson,
    job_description: jobDescription,
    interviewer_titles: interviewerTitles?.join("\n") ?? "",
    interview_stage: interviewStage ?? "",
    interview_format: format,
  };

  let aiResult: GenerateInterviewPrepOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_INTERVIEW_PREP",
      variables,
      generateInterviewPrepSchema,
      auth.user.id
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Interview prep generation failed: ${err.message}`
        : "Failed to generate interview prep materials"
    );
  }

  // ─── Build response payload ───────────────────────────────────

  const responseData = {
    job_title: jobTitle,
    company_name: companyName || null,
    interview_stage: interviewStage ?? null,
    format,
    interviewer_lenses: aiResult.interviewer_lenses,
    alignments: aiResult.alignments,
    gaps_to_address: aiResult.gaps_to_address,
    opening_statement: aiResult.opening_statement,
    closing_statement: aiResult.closing_statement,
    behavioral_questions: aiResult.behavioral_questions,
    technical_questions: aiResult.technical_questions,
    smart_questions_to_ask: aiResult.smart_questions_to_ask,
    preparation_checklist: aiResult.preparation_checklist,
  };

  // ─── Persist to cache ─────────────────────────────────────────

  const { data: inserted, error: insertError } = await supabase
    .from("interview_prep")
    .insert({
      employee_id: employee.id,
      role_path_id: null,
      job_match_id: jobMatchId ?? null,
      content: responseData,
      job_description_hash: jobDescriptionHash,
      job_description_text: jobDescription,
      job_title: jobTitle,
      company_name: companyName || null,
      interviewer_titles: interviewerTitles ?? null,
      interview_stage: interviewStage ?? null,
      format,
    })
    .select("id")
    .single();

  if (insertError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save interview prep"
    );
  }

  // ─── Log activity (fire-and-forget) ───────────────────────────

  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "interview_prep_generated",
      metadata: {
        job_title: jobTitle,
        company_name: companyName || null,
        interview_stage: interviewStage ?? null,
        format,
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: { id: inserted.id, ...responseData },
  });
}

// ─── GET Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const listMode = searchParams.get("list") === "true";
  const prepId = searchParams.get("prep_id");

  // Get employee ID
  const { data: employeeRow } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (!employeeRow) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const employeeId = employeeRow.id;

  if (listMode) {
    // List all preps for this employee
    const { data: preps, error: listError } = await supabase
      .from("interview_prep")
      .select("id, job_title, company_name, interview_stage, format, created_at")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (listError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to list interview preps");
    }

    return NextResponse.json({ data: preps ?? [] });
  }

  if (prepId) {
    // Fetch a single prep by ID
    const { data: prep, error: fetchError } = await supabase
      .from("interview_prep")
      .select("*")
      .eq("id", prepId)
      .eq("employee_id", employeeId)
      .single();

    if (fetchError || !prep) {
      return apiError(ERROR_CODES.NOT_FOUND, "Interview prep not found");
    }

    return NextResponse.json({ data: prep });
  }

  return apiError(
    ERROR_CODES.VALIDATION_ERROR,
    "Provide either list=true or prep_id query parameter"
  );
}

// ─── DELETE Handler ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const { prep_id: prepId } = parsed.data;

  const supabase = createServiceClient();

  // Get employee ID
  const { data: employeeRow } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (!employeeRow) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Verify ownership and delete
  const { data: existing } = await supabase
    .from("interview_prep")
    .select("id")
    .eq("id", prepId)
    .eq("employee_id", employeeRow.id)
    .single();

  if (!existing) {
    return apiError(ERROR_CODES.NOT_FOUND, "Interview prep not found");
  }

  const { error: deleteError } = await supabase
    .from("interview_prep")
    .delete()
    .eq("id", prepId)
    .eq("employee_id", employeeRow.id);

  if (deleteError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to delete interview prep");
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employeeRow.id,
      action: "interview_prep_deleted",
      metadata: { prep_id: prepId },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({ data: { deleted: true } });
}
