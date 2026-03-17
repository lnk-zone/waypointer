/**
 * POST /api/v1/employee/jobs/:match_id/kit
 *
 * Generates a complete application kit for a specific job match using the
 * GENERATE_APPLICATION_KIT AI pipeline (PR Prompt 10).
 *
 * - If a kit already exists for this match, returns it without regenerating.
 * - If no resume exists for the matching role path, includes a resume_recommendation
 *   field prompting the user to build their resume first.
 *
 * Uses Node.js Runtime because AI generation may take significant time.
 */

import { NextRequest, NextResponse } from "next/server";
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
  generateApplicationKitSchema,
  type GenerateApplicationKitOutput,
} from "@/lib/validators/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Types ───────────────────────────────────────────────────────────

interface JobMatchRow {
  id: string;
  job_listing_id: string;
  role_path_id: string | null;
  fit: string;
  match_explanation: string;
  job_listings: {
    title: string;
    company_name: string;
    location: string | null;
    description_full: string | null;
    description_summary: string | null;
    requirements: string[] | null;
  };
}

interface ResumeRow {
  id: string;
  full_content: Record<string, unknown> | null;
  summary_statement: string | null;
  skills_section: string[] | null;
  experience_section: unknown[] | null;
}

interface ApplicationKitRow {
  id: string;
  job_match_id: string;
  intro_paragraph: string | null;
  recruiter_message: string | null;
  hiring_manager_message: string | null;
  referral_request: string | null;
  resume_edits: unknown;
  interview_themes: unknown;
  created_at: string;
  updated_at: string;
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: matchId } = await params;
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

  // Verify the job match exists and belongs to this employee
  const { data: rawMatch, error: matchError } = await supabase
    .from("job_matches")
    .select(
      `id, job_listing_id, role_path_id, fit, match_explanation,
       job_listings!inner (title, company_name, location, description_full, description_summary, requirements)`
    )
    .eq("id", matchId)
    .eq("employee_id", employee.id)
    .single();

  if (matchError || !rawMatch) {
    return apiError(ERROR_CODES.NOT_FOUND, "Job match not found");
  }

  const match = rawMatch as unknown as JobMatchRow;

  // Check if a kit already exists — return it if so (idempotent)
  const { data: rawExisting } = await supabase
    .from("application_kits")
    .select("*")
    .eq("job_match_id", matchId)
    .single();

  if (rawExisting) {
    const existing = rawExisting as unknown as ApplicationKitRow;

    // Check if user has a resume for the recommendation
    const hasResume = await checkResumeExists(
      supabase,
      employee.id,
      match.role_path_id
    );

    return NextResponse.json({
      data: {
        id: existing.id,
        job_match_id: existing.job_match_id,
        intro_paragraph: existing.intro_paragraph,
        recruiter_message: existing.recruiter_message,
        hiring_manager_message: existing.hiring_manager_message,
        referral_request: existing.referral_request,
        resume_edits: existing.resume_edits,
        interview_themes: existing.interview_themes,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
        ...(hasResume ? {} : { resume_recommendation: buildResumeRecommendation() }),
      },
    });
  }

  // Get the role path for this match
  let rolePathJson = "null";
  if (match.role_path_id) {
    const { data: rolePath } = await supabase
      .from("role_paths")
      .select("id, title, category, core_keywords, why_it_fits, gap_analysis")
      .eq("id", match.role_path_id)
      .single();

    if (rolePath) {
      rolePathJson = JSON.stringify(rolePath);
    }
  }

  // Get resume content for the matching role path (if available)
  let resumeContentJson = "No resume generated yet.";
  let hasResume = false;

  if (match.role_path_id) {
    const { data: rawResume } = await supabase
      .from("resumes")
      .select("id, full_content, summary_statement, skills_section, experience_section")
      .eq("employee_id", employee.id)
      .eq("role_path_id", match.role_path_id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (rawResume) {
      const resume = rawResume as unknown as ResumeRow;
      hasResume = true;
      resumeContentJson = JSON.stringify(
        resume.full_content ?? {
          summary_statement: resume.summary_statement,
          skills_section: resume.skills_section,
          experience_section: resume.experience_section,
        }
      );
    }
  }

  // Assemble career context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  // Build the job details for the prompt
  const listing = match.job_listings;
  const jobDescription =
    listing.description_full ?? listing.description_summary ?? "";
  const jobRequirements = listing.requirements
    ? listing.requirements.join("\n- ")
    : "Not specified";

  // Build variables for the prompt template
  const variables: Record<string, string> = {
    career_snapshot_json: context.careerSnapshotJson,
    role_path_json: rolePathJson,
    resume_content_json: resumeContentJson,
    job_title: listing.title,
    company_name: listing.company_name,
    job_description: jobDescription,
    job_requirements: jobRequirements,
    job_location: listing.location ?? "Not specified",
  };

  // Call AI pipeline
  let aiResult: GenerateApplicationKitOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_APPLICATION_KIT",
      variables,
      generateApplicationKitSchema,
      auth.user.id
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Application kit generation failed: ${err.message}`
        : "Failed to generate application kit"
    );
  }

  // Persist to application_kits table
  const { data: rawKit, error: insertError } = await supabase
    .from("application_kits")
    .insert({
      job_match_id: matchId,
      intro_paragraph: aiResult.intro_paragraph,
      recruiter_message: aiResult.recruiter_message,
      hiring_manager_message: aiResult.hiring_manager_message,
      referral_request: aiResult.referral_request,
      resume_edits: aiResult.resume_edits,
      interview_themes: aiResult.interview_themes,
    })
    .select("*")
    .single();

  if (insertError || !rawKit) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save application kit"
    );
  }

  const kit = rawKit as unknown as ApplicationKitRow;

  // Log activity (fire-and-forget, does not block response)
  logActivity(supabase, employee.id, {
    job_match_id: matchId,
    job_title: listing.title,
    company_name: listing.company_name,
  });

  return NextResponse.json({
    data: {
      id: kit.id,
      job_match_id: kit.job_match_id,
      intro_paragraph: kit.intro_paragraph,
      recruiter_message: kit.recruiter_message,
      hiring_manager_message: kit.hiring_manager_message,
      referral_request: kit.referral_request,
      resume_edits: kit.resume_edits,
      interview_themes: kit.interview_themes,
      created_at: kit.created_at,
      updated_at: kit.updated_at,
      ...(hasResume ? {} : { resume_recommendation: buildResumeRecommendation() }),
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Log activity without blocking or failing the primary operation */
function logActivity(
  supabase: ReturnType<typeof createServiceClient>,
  employeeId: string,
  metadata: Record<string, string>
) {
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employeeId,
      action: "application_kit_generated",
      metadata,
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });
}

async function checkResumeExists(
  supabase: ReturnType<typeof createServiceClient>,
  employeeId: string,
  rolePathId: string | null
): Promise<boolean> {
  if (!rolePathId) return false;

  const { data } = await supabase
    .from("resumes")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("role_path_id", rolePathId)
    .limit(1)
    .single();

  return !!data;
}

function buildResumeRecommendation(): string {
  return "You haven't generated a resume for this role path yet. Build your tailored resume first to get the most out of your application kit.";
}
