/**
 * Shared helpers for role path endpoints.
 * Assembles career snapshot context for AI pipeline calls.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface EmployeeProfile {
  id: string;
  seniority: string | null;
  management_exp: string | null;
  level_dir: string | null;
  location_city: string | null;
  location_state: string | null;
  work_pref: string | null;
  comp_target_min: number | null;
  comp_target_max: number | null;
  years_of_experience: number | null;
}

interface SnapshotContext {
  snapshotId: string;
  careerSnapshotJson: string;
  variables: Record<string, string>;
}

/**
 * Assemble the full context needed for role path AI generation.
 * Returns the career snapshot JSON and prompt variables.
 */
export async function assemblePathContext(
  supabase: SupabaseClient,
  employee: EmployeeProfile,
  snapshotId: string
): Promise<SnapshotContext> {
  const [workHistoryResult, skillsResult, achievementsResult, industriesResult, toolsResult] =
    await Promise.all([
      supabase
        .from("work_history")
        .select("company, title, start_date, end_date, duration_months")
        .eq("snapshot_id", snapshotId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("skills")
        .select("name, category, confidence")
        .eq("snapshot_id", snapshotId),
      supabase
        .from("achievements")
        .select("statement, impact, has_metric")
        .eq("snapshot_id", snapshotId),
      supabase
        .from("industries")
        .select("name, confidence")
        .eq("snapshot_id", snapshotId),
      supabase
        .from("tools_technologies")
        .select("name, category, confidence")
        .eq("snapshot_id", snapshotId),
    ]);

  const careerSnapshotJson = JSON.stringify({
    work_history: workHistoryResult.data ?? [],
    skills: skillsResult.data ?? [],
    achievements: achievementsResult.data ?? [],
    industries: industriesResult.data ?? [],
    tools: toolsResult.data ?? [],
  });

  const variables: Record<string, string> = {
    career_snapshot_json: careerSnapshotJson,
    seniority: employee.seniority ?? "mid_level",
    management_exp: employee.management_exp ?? "no_direct_reports",
    level_dir: employee.level_dir ?? "stay_current",
    location_city: employee.location_city ?? "Not specified",
    location_state: employee.location_state ?? "Not specified",
    work_pref: employee.work_pref ?? "remote",
    comp_target_min: employee.comp_target_min?.toString() ?? "0",
    comp_target_max: employee.comp_target_max?.toString() ?? "0",
    years_of_experience: employee.years_of_experience?.toString() ?? "Not specified",
  };

  return { snapshotId, careerSnapshotJson, variables };
}

/**
 * Fetch employee profile and validated snapshot for path operations.
 * Returns null values with error info if validation fails.
 */
export async function getEmployeeAndSnapshot(
  supabase: SupabaseClient,
  authUserId: string
): Promise<{
  employee: EmployeeProfile | null;
  snapshotId: string | null;
  error: { code: string; message: string } | null;
}> {
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select(
      "id, seniority, management_exp, level_dir, location_city, location_state, work_pref, comp_target_min, comp_target_max, years_of_experience"
    )
    .eq("auth_user_id", authUserId)
    .single();

  if (empError || !employee) {
    return {
      employee: null,
      snapshotId: null,
      error: { code: "NOT_FOUND", message: "Employee profile not found" },
    };
  }

  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .select("id, confirmed_at")
    .eq("employee_id", employee.id)
    .single();

  if (snapError || !snapshot) {
    return {
      employee: null,
      snapshotId: null,
      error: {
        code: "SNAPSHOT_NOT_FOUND",
        message: "Career snapshot not found. Please complete the resume import first.",
      },
    };
  }

  if (!snapshot.confirmed_at) {
    return {
      employee: null,
      snapshotId: null,
      error: {
        code: "SNAPSHOT_NOT_CONFIRMED",
        message: "Please review and confirm your career snapshot before generating role paths.",
      },
    };
  }

  return { employee, snapshotId: snapshot.id, error: null };
}
