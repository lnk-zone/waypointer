/**
 * POST /api/v1/employee/jobs/match
 *
 * Triggers AI-powered job matching for the authenticated employee.
 * Fetches active job listings, scores them against the employee's profile
 * and role paths using SCORE_JOB_BATCH, and persists results to job_matches.
 *
 * Uses Node.js Runtime because batch matching processes up to 20 sequential
 * AI calls (200 listings / 10 per batch), which may exceed Edge Runtime limits.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";
import { matchJobsForEmployee } from "@/lib/jobs/matching";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Get employee and snapshot
  const {
    employee,
    snapshotId,
    error: empError,
  } = await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (empError || !employee || !snapshotId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      empError?.message ?? "Employee profile not found"
    );
  }

  // Get all selected role paths (not just primary)
  const { data: rolePaths, error: pathError } = await supabase
    .from("role_paths")
    .select("id, title, core_keywords")
    .eq("employee_id", employee.id)
    .eq("is_selected", true);

  if (pathError || !rolePaths || rolePaths.length === 0) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No selected role paths found. Please select at least one role path first."
    );
  }

  // Assemble career context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  // Run matching
  const result = await matchJobsForEmployee(
    supabase,
    {
      employeeId: employee.id,
      authUserId: auth.user.id,
      seniority: employee.seniority ?? "mid_level",
      locationCity: employee.location_city ?? "Not specified",
      locationState: employee.location_state ?? "Not specified",
      workPref: employee.work_pref ?? "remote",
      compTargetMin: employee.comp_target_min ?? 0,
      compTargetMax: employee.comp_target_max ?? 0,
    },
    context.careerSnapshotJson,
    rolePaths.map((p) => ({
      id: p.id,
      title: p.title,
      core_keywords: (p.core_keywords as string[]) ?? [],
    }))
  );

  // Log activity
  await supabase.from("activity_log").insert({
    employee_id: employee.id,
    action: "job_matching_completed",
    metadata: {
      matched: result.matched,
      errors_count: result.errors.length,
    },
  });

  return NextResponse.json({
    data: {
      matched: result.matched,
      total_listings: result.total_listings,
      listings_capped: result.listings_capped,
      errors: result.errors,
    },
  });
}
