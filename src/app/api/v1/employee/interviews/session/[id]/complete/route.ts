/**
 * POST /api/v1/employee/interviews/session/:id/complete
 *
 * Marks an in-progress interview session as completed and stores the
 * transcript. Feedback analysis is handled by E9-03.
 *
 * Uses Node.js Runtime.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

// ─── Request Validation ───────────────────────────────────────────────

const completeSessionSchema = z.object({
  transcript: z.string(),
});

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

  // Get the employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Verify the session exists, belongs to the employee, and has not been completed yet
  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .select("id, employee_id, completed_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Interview session not found"
    );
  }

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

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "interview_completed",
      metadata: {
        session_id: sessionId,
        transcript_length: input.transcript.length,
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: {
      session_id: sessionId,
      completed: true,
    },
  });
}
