/**
 * POST /api/v1/employee/resume/[id]/regenerate
 *
 * Regenerates an existing resume with a new tone. Fetches the existing resume,
 * runs GENERATE_RESUME and SCORE_RESUME through the AI pipeline, marks the old
 * version as not current, and inserts a new versioned row.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import {
  generateResumeSchema,
  scoreResumeSchema,
  type GenerateResumeOutput,
  type ScoreResumeOutput,
} from "@/lib/validators/ai";
import { assemblePathContext } from "@/lib/api/paths-helpers";
import { z } from "zod";

export const runtime = "edge";
export const maxDuration = 60;

const requestSchema = z.object({
  tone: z.enum(["professional", "confident", "conversational"]),
});

export async function POST(
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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { tone } = parsed.data;
  const resumeId = params.id;

  const supabase = createServiceClient();

  // Get employee profile with fields required by assemblePathContext
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select(
      "id, seniority, management_exp, level_dir, location_city, location_state, work_pref, comp_target_min, comp_target_max, years_of_experience"
    )
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch the existing resume and verify ownership
  const { data: existingResume, error: resumeError } = await supabase
    .from("resumes")
    .select("id, role_path_id, version, is_current")
    .eq("id", resumeId)
    .eq("employee_id", employee.id)
    .single();

  if (resumeError || !existingResume) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Resume not found or does not belong to this employee"
    );
  }

  // Get the associated role path
  const { data: rolePath, error: pathError } = await supabase
    .from("role_paths")
    .select(
      "id, title, category, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis, core_keywords"
    )
    .eq("id", existingResume.role_path_id)
    .eq("employee_id", employee.id)
    .single();

  if (pathError || !rolePath) {
    return apiError(ERROR_CODES.NOT_FOUND, "Associated role path not found");
  }

  // Get the career snapshot
  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .select("id, confirmed_at")
    .eq("employee_id", employee.id)
    .single();

  if (snapError || !snapshot) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Career snapshot not found. Please complete the resume import first."
    );
  }

  if (!snapshot.confirmed_at) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Please review and confirm your career snapshot before regenerating resumes."
    );
  }

  // Assemble career snapshot context for the AI pipeline
  const { variables } = await assemblePathContext(
    supabase,
    employee,
    snapshot.id
  );

  // Add resume-specific variables
  variables.role_path_json = JSON.stringify({
    title: rolePath.title,
    category: rolePath.category,
    why_it_fits: rolePath.why_it_fits,
    salary_band_min: rolePath.salary_band_min,
    salary_band_max: rolePath.salary_band_max,
    demand_level: rolePath.demand_level,
    confidence_score: rolePath.confidence_score,
    skills_overlap_pct: rolePath.skills_overlap_pct,
    gap_analysis: rolePath.gap_analysis,
    core_keywords: rolePath.core_keywords,
  });
  variables.tone = tone;

  const sessionId = auth.user.id;

  // Step 1: Generate resume content with the new tone
  let resumeContent: GenerateResumeOutput;
  try {
    resumeContent = await executeAIPipeline(
      "GENERATE_RESUME",
      variables,
      generateResumeSchema,
      sessionId
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Resume generation failed: ${err.message}`
        : "Failed to generate resume"
    );
  }

  // Step 2: Score the regenerated resume
  const scoreVariables: Record<string, string> = {
    resume_content_json: JSON.stringify(resumeContent),
    target_role_title: rolePath.title,
    target_keywords_json: JSON.stringify(rolePath.core_keywords ?? []),
  };

  let scores: ScoreResumeOutput;
  try {
    scores = await executeAIPipeline(
      "SCORE_RESUME",
      scoreVariables,
      scoreResumeSchema,
      sessionId
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Resume scoring failed: ${err.message}`
        : "Failed to score resume"
    );
  }

  // Step 3: Get the highest existing version number for this path
  const { data: versionRows } = await supabase
    .from("resumes")
    .select("version")
    .eq("employee_id", employee.id)
    .eq("role_path_id", existingResume.role_path_id)
    .order("version", { ascending: false })
    .limit(1);

  const newVersion = (versionRows?.[0]?.version ?? 0) + 1;

  // Step 4: Mark all current versions for this path as not current
  const { error: updateError } = await supabase
    .from("resumes")
    .update({ is_current: false })
    .eq("employee_id", employee.id)
    .eq("role_path_id", existingResume.role_path_id)
    .eq("is_current", true);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to update previous resume versions"
    );
  }

  // Step 5: Insert new resume row
  const { data: resume, error: insertError } = await supabase
    .from("resumes")
    .insert({
      employee_id: employee.id,
      role_path_id: existingResume.role_path_id,
      tone,
      summary_statement: resumeContent.summary_statement,
      skills_section: resumeContent.skills_section,
      experience_section: resumeContent.experience_section,
      keywords: resumeContent.keywords,
      full_content: {
        summary_statement: resumeContent.summary_statement,
        skills_section: resumeContent.skills_section,
        experience_section: resumeContent.experience_section,
        education_section: resumeContent.education_section,
        certifications_section: resumeContent.certifications_section,
        keywords: resumeContent.keywords,
      },
      ats_score: scores.ats_score,
      clarity_score: scores.clarity_score,
      specificity_score: scores.specificity_score,
      score_feedback: {
        ats_feedback: scores.ats_feedback,
        clarity_feedback: scores.clarity_feedback,
        specificity_feedback: scores.specificity_feedback,
        missing_metrics: scores.missing_metrics,
        weak_bullets: scores.weak_bullets,
        suggestions: scores.general_suggestions,
      },
      is_current: true,
      version: newVersion,
    })
    .select(
      "id, role_path_id, summary_statement, skills_section, experience_section, keywords, full_content, ats_score, clarity_score, specificity_score, score_feedback, tone, version"
    )
    .single();

  if (insertError || !resume) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save regenerated resume"
    );
  }

  return NextResponse.json({
    resume_id: resume.id,
    role_path_id: resume.role_path_id,
    tone: resume.tone,
    version: resume.version,
    summary_statement: resume.summary_statement,
    skills_section: resume.skills_section,
    experience_section: resume.experience_section,
    keywords: resume.keywords,
    full_content: resume.full_content,
    scores: {
      ats: resume.ats_score,
      clarity: resume.clarity_score,
      specificity: resume.specificity_score,
      feedback: resume.score_feedback,
    },
  });
}
