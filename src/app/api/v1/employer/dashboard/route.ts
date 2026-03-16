/**
 * GET /api/v1/employer/dashboard
 *
 * Returns aggregated metrics for the employer dashboard. All data is
 * aggregated — no individual employee data is exposed.
 *
 * Uses Edge Runtime — read-only aggregation queries.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

// ─── Types ────────────────────────────────────────────────────────────

interface ProgramRecord {
  id: string;
  total_seats: number;
  used_seats: number;
}

interface SeatRecord {
  id: string;
  status: string;
  activated_at: string | null;
}

interface EmployeeIdRecord {
  id: string;
}

interface ActivityRecord {
  action: string;
  created_at: string;
}

interface ConfidenceRecord {
  score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function computeActivationsByDay(
  seats: SeatRecord[]
): Array<{ date: string; count: number }> {
  const dateMap = new Map<string, number>();

  for (const seat of seats) {
    if (seat.activated_at) {
      const date = new Date(seat.activated_at).toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeActivityHeatmap(
  activities: ActivityRecord[]
): Record<string, number> {
  const heatmap: Record<string, number> = {};
  for (const day of DAY_NAMES) heatmap[day] = 0;

  for (const activity of activities) {
    const dayIndex = new Date(activity.created_at).getDay();
    const dayName = DAY_NAMES[dayIndex];
    heatmap[dayName]++;
  }

  return heatmap;
}

function computeEngagementByModule(
  activities: ActivityRecord[]
): Array<{ module: string; usage_count: number }> {
  const MODULE_KEYWORDS: Record<string, string> = {
    resume: "resume",
    jobs: "job",
    outreach: "outreach",
    interviews: "interview",
    progress: "plan",
    linkedin: "linkedin",
  };

  const counts: Record<string, number> = {};
  for (const key of Object.keys(MODULE_KEYWORDS)) counts[key] = 0;

  for (const activity of activities) {
    const action = activity.action.toLowerCase();
    for (const [module, keyword] of Object.entries(MODULE_KEYWORDS)) {
      if (action.includes(keyword)) {
        counts[module]++;
        break;
      }
    }
  }

  return Object.entries(counts)
    .map(([module, usage_count]) => ({ module, usage_count }))
    .sort((a, b) => b.usage_count - a.usage_count);
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No company found. Please complete company setup first."
    );
  }

  try {
    const supabase = createServiceClient();

    // Get active program
    const { data: rawProgram } = await supabase
      .from("transition_programs")
      .select("id, total_seats, used_seats")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No active transition program found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    // Step 1: Get all seats for this program
    const { data: rawSeats } = await supabase
      .from("seats")
      .select("id, status, activated_at")
      .eq("program_id", program.id);

    const seats = (rawSeats as unknown as SeatRecord[] | null) ?? [];
    const activeSeatIds = seats
      .filter((s) => s.status === "activated" || s.status === "active")
      .map((s) => s.id);
    const seatsActivated = activeSeatIds.length;

    // Step 2: Get employee IDs for active seats
    let employeeIds: string[] = [];
    if (activeSeatIds.length > 0) {
      const { data: rawEmployees } = await supabase
        .from("employee_profiles")
        .select("id")
        .in("seat_id", activeSeatIds);

      employeeIds =
        ((rawEmployees as unknown as EmployeeIdRecord[] | null) ?? []).map(
          (e) => e.id
        );
    }

    // Step 3: Run parallel aggregation queries
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [
      onboardingResult,
      resumesResult,
      interviewsResult,
      weeklyActiveResult,
      activityResult,
      satisfactionResult,
    ] = await Promise.all([
      // Onboarding completed = employee profiles that exist
      Promise.resolve({ count: employeeIds.length }),

      // Employees with at least 1 resume
      employeeIds.length > 0
        ? supabase
            .from("resumes")
            .select("employee_id")
            .in("employee_id", employeeIds)
        : Promise.resolve({ data: [] }),

      // Employees with at least 1 completed interview
      employeeIds.length > 0
        ? supabase
            .from("interview_sessions")
            .select("employee_id")
            .in("employee_id", employeeIds)
            .not("completed_at", "is", null)
        : Promise.resolve({ data: [] }),

      // Employees with activity in last 7 days
      employeeIds.length > 0
        ? supabase
            .from("activity_log")
            .select("employee_id")
            .in("employee_id", employeeIds)
            .gte("created_at", sevenDaysAgo)
        : Promise.resolve({ data: [] }),

      // All activity for heatmap + module engagement (last 30 days)
      employeeIds.length > 0
        ? supabase
            .from("activity_log")
            .select("action, created_at")
            .in("employee_id", employeeIds)
            .gte("created_at", thirtyDaysAgo)
        : Promise.resolve({ data: [] }),

      // Confidence scores for average satisfaction
      employeeIds.length > 0
        ? supabase
            .from("confidence_checkins")
            .select("score")
            .in("employee_id", employeeIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Count unique employees for each metric
    const resumeEmployees = new Set(
      ((resumesResult.data as unknown as Array<{ employee_id: string }>) ?? []).map(
        (r) => r.employee_id
      )
    );
    const interviewEmployees = new Set(
      ((interviewsResult.data as unknown as Array<{ employee_id: string }>) ?? []).map(
        (r) => r.employee_id
      )
    );
    const weeklyActiveEmployees = new Set(
      ((weeklyActiveResult.data as unknown as Array<{ employee_id: string }>) ?? []).map(
        (r) => r.employee_id
      )
    );

    const onboardingCompleted = onboardingResult.count;
    const onboardingRate =
      seatsActivated > 0 ? onboardingCompleted / seatsActivated : 0;
    const resumeRate =
      seatsActivated > 0 ? resumeEmployees.size / seatsActivated : 0;
    const interviewRate =
      seatsActivated > 0 ? interviewEmployees.size / seatsActivated : 0;
    const weeklyActiveRate =
      seatsActivated > 0 ? weeklyActiveEmployees.size / seatsActivated : 0;

    const activities =
      (activityResult.data as unknown as ActivityRecord[] | null) ?? [];
    const activationsByDay = computeActivationsByDay(seats);
    const engagementByModule = computeEngagementByModule(activities);
    const activityHeatmap = computeActivityHeatmap(activities);

    const confidenceScores =
      (satisfactionResult.data as unknown as ConfidenceRecord[] | null) ?? [];
    const avgSatisfaction =
      confidenceScores.length > 0
        ? Math.round(
            (confidenceScores.reduce((sum, c) => sum + c.score, 0) /
              confidenceScores.length) *
              10
          ) / 10
        : 0;

    // Inactive count: activated employees with no activity in 7+ days
    const inactiveCount = seatsActivated - weeklyActiveEmployees.size;

    return NextResponse.json({
      data: {
        seats_purchased: program.total_seats,
        seats_activated: seatsActivated,
        onboarding_completion_rate: Math.round(onboardingRate * 1000) / 1000,
        resume_completion_rate: Math.round(resumeRate * 1000) / 1000,
        interview_practice_rate: Math.round(interviewRate * 1000) / 1000,
        weekly_active_rate: Math.round(weeklyActiveRate * 1000) / 1000,
        avg_satisfaction_score: avgSatisfaction,
        activations_by_day: activationsByDay,
        engagement_by_module: engagementByModule,
        inactive_count: Math.max(0, inactiveCount),
        activity_heatmap: activityHeatmap,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to load dashboard metrics"
    );
  }
}
