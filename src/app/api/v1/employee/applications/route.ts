/**
 * GET /api/v1/employee/applications
 *
 * Returns the employee's saved and applied jobs from the applications table.
 * Query params:
 *   limit — max rows to return (default 50)
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
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    100
  );

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch applications (saved and applied)
  const { data: applications, error: appsError } = await supabase
    .from("applications")
    .select("id, job_match_id, job_title, company_name, status, applied_at, created_at")
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (appsError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch applications"
    );
  }

  return NextResponse.json({ data: applications ?? [] });
}
