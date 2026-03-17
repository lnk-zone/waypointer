/**
 * POST /api/v1/employee/resume/generate
 *
 * Generates a tailored resume for a specific role path using GENERATE_RESUME prompt,
 * then scores it using SCORE_RESUME prompt. Persists both content and scores.
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

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse request body
  let body: { role_path_id?: string; tone?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const { role_path_id, tone = "professional" } = body;

  if (!role_path_id) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "role_path_id is required"
    );
  }

  // Validate tone
  const validTones = ["professional", "confident", "conversational"] as const;
  if (!validTones.includes(tone as (typeof validTones)[number])) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "tone must be one of: professional, confident, conversational"
    );
  }

  const supabase = createServiceClient();

  // Get employee profile
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
      "Please review and confirm your career snapshot before generating resumes."
    );
  }

  // Get the specified role path
  const { data: rolePath, error: pathError } = await supabase
    .from("role_paths")
    .select(
      "id, title, category, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis, core_keywords"
    )
    .eq("id", role_path_id)
    .eq("employee_id", employee.id)
    .single();

  if (pathError || !rolePath) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Role path not found or does not belong to this employee"
    );
  }

  // Assemble career snapshot context
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

  // Step 1: Generate resume content
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

  // Step 2: Score the generated resume
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

  // Determine version: check for existing resumes for this path
  const { count: existingCount } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employee.id)
    .eq("role_path_id", role_path_id);

  const newVersion = (existingCount ?? 0) + 1;

  // Mark previous versions as not current
  if (newVersion > 1) {
    const { error: updateError } = await supabase
      .from("resumes")
      .update({ is_current: false })
      .eq("employee_id", employee.id)
      .eq("role_path_id", role_path_id)
      .eq("is_current", true);

    if (updateError) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update previous resume versions"
      );
    }
  }

  // Persist to resumes table
  const { data: resume, error: insertError } = await supabase
    .from("resumes")
    .insert({
      employee_id: employee.id,
      role_path_id: role_path_id,
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
      "Failed to save generated resume"
    );
  }

  // Return response matching MP §9 format
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
