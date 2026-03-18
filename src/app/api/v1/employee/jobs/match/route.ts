/**
 * POST /api/v1/employee/jobs/match
 *
 * Triggers job ingestion from JSearch API, then AI-powered scoring
 * against the employee's profile and role paths.
 *
 * Pipeline:
 * 1. Fetch fresh listings from JSearch for each role path's keywords + location
 * 2. Upsert into job_listings table (deduplicated by external_id)
 * 3. Score all active listings against employee profile via SCORE_JOB_BATCH
 * 4. Persist scored matches to job_matches table
 *
 * Uses Node.js Runtime because batch matching processes sequential AI calls.
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
import { ingestMultipleSearches } from "@/lib/jobs/ingest";
import { JSearchProvider } from "@/lib/jobs/jsearch";
import type { JobSearchParams } from "@/lib/jobs/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  // ── Step 1: Ingest fresh jobs from JSearch ─────────────────────────
  const location = [employee.location_city, employee.location_state]
    .filter(Boolean)
    .join(", ");

  // Build search params for each role path
  // Use the path title (e.g. "Senior Data Analyst at Financial Services companies")
  // as the primary search query — JSearch works best with natural job title queries,
  // not lists of skills/tools.
  const searches: JobSearchParams[] = rolePaths.map((path) => {
    // Extract the job title portion before "at" if present, otherwise use full title
    const titleParts = path.title.split(" at ");
    const jobTitle = titleParts[0].trim();
    return {
      keywords: [jobTitle],
      location: location || "United States",
      remote: employee.work_pref === "remote",
      page: 1,
    };
  });

  try {
    const provider = new JSearchProvider();
    const ingestResult = await ingestMultipleSearches(
      supabase,
      provider,
      searches
    );
    console.log(
      `[jobs/match] Ingested ${ingestResult.fetched} listings, upserted ${ingestResult.upserted}, errors: ${ingestResult.errors.length}`
    );
  } catch (err) {
    // Log but continue — we may still have cached listings to score
    console.error(
      "[jobs/match] Ingestion error:",
      err instanceof Error ? err.message : err
    );
  }

  // ── Step 2: Assemble career context and run AI scoring ─────────────
  const context = await assemblePathContext(supabase, employee, snapshotId);

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
