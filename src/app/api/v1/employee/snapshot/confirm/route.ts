/**
 * POST /api/v1/employee/snapshot/confirm
 *
 * Marks the employee's career snapshot as confirmed.
 * This indicates the employee has reviewed and approved
 * their AI-extracted profile data.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .select("id")
    .eq("employee_id", employee.id)
    .single();

  if (snapError || !snapshot) {
    return apiError(
      ERROR_CODES.SNAPSHOT_NOT_FOUND,
      "Career snapshot not found. Please complete the resume import first."
    );
  }

  const { error: updateError } = await supabase
    .from("career_snapshots")
    .update({
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", snapshot.id);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to confirm career snapshot"
    );
  }

  return NextResponse.json({ snapshot_confirmed: true });
}
