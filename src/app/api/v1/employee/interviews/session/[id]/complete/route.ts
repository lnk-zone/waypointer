/**
 * POST /api/v1/employee/interviews/session/:id/complete
 *
 * Marks an in-progress interview session as completed, stores the transcript,
 * triggers ANALYZE_INTERVIEW via the AI pipeline, and persists feedback.
 *
 * Uses Node.js Runtime — the ElevenLabs SDK and AI pipeline require Node.js.
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
import { createElevenLabsClient } from "@/lib/elevenlabs/client";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";
import { analyzeInterviewSchema } from "@/lib/validators/ai";
import type { AnalyzeInterviewOutput } from "@/lib/validators/ai";
import { z } from "zod";

// ─── Request Validation ───────────────────────────────────────────────

const completeSessionSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty"),
});

// ─── Types ────────────────────────────────────────────────────────────

interface SessionRecord {
  id: string;
  employee_id: string;
  role_path_id: string | null;
  format: string;
  difficulty: string;
  duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  elevenlabs_session_id: string | null;
}

interface RolePathRecord {
  id: string;
  title: string;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Resolve dynamic route param
  const { id: sessionId } = await params;

  if (!sessionId) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Session ID is required");
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = completeSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Get employee and snapshot for career context
  const { employee, snapshotId, error: empSnapError } =
    await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (empSnapError || !employee || !snapshotId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      empSnapError?.message ?? "Employee profile not found"
    );
  }

  // Verify the session exists, belongs to the employee, and has not been completed yet
  const { data: rawSession, error: sessionError } = await supabase
    .from("interview_sessions")
    .select(
      "id, employee_id, role_path_id, format, difficulty, duration_minutes, started_at, completed_at, elevenlabs_session_id"
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !rawSession) {
    return apiError(ERROR_CODES.NOT_FOUND, "Interview session not found");
  }

  const session = rawSession as unknown as SessionRecord;

  if (session.employee_id !== employee.id) {
    return apiError(
      ERROR_CODES.FORBIDDEN,
      "You do not have access to this interview session"
    );
  }

  if (session.completed_at) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "This session has already been completed"
    );
  }

  // Update the session with transcript and mark completed
  const { error: updateError } = await supabase
    .from("interview_sessions")
    .update({
      transcript: input.transcript,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to complete interview session"
    );
  }

  // Clean up the ElevenLabs agent (fire-and-forget)
  if (session.elevenlabs_session_id) {
    try {
      const elevenlabs = createElevenLabsClient();
      Promise.resolve(
        elevenlabs.conversationalAi.agents.delete(
          session.elevenlabs_session_id
        )
      ).catch(() => {
        // Swallow — agent cleanup is non-critical
      });
    } catch {
      // Swallow — agent cleanup is non-critical
    }
  }

  // ─── Session duration guard ─────────────────────────────────────────
  // MP §3 Flow 9 edge case: don't generate feedback for sessions < 2 minutes

  const MIN_SESSION_SECONDS = 120;
  let sessionTooShort = false;

  if (session.started_at) {
    const startedAt = new Date(session.started_at).getTime();
    const completedAt = Date.now();
    const durationSeconds = Math.floor((completedAt - startedAt) / 1000);
    sessionTooShort = durationSeconds < MIN_SESSION_SECONDS;
  }

  if (sessionTooShort) {
    // Log activity but skip analysis
    Promise.resolve(
      supabase.from("activity_log").insert({
        employee_id: employee.id,
        action: "interview_completed",
        metadata: {
          session_id: sessionId,
          transcript_length: input.transcript.length,
          feedback_generated: false,
          reason: "session_too_short",
        },
      })
    ).catch(() => {});

    return NextResponse.json({
      data: {
        session_id: sessionId,
        completed: true,
        feedback_generated: false,
        feedback: null,
      },
    });
  }

  // ─── Trigger ANALYZE_INTERVIEW via AI pipeline ──────────────────────

  // Fetch role path title for prompt context
  let rolePathTitle = "General role";
  if (session.role_path_id) {
    const { data: rawRolePath } = await supabase
      .from("role_paths")
      .select("id, title")
      .eq("id", session.role_path_id)
      .single();

    if (rawRolePath) {
      const rolePath = rawRolePath as unknown as RolePathRecord;
      rolePathTitle = rolePath.title;
    }
  }

  // Assemble career snapshot for context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  const variables: Record<string, string> = {
    ...context.variables,
    role_path_title: rolePathTitle,
    interview_format: session.format,
    interview_difficulty: session.difficulty,
    duration_minutes: String(session.duration_minutes),
    transcript: input.transcript,
  };

  let feedback: AnalyzeInterviewOutput | null = null;

  try {
    feedback = await executeAIPipeline<AnalyzeInterviewOutput>(
      "ANALYZE_INTERVIEW",
      variables,
      analyzeInterviewSchema,
      auth.user.id
    );

    // Persist feedback to the interview session record
    const { error: feedbackUpdateError } = await supabase
      .from("interview_sessions")
      .update({
        overall_score: feedback.overall_score,
        overall_summary: feedback.overall_summary,
        clarity_score: feedback.clarity_score,
        clarity_notes: feedback.clarity_notes,
        specificity_score: feedback.specificity_score,
        specificity_notes: feedback.specificity_notes,
        confidence_score: feedback.confidence_score,
        confidence_notes: feedback.confidence_notes,
        filler_word_count: feedback.filler_word_count,
        filler_words_noted: feedback.filler_words_noted,
        answer_analyses: feedback.answer_analyses,
        strongest_stories: feedback.strongest_stories,
        weak_answers: feedback.weak_answers,
        next_recommendation: feedback.next_recommendation,
        feedback_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (feedbackUpdateError) {
      // Feedback generated but failed to persist — clear so response is accurate
      feedback = null;
    }
  } catch {
    // AI analysis failed — session is still completed with transcript
    // The feedback page will detect feedback_generated = false and show retry option
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "interview_completed",
      metadata: {
        session_id: sessionId,
        transcript_length: input.transcript.length,
        feedback_generated: feedback !== null,
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: {
      session_id: sessionId,
      completed: true,
      feedback_generated: feedback !== null,
      feedback: feedback ?? null,
    },
  });
}
