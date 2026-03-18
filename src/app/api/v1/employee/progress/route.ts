/**
 * GET /api/v1/employee/progress
 *
 * Returns aggregated progress metrics for the Progress Tracker dashboard:
 * resumes, LinkedIn, applications, outreach, interviews, streak, weekly
 * activity, milestones, and confidence history.
 *
 * Uses Edge Runtime — read-only aggregation route.
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
import { getWeekNumber } from "@/lib/plan/helpers";

// ─── Types ────────────────────────────────────────────────────────────

interface EmployeeRecord {
  id: string;
  created_at: string;
}

interface ActivityDate {
  created_at: string;
}

interface ConfidenceRecord {
  week_number: number;
  score: number;
}

interface Milestone {
  name: string;
  achieved: boolean;
  achieved_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the current streak of consecutive days with at least one activity.
 * Walks backwards from today (or yesterday if no activity today yet).
 */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Normalize all dates to YYYY-MM-DD in UTC
  const uniqueDays = new Set<string>();
  for (const d of dates) {
    uniqueDays.add(new Date(d).toISOString().split("T")[0]);
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Start from today or yesterday
  const current = new Date(today);
  if (!uniqueDays.has(todayStr)) {
    current.setDate(current.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dayStr = current.toISOString().split("T")[0];
    if (uniqueDays.has(dayStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute weekly activity counts for the last 4 weeks.
 */
function computeWeeklyActivity(
  dates: string[],
  createdAt: string
): { week: number; actions: number }[] {
  const currentWeek = getWeekNumber(createdAt);
  const weekCounts: Record<number, number> = {};

  // Initialize last 4 weeks
  for (let w = Math.max(1, currentWeek - 3); w <= currentWeek; w++) {
    weekCounts[w] = 0;
  }

  // Count activities per week
  const startDate = new Date(createdAt);
  for (const d of dates) {
    const actDate = new Date(d);
    const diffMs = actDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week = Math.max(1, Math.floor(diffDays / 7) + 1);
    if (week in weekCounts) {
      weekCounts[week]++;
    }
  }

  return Object.entries(weekCounts)
    .map(([w, actions]) => ({ week: Number(w), actions }))
    .sort((a, b) => a.week - b.week);
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  try {
    const supabase = createServiceClient();

    // Get employee profile
    const { data: rawEmployee, error: empError } = await supabase
      .from("employee_profiles")
      .select("id, created_at")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (empError || !rawEmployee) {
      return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
    }

    const employee = rawEmployee as unknown as EmployeeRecord;
    const currentWeek = getWeekNumber(employee.created_at);

    // Fetch all progress data in parallel
    const fourWeeksAgo = new Date(
      Date.now() - 28 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [
      resumesResult,
      linkedinResult,
      applicationsResult,
      outreachResult,
      interviewsPracticedResult,
      interviewsLandedResult,
      activityDatesResult,
      confidenceResult,
      firstResumeResult,
      firstApplicationResult,
      firstOutreachResult,
      firstInterviewResult,
    ] = await Promise.all([
      // Resumes completed
      supabase
        .from("resumes")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", employee.id),
      // LinkedIn updated — check linkedin_content.is_marked_updated
      supabase
        .from("linkedin_content")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", employee.id)
        .eq("is_marked_updated", true),
      // Applications tracked
      supabase
        .from("job_matches")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", employee.id)
        .in("recommended_action", [
          "apply_now",
          "reach_out_first",
          "seek_referral",
        ]),
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
      // Interviews landed (real interview invitations — tracked via activity_log)
      supabase
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", employee.id)
        .eq("action", "interview_landed"),
      // Activity dates for streak and weekly activity (last 28 days)
      supabase
        .from("activity_log")
        .select("created_at")
        .eq("employee_id", employee.id)
        .gte("created_at", fourWeeksAgo)
        .order("created_at", { ascending: true }),
      // Confidence check-in history
      supabase
        .from("confidence_checkins")
        .select("week_number, score")
        .eq("employee_id", employee.id)
        .order("week_number", { ascending: true }),
      // Milestones: first resume
      supabase
        .from("resumes")
        .select("created_at")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: true })
        .limit(1),
      // Milestones: first application
      supabase
        .from("job_matches")
        .select("created_at")
        .eq("employee_id", employee.id)
        .in("recommended_action", [
          "apply_now",
          "reach_out_first",
          "seek_referral",
        ])
        .order("created_at", { ascending: true })
        .limit(1),
      // Milestones: first outreach
      supabase
        .from("outreach_messages")
        .select("created_at")
        .eq("employee_id", employee.id)
        .eq("is_sent", true)
        .order("created_at", { ascending: true })
        .limit(1),
      // Milestones: first mock interview
      supabase
        .from("interview_sessions")
        .select("completed_at")
        .eq("employee_id", employee.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true })
        .limit(1),
    ]);

    // Check for critical query failures
    if (
      resumesResult.error ||
      applicationsResult.error ||
      activityDatesResult.error
    ) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to load progress data"
      );
    }

    const resumesCompleted = resumesResult.count ?? 0;
    const linkedinUpdated = (linkedinResult.count ?? 0) > 0;
    const applicationsTracked = applicationsResult.count ?? 0;
    const outreachSent = outreachResult.count ?? 0;
    const interviewsPracticed = interviewsPracticedResult.count ?? 0;
    const interviewsLanded = interviewsLandedResult.count ?? 0;

    // Activity dates for streak + weekly chart
    const activityDates = (
      (activityDatesResult.data as unknown as ActivityDate[] | null) ?? []
    ).map((r) => r.created_at);

    const currentStreakDays = computeStreak(activityDates);
    const weeklyActivity = computeWeeklyActivity(
      activityDates,
      employee.created_at
    );

    // Confidence history
    const confidenceHistory = (
      (confidenceResult.data as unknown as ConfidenceRecord[] | null) ?? []
    ).map((r) => ({ week: r.week_number, score: r.score }));

    // Milestones
    const milestones: Milestone[] = [
      {
        name: "Resumes complete",
        achieved: resumesCompleted > 0,
        achieved_at:
          firstResumeResult.data && firstResumeResult.data.length > 0
            ? (
                firstResumeResult.data[0] as unknown as { created_at: string }
              ).created_at
            : null,
      },
      {
        name: "LinkedIn updated",
        achieved: linkedinUpdated,
        achieved_at: linkedinUpdated ? new Date().toISOString() : null,
      },
      {
        name: "First application",
        achieved: applicationsTracked > 0,
        achieved_at:
          firstApplicationResult.data &&
          firstApplicationResult.data.length > 0
            ? (
                firstApplicationResult.data[0] as unknown as {
                  created_at: string;
                }
              ).created_at
            : null,
      },
      {
        name: "First outreach",
        achieved: outreachSent > 0,
        achieved_at:
          firstOutreachResult.data && firstOutreachResult.data.length > 0
            ? (
                firstOutreachResult.data[0] as unknown as {
                  created_at: string;
                }
              ).created_at
            : null,
      },
      {
        name: "First interview",
        achieved: interviewsPracticed > 0,
        achieved_at:
          firstInterviewResult.data && firstInterviewResult.data.length > 0
            ? (
                firstInterviewResult.data[0] as unknown as {
                  completed_at: string;
                }
              ).completed_at
            : null,
      },
      {
        name: "Offer received",
        achieved: false,
        achieved_at: null,
      },
    ];

    // Composite readiness score
    const weights = {
      resumes: 25,
      linkedin: 15,
      jobs_applied: 20,
      interviews: 20,
      outreach: 20,
    };

    let readinessScore = 0;
    if (resumesCompleted > 0) readinessScore += weights.resumes;
    if (linkedinUpdated) readinessScore += weights.linkedin;
    if (applicationsTracked > 0) readinessScore += weights.jobs_applied;
    if (interviewsPracticed > 0) readinessScore += weights.interviews;
    if (outreachSent > 0) readinessScore += weights.outreach;

    return NextResponse.json({
      data: {
        current_week: currentWeek,
        resumes_completed: resumesCompleted,
        linkedin_updated: linkedinUpdated,
        applications_tracked: applicationsTracked,
        outreach_sent: outreachSent,
        interviews_practiced: interviewsPracticed,
        interviews_landed: interviewsLanded,
        current_streak_days: currentStreakDays,
        weekly_activity: weeklyActivity,
        milestones,
        confidence_history: confidenceHistory,
        readiness_score: readinessScore,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to load progress data"
    );
  }
}
