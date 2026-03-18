/**
 * POST /api/v1/employee/resume/[id]/score
 *
 * Re-scores an existing resume WITHOUT regenerating content.
 * Reads current resume content, runs SCORE_RESUME AI pipeline,
 * updates scores in-place on the same row.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

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
  scoreResumeSchema,
  type ScoreResumeOutput,
} from "@/lib/validators/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: resumeId } = await params;
  const sessionId = auth.user.id;
  const supabase = createServiceClient();

  // Get employee
  const { data: employee } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (!employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch the current resume
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select(
      "id, employee_id, role_path_id, summary_statement, skills_section, experience_section, keywords, full_content, ats_score, clarity_score, specificity_score"
    )
    .eq("id", resumeId)
    .single();

  if (resumeError || !resume) {
    return apiError(ERROR_CODES.NOT_FOUND, "Resume not found");
  }

  if (resume.employee_id !== employee.id) {
    return apiError(ERROR_CODES.FORBIDDEN, "Not authorized");
  }

  // Get the role path for target keywords
  const { data: rolePath } = await supabase
    .from("role_paths")
    .select("id, title, core_keywords")
    .eq("id", resume.role_path_id)
    .single();

  if (!rolePath) {
    return apiError(ERROR_CODES.NOT_FOUND, "Role path not found");
  }

  // Build resume content for scoring
  const resumeContent = {
    summary_statement: resume.summary_statement,
    skills_section: resume.skills_section,
    experience_section: resume.experience_section,
    keywords: resume.keywords,
  };

  // Run SCORE_RESUME only (no regeneration)
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

  // Update scores in-place (no new version, no content change)
  const { error: updateError } = await supabase
    .from("resumes")
    .update({
      ats_score: scores.ats_score,
      clarity_score: scores.clarity_score,
      specificity_score: scores.specificity_score,
      score_feedback: {
        ats_feedback: scores.ats_feedback,
        clarity_feedback: scores.clarity_feedback,
        specificity_feedback: scores.specificity_feedback,
        missing_metrics: scores.missing_metrics,
        weak_bullets: scores.weak_bullets,
        general_suggestions: scores.general_suggestions,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", resumeId);

  if (updateError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save scores");
  }

  return NextResponse.json({
    data: {
      resume_id: resumeId,
      scores: {
        ats_score: scores.ats_score,
        clarity_score: scores.clarity_score,
        specificity_score: scores.specificity_score,
        ats_feedback: scores.ats_feedback,
        clarity_feedback: scores.clarity_feedback,
        specificity_feedback: scores.specificity_feedback,
        missing_metrics: scores.missing_metrics,
        weak_bullets: scores.weak_bullets,
        general_suggestions: scores.general_suggestions,
      },
    },
  });
}
