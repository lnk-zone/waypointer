/**
 * POST /api/v1/employee/plan/weekly/generate
 *
 * Generates a personalized weekly action plan using the GENERATE_WEEKLY_PLAN
 * prompt. Replaces the current week's plan if one already exists.
 *
 * Uses Edge Runtime — single AI call proxy route.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import { generateWeeklyPlanSchema } from "@/lib/validators/ai";
import type { GenerateWeeklyPlanOutput } from "@/lib/validators/ai";
import {
  getWeekNumber,
  getWeekStartDate,
  type PlanItemStored,
} from "@/lib/plan/helpers";

// ─── Helpers ──────────────────────────────────────────────────────────

function getActivityTrend(
  recentCount: number,
  priorCount: number
): string {
  if (recentCount === 0 && priorCount === 0) return "inactive";
  if (recentCount > priorCount) return "increasing";
  if (recentCount < priorCount) return "decreasing";
  return "steady";
}

// ─── Types ────────────────────────────────────────────────────────────

interface EmployeeRecord {
  id: string;
  created_at: string;
}

interface RolePathRecord {
  id: string;
  title: string;
  is_primary: boolean;
}

interface WeeklyPlanRecord {
  id: string;
  week_number: number;
  items: PlanItemStored[];
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Get employee profile with created_at for week_number
  const { data: rawEmployee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, created_at")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !rawEmployee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const employee = rawEmployee as unknown as EmployeeRecord;
  const weekNumber = getWeekNumber(employee.created_at);

  // Fetch role paths for primary/secondary
  const { data: rawPaths } = await supabase
    .from("role_paths")
    .select("id, title, is_primary")
    .eq("employee_id", employee.id)
    .eq("is_selected", true)
    .order("is_primary", { ascending: false });

  const paths = (rawPaths as unknown as RolePathRecord[] | null) ?? [];
  const primaryPath = paths.find((p) => p.is_primary);
  const secondaryPath = paths.find((p) => !p.is_primary);

  // Fetch progress data
  const [
    resumesResult,
    linkedinResult,
    applicationsResult,
    outreachResult,
    interviewsResult,
    activityRecentResult,
    activityPriorResult,
    lastActivityResult,
  ] = await Promise.all([
    // Resumes completed
    supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id),
    // LinkedIn updated (check if any linkedin record exists)
    supabase
      .from("linkedin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id),
    // Applications tracked
    supabase
      .from("job_matches")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .in("recommended_action", ["apply_now", "reach_out_first", "seek_referral"]),
    // Outreach messages sent
    supabase
      .from("outreach_messages")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("is_sent", true),
    // Mock interviews completed
    supabase
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .not("completed_at", "is", null),
    // Activity in last 7 days
    supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Activity in prior 7 days
    supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Last activity
    supabase
      .from("activity_log")
      .select("created_at")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const resumesCompleted = resumesResult.count ?? 0;
  const linkedinUpdated = (linkedinResult.count ?? 0) > 0 ? "yes" : "no";
  const applicationsCount = applicationsResult.count ?? 0;
  const outreachCount = outreachResult.count ?? 0;
  const interviewsCompleted = interviewsResult.count ?? 0;
  const recentActivity = activityRecentResult.count ?? 0;
  const priorActivity = activityPriorResult.count ?? 0;
  const lastActiveDate =
    lastActivityResult.data && lastActivityResult.data.length > 0
      ? new Date(
          (lastActivityResult.data[0] as unknown as { created_at: string }).created_at
        ).toLocaleDateString()
      : "Never";
  const activityTrend = getActivityTrend(recentActivity, priorActivity);

  // Fetch incomplete items from last week (if any)
  const { data: rawLastPlan } = await supabase
    .from("weekly_plans")
    .select("id, week_number, items")
    .eq("employee_id", employee.id)
    .eq("week_number", weekNumber - 1)
    .single();

  let incompleteItemsJson = "[]";
  if (rawLastPlan) {
    const lastPlan = rawLastPlan as unknown as WeeklyPlanRecord;
    const items = lastPlan.items ?? [];
    const incomplete = items.filter(
      (item) => !item.is_completed && !item.is_deferred
    );
    incompleteItemsJson = JSON.stringify(incomplete);
  }

  // Build variables for the AI pipeline
  const variables: Record<string, string> = {
    week_number: String(weekNumber),
    primary_path_title: primaryPath?.title ?? "Not selected",
    secondary_path_title: secondaryPath?.title ?? "Not selected",
    resumes_completed: String(resumesCompleted),
    resumes_needed: String(paths.length || 1),
    linkedin_updated: linkedinUpdated,
    applications_count: String(applicationsCount),
    outreach_count: String(outreachCount),
    interviews_completed: String(interviewsCompleted),
    interviews_landed: "0",
    last_active_date: lastActiveDate,
    activity_trend: activityTrend,
    incomplete_items_json: incompleteItemsJson,
  };

  // Call the AI pipeline
  let plan: GenerateWeeklyPlanOutput;
  try {
    plan = await executeAIPipeline<GenerateWeeklyPlanOutput>(
      "GENERATE_WEEKLY_PLAN",
      variables,
      generateWeeklyPlanSchema,
      auth.user.id
    );
  } catch {
    return apiError(
      ERROR_CODES.AI_ERROR,
      "Unable to generate your weekly plan right now. Please try again."
    );
  }

  // Store the plan — upsert to replace existing plan for this week
  const weekStart = getWeekStartDate();
  const storedItems: PlanItemStored[] = plan.items.map((item) => ({
    ...item,
    is_completed: false,
    is_deferred: false,
  }));

  // Check if a plan for this week already exists
  const { data: rawExisting } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("week_number", weekNumber)
    .single();

  let planId: string;

  if (rawExisting) {
    // Update existing
    const existing = rawExisting as unknown as { id: string };
    const { error: updateError } = await supabase
      .from("weekly_plans")
      .update({
        items: storedItems,
        week_focus: plan.week_focus,
        encouragement: plan.encouragement,
      })
      .eq("id", existing.id);

    if (updateError) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to save weekly plan"
      );
    }
    planId = existing.id;
  } else {
    // Insert new
    const { data: newPlan, error: insertError } = await supabase
      .from("weekly_plans")
      .insert({
        employee_id: employee.id,
        week_number: weekNumber,
        week_start: weekStart,
        items: storedItems,
        week_focus: plan.week_focus,
        encouragement: plan.encouragement,
      })
      .select("id")
      .single();

    if (insertError || !newPlan) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to save weekly plan"
      );
    }
    planId = (newPlan as unknown as { id: string }).id;
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "weekly_plan_generated",
      metadata: {
        plan_id: planId,
        week_number: weekNumber,
        item_count: plan.items.length,
      },
    })
  ).catch(() => {});

  return NextResponse.json({
    data: {
      id: planId,
      week_number: weekNumber,
      week_start: weekStart,
      items: storedItems,
      week_focus: plan.week_focus,
      encouragement: plan.encouragement,
    },
  });
}
