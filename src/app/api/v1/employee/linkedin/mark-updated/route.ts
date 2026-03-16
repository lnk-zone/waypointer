/**
 * POST /api/v1/employee/linkedin/mark-updated
 *
 * Marks the employee's LinkedIn profile as updated.
 * Logs an activity_log entry with action 'linkedin_updated'.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

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

  // Update linkedin_content — use select().single() to verify a row was updated
  const { data: updated, error: updateError } = await supabase
    .from("linkedin_content")
    .update({
      is_marked_updated: true,
      updated_at: new Date().toISOString(),
    })
    .eq("employee_id", employee.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No LinkedIn content found to mark as updated. Please generate LinkedIn content first."
    );
  }

  // Log activity
  const { error: logError } = await supabase.from("activity_log").insert({
    employee_id: employee.id,
    action: "linkedin_updated",
    metadata: { marked_at: new Date().toISOString() },
  });

  if (logError) {
    // Non-blocking — the update succeeded, just log insertion failed
    // Activity logging should not block the user experience
  }

  return NextResponse.json({
    data: {
      marked: true,
    },
  });
}
