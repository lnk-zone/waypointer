/**
 * POST /api/v1/employee/paths/select
 *
 * Persists the employee's role path selections (primary + secondary).
 * Clears existing selections, then marks the specified paths.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

export const runtime = "edge";

const selectSchema = z.object({
  primary_path_id: z.string().uuid(),
  secondary_path_ids: z.array(z.string().uuid()).default([]),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = selectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();
  const { primary_path_id, secondary_path_ids } = parsed.data;

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Clear all existing selections for this employee
  const { error: clearError } = await supabase
    .from("role_paths")
    .update({ is_primary: false, is_selected: false, updated_at: new Date().toISOString() })
    .eq("employee_id", employee.id);

  if (clearError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to clear existing selections");
  }

  // Set primary path
  const { error: primaryError } = await supabase
    .from("role_paths")
    .update({ is_primary: true, is_selected: true, updated_at: new Date().toISOString() })
    .eq("id", primary_path_id)
    .eq("employee_id", employee.id);

  if (primaryError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to set primary path");
  }

  // Set secondary paths
  if (secondary_path_ids.length > 0) {
    const { error: secondaryError } = await supabase
      .from("role_paths")
      .update({ is_selected: true, updated_at: new Date().toISOString() })
      .in("id", secondary_path_ids)
      .eq("employee_id", employee.id);

    if (secondaryError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to set secondary paths");
    }
  }

  return NextResponse.json({
    paths_selected: true,
    selected_count: 1 + secondary_path_ids.length,
  });
}
