/**
 * GET /api/v1/employee/plan
 *
 * Returns the existing transition plan for the authenticated employee,
 * or a 404 if no plan has been generated yet.
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

  // Fetch existing plan
  const { data: plan, error: planError } = await supabase
    .from("transition_plans")
    .select("id, search_strategy, readiness_score, readiness_breakdown, first_week_plan, suggested_timeline")
    .eq("employee_id", employee.id)
    .single();

  if (planError || !plan) {
    return apiError(ERROR_CODES.NOT_FOUND, "No transition plan found");
  }

  // Fetch selected paths for context
  const { data: selectedPaths } = await supabase
    .from("role_paths")
    .select("id, title, is_primary")
    .eq("employee_id", employee.id)
    .eq("is_selected", true)
    .order("is_primary", { ascending: false });

  return NextResponse.json({
    plan_id: plan.id,
    search_strategy: plan.search_strategy,
    readiness_score: plan.readiness_score,
    readiness_breakdown: plan.readiness_breakdown,
    first_week_plan: plan.first_week_plan,
    suggested_timeline: plan.suggested_timeline,
    selected_paths: (selectedPaths ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      is_primary: p.is_primary,
    })),
  });
}
