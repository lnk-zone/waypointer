/**
 * GET /api/v1/employee/plan/weekly
 *
 * Returns the current week's plan. If no plan exists for the current week,
 * returns { data: null } so the frontend knows to prompt generation.
 *
 * Uses Edge Runtime — lightweight read.
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
import { getWeekNumber, type PlanItemStored } from "@/lib/plan/helpers";

// ─── Types ────────────────────────────────────────────────────────────

interface WeeklyPlanRecord {
  id: string;
  week_number: number;
  week_start: string;
  items: PlanItemStored[];
  created_at: string;
  updated_at: string;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Get employee
  const { data: rawEmployee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, created_at")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !rawEmployee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const employee = rawEmployee as unknown as { id: string; created_at: string };
  const weekNumber = getWeekNumber(employee.created_at);

  // Fetch the current week's plan
  const { data: rawPlan } = await supabase
    .from("weekly_plans")
    .select("id, week_number, week_start, items, created_at, updated_at")
    .eq("employee_id", employee.id)
    .eq("week_number", weekNumber)
    .single();

  if (!rawPlan) {
    return NextResponse.json({
      data: null,
      meta: { week_number: weekNumber },
    });
  }

  const plan = rawPlan as unknown as WeeklyPlanRecord;

  return NextResponse.json({
    data: {
      id: plan.id,
      week_number: plan.week_number,
      week_start: plan.week_start,
      items: plan.items,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    },
    meta: { week_number: weekNumber },
  });
}
