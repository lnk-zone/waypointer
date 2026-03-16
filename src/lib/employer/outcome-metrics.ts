/**
 * Shared outcome metrics computation for employer reporting.
 *
 * Used by both GET /api/v1/employer/outcomes and
 * GET /api/v1/employer/outcomes/export to avoid logic duplication.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────

export interface ProgramRecord {
  id: string;
  company_id: string;
  total_seats: number;
  access_duration_days: number;
  created_at: string;
}

export interface SeatRecord {
  id: string;
  status: string;
  activated_at: string | null;
}

export interface EmployeeRecord {
  id: string;
  seat_id: string;
  created_at: string;
}

export interface ConfidenceRecord {
  employee_id: string;
  score: number;
  week_number: number;
}

export interface ActivityRecord {
  employee_id: string;
  action: string;
  created_at: string;
}

export interface OutcomeMetrics {
  totalEngaged: number;
  pctEngaged: number;
  pctInterviewReady: number;
  avgTimeToFirstInterview: number;
  avgConfidenceLift: number;
  optInPlacementRate: number;
  optInCount: number;
  avgTimeToPlacement: number;
  avgSatisfaction: number;
  note: string;
  seatsActivated: number;
  activationRate: number;
  activities: ActivityRecord[];
  moduleUsage: Array<{ module: string; count: number }>;
  mostActivePeriods: Array<{ day: string; count: number }>;
}

// ─── Action → Module mapping ──────────────────────────────────────────

const ACTION_TO_MODULE: Record<string, string> = {
  resume_generated: "Resume Builder",
  resume_downloaded: "Resume Builder",
  job_search: "Job Matching",
  job_saved: "Job Matching",
  outreach_generated: "Outreach",
  outreach_sent: "Outreach",
  interview_prep_generated: "Interview Prep",
  interview_completed: "Interview Practice",
  interview_started: "Interview Practice",
  confidence_checkin: "Confidence Check-in",
  weekly_plan_generated: "Weekly Planning",
};

// ─── Main computation ─────────────────────────────────────────────────

export async function computeOutcomeMetrics(
  supabase: SupabaseClient,
  program: ProgramRecord,
  activeSeatIds: string[],
  seatsActivated: number
): Promise<OutcomeMetrics> {
  // Get employee profiles
  const { data: rawEmployees } = await supabase
    .from("employee_profiles")
    .select("id, seat_id, created_at")
    .in("seat_id", activeSeatIds);

  const employees =
    (rawEmployees as unknown as EmployeeRecord[] | null) ?? [];
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length === 0) {
    return emptyMetrics(seatsActivated, program.total_seats, "No employee profiles created yet.");
  }

  // Parallel queries
  const [
    activityResult,
    resumeResult,
    interviewResult,
    confidenceResult,
    interviewSessionsResult,
  ] = await Promise.all([
    supabase
      .from("activity_log")
      .select("employee_id, action, created_at")
      .in("employee_id", employeeIds),
    supabase
      .from("resumes")
      .select("employee_id")
      .in("employee_id", employeeIds),
    supabase
      .from("interview_sessions")
      .select("employee_id")
      .in("employee_id", employeeIds)
      .not("completed_at", "is", null),
    supabase
      .from("confidence_checkins")
      .select("employee_id, score, week_number")
      .in("employee_id", employeeIds)
      .order("week_number", { ascending: true }),
    supabase
      .from("interview_sessions")
      .select("employee_id, created_at")
      .in("employee_id", employeeIds)
      .not("completed_at", "is", null)
      .order("created_at", { ascending: true }),
  ]);

  const activities =
    (activityResult.data as unknown as ActivityRecord[] | null) ?? [];

  // Engaged = 3+ activity entries
  const activityCountMap = new Map<string, number>();
  for (const a of activities) {
    activityCountMap.set(
      a.employee_id,
      (activityCountMap.get(a.employee_id) ?? 0) + 1
    );
  }
  const totalEngaged = Array.from(activityCountMap.values()).filter(
    (c) => c >= 3
  ).length;
  const pctEngaged =
    seatsActivated > 0 ? totalEngaged / seatsActivated : 0;

  // Interview-ready = has resume AND completed mock interview
  const resumeEmployeeSet = new Set(
    (
      (resumeResult.data as unknown as Array<{ employee_id: string }>) ?? []
    ).map((r) => r.employee_id)
  );
  const interviewEmployeeSet = new Set(
    (
      (interviewResult.data as unknown as Array<{ employee_id: string }>) ?? []
    ).map((r) => r.employee_id)
  );
  const interviewReadyCount = employeeIds.filter(
    (id) => resumeEmployeeSet.has(id) && interviewEmployeeSet.has(id)
  ).length;
  const pctInterviewReady =
    seatsActivated > 0 ? interviewReadyCount / seatsActivated : 0;

  // Avg time to first interview
  const employeeCreatedMap = new Map<string, string>();
  for (const e of employees) {
    employeeCreatedMap.set(e.id, e.created_at);
  }

  const interviewSessions =
    (interviewSessionsResult.data as unknown as Array<{
      employee_id: string;
      created_at: string;
    }>) ?? [];

  const firstInterviewMap = new Map<string, string>();
  for (const s of interviewSessions) {
    if (!firstInterviewMap.has(s.employee_id)) {
      firstInterviewMap.set(s.employee_id, s.created_at);
    }
  }

  let avgTimeToFirstInterview = 0;
  if (firstInterviewMap.size > 0) {
    let totalDays = 0;
    let count = 0;
    for (const [empId, interviewDate] of Array.from(
      firstInterviewMap.entries()
    )) {
      const profileCreated = employeeCreatedMap.get(empId);
      if (profileCreated) {
        const days = Math.floor(
          (new Date(interviewDate).getTime() -
            new Date(profileCreated).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        totalDays += Math.max(0, days);
        count++;
      }
    }
    avgTimeToFirstInterview = count > 0 ? Math.round(totalDays / count) : 0;
  }

  // Confidence data
  const confidenceCheckins =
    (confidenceResult.data as unknown as ConfidenceRecord[] | null) ?? [];
  const firstCheckin = new Map<string, number>();
  const lastCheckin = new Map<string, number>();

  for (const c of confidenceCheckins) {
    if (!firstCheckin.has(c.employee_id)) {
      firstCheckin.set(c.employee_id, c.score);
    }
    lastCheckin.set(c.employee_id, c.score);
  }

  let avgConfidenceLift = 0;
  const employeesWithMultiple = Array.from(firstCheckin.entries()).filter(
    ([empId]) =>
      confidenceCheckins.filter((c) => c.employee_id === empId).length > 1
  );

  if (employeesWithMultiple.length > 0) {
    let totalLift = 0;
    for (const [empId] of employeesWithMultiple) {
      const first = firstCheckin.get(empId) ?? 0;
      const last = lastCheckin.get(empId) ?? 0;
      totalLift += last - first;
    }
    avgConfidenceLift =
      Math.round((totalLift / employeesWithMultiple.length) * 10) / 10;
  }

  // Satisfaction
  const satisfactionScores = Array.from(lastCheckin.values());
  const avgSatisfaction =
    satisfactionScores.length > 0
      ? Math.round(
          (satisfactionScores.reduce((sum, s) => sum + s, 0) /
            satisfactionScores.length) *
            10
        ) / 10
      : 0;

  const optInCount = lastCheckin.size;
  const optInPlacementRate = 0;
  const avgTimeToPlacement = 0;

  // Module usage
  const moduleCountMap = new Map<string, number>();
  for (const a of activities) {
    const moduleName = ACTION_TO_MODULE[a.action] ?? "Other";
    moduleCountMap.set(
      moduleName,
      (moduleCountMap.get(moduleName) ?? 0) + 1
    );
  }
  const moduleUsage = Array.from(moduleCountMap.entries())
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);

  // Most active periods (day of week)
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCountMap = new Map<number, number>();
  for (const a of activities) {
    const day = new Date(a.created_at).getDay();
    dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1);
  }
  const mostActivePeriods = dayNames
    .map((day, i) => ({ day, count: dayCountMap.get(i) ?? 0 }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  // Build note
  let note = "";
  if (optInCount === 0) {
    note =
      "No outcome data available yet. Encourage employees to complete check-ins.";
  } else if (optInCount < 10) {
    note = `Based on ${optInCount} self-report${optInCount > 1 ? "s" : ""}. Encourage employees to share their outcomes to improve this data.`;
  } else {
    note = `Based on ${optInCount} self-reports.`;
  }

  const activationRate =
    program.total_seats > 0 ? seatsActivated / program.total_seats : 0;

  return {
    totalEngaged,
    pctEngaged,
    pctInterviewReady,
    avgTimeToFirstInterview,
    avgConfidenceLift,
    optInPlacementRate,
    optInCount,
    avgTimeToPlacement,
    avgSatisfaction,
    note,
    seatsActivated,
    activationRate,
    activities,
    moduleUsage,
    mostActivePeriods,
  };
}

// ─── Empty metrics helper ─────────────────────────────────────────────

function emptyMetrics(
  seatsActivated: number,
  totalSeats: number,
  note: string
): OutcomeMetrics {
  return {
    totalEngaged: 0,
    pctEngaged: 0,
    pctInterviewReady: 0,
    avgTimeToFirstInterview: 0,
    avgConfidenceLift: 0,
    optInPlacementRate: 0,
    optInCount: 0,
    avgTimeToPlacement: 0,
    avgSatisfaction: 0,
    note,
    seatsActivated,
    activationRate: totalSeats > 0 ? seatsActivated / totalSeats : 0,
    activities: [],
    moduleUsage: [],
    mostActivePeriods: [],
  };
}
