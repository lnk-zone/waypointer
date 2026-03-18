/**
 * GET /api/v1/employee/interviews/performance
 *
 * Returns completed interview sessions for the performance sidebar.
 * Returns up to 10 most recent completed sessions with scores.
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

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

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

  // Fetch completed interview sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from("interview_sessions")
    .select(
      "id, overall_score, clarity_score, specificity_score, confidence_score, format, completed_at, feedback_generated"
    )
    .eq("employee_id", employee.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(10);

  if (sessionsError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch interview sessions"
    );
  }

  return NextResponse.json({ data: sessions ?? [] });
}
