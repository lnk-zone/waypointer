/**
 * GET /api/v1/employee/interviews/session/:id
 *
 * Fetches an interview session with feedback data for the feedback report.
 *
 * Uses Edge Runtime — lightweight read-only query.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

// ─── Types ────────────────────────────────────────────────────────────

interface SessionFeedbackRecord {
  id: string;
  employee_id: string;
  role_path_id: string | null;
  format: string;
  difficulty: string;
  duration_minutes: number;
  transcript: string | null;
  overall_score: number | null;
  overall_summary: string | null;
  clarity_score: number | null;
  clarity_notes: string | null;
  specificity_score: number | null;
  specificity_notes: string | null;
  confidence_score: number | null;
  confidence_notes: string | null;
  filler_word_count: number | null;
  filler_words_noted: string[] | null;
  answer_analyses: Array<{
    question: string;
    answer_summary: string;
    quality: string;
    feedback: string;
  }> | null;
  strongest_stories: string[] | null;
  weak_answers: Array<{
    question: string;
    issue: string;
    suggested_approach: string;
  }> | null;
  next_recommendation: string | null;
  feedback_generated: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface RolePathInfo {
  id: string;
  title: string;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: sessionId } = await params;

  if (!sessionId) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Session ID is required");
  }

  const supabase = createServiceClient();

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch session with all feedback fields
  const { data: rawSession, error: sessionError } = await supabase
    .from("interview_sessions")
    .select(
      `id, employee_id, role_path_id, format, difficulty, duration_minutes,
       transcript, overall_score, overall_summary, clarity_score, clarity_notes,
       specificity_score, specificity_notes, confidence_score, confidence_notes,
       filler_word_count, filler_words_noted, answer_analyses, strongest_stories,
       weak_answers, next_recommendation, feedback_generated, started_at,
       completed_at, created_at`
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !rawSession) {
    return apiError(ERROR_CODES.NOT_FOUND, "Interview session not found");
  }

  const session = rawSession as unknown as SessionFeedbackRecord;

  if (session.employee_id !== employee.id) {
    return apiError(
      ERROR_CODES.FORBIDDEN,
      "You do not have access to this interview session"
    );
  }

  // Fetch role path info
  let rolePath: RolePathInfo | null = null;
  if (session.role_path_id) {
    const { data: rawRolePath } = await supabase
      .from("role_paths")
      .select("id, title")
      .eq("id", session.role_path_id)
      .single();

    if (rawRolePath) {
      rolePath = rawRolePath as unknown as RolePathInfo;
    }
  }

  return NextResponse.json({
    data: {
      session_id: session.id,
      role_path: rolePath
        ? { id: rolePath.id, title: rolePath.title }
        : null,
      format: session.format,
      difficulty: session.difficulty,
      duration_minutes: session.duration_minutes,
      transcript: session.transcript,
      feedback_generated: session.feedback_generated,
      started_at: session.started_at,
      completed_at: session.completed_at,
      feedback: session.feedback_generated
        ? {
            overall_score: session.overall_score,
            overall_summary: session.overall_summary,
            clarity_score: session.clarity_score,
            clarity_notes: session.clarity_notes,
            specificity_score: session.specificity_score,
            specificity_notes: session.specificity_notes,
            confidence_score: session.confidence_score,
            confidence_notes: session.confidence_notes,
            filler_word_count: session.filler_word_count,
            filler_words_noted: session.filler_words_noted,
            answer_analyses: session.answer_analyses,
            strongest_stories: session.strongest_stories,
            weak_answers: session.weak_answers,
            next_recommendation: session.next_recommendation,
          }
        : null,
    },
  });
}
