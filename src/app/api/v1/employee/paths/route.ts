/**
 * GET /api/v1/employee/paths
 *
 * Returns the employee's role paths (selected and primary status).
 * Used by the jobs feed filter dropdown and other components.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

  // Get all role paths for this employee
  const { data: paths, error: pathError } = await supabase
    .from("role_paths")
    .select(
      "id, title, category, is_selected, is_primary, confidence_score, demand_level, salary_band_min, salary_band_max"
    )
    .eq("employee_id", employee.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (pathError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch role paths");
  }

  return NextResponse.json({ data: paths ?? [] });
}
