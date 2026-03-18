/**
 * Job Matching Engine — E7-02
 *
 * Scores active job listings against an employee's profile and target
 * role paths using the SCORE_JOB_BATCH AI pipeline (PR Prompt 9).
 *
 * Pipeline:
 * 1. Fetch active job listings matching basic criteria
 * 2. Batch them (up to 10 per AI call per PR spec)
 * 3. Call SCORE_JOB_BATCH for each batch
 * 4. Persist scored matches to job_matches table
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import {
  scoreJobBatchSchema,
  type ScoreJobBatchOutput,
  type ScoredJob,
} from "@/lib/validators/ai";

// ─── Types ───────────────────────────────────────────────────────────

interface EmployeeContext {
  employeeId: string;
  authUserId: string;
  seniority: string;
  locationCity: string;
  locationState: string;
  workPref: string;
  compTargetMin: number;
  compTargetMax: number;
}

interface RolePath {
  id: string;
  title: string;
  core_keywords: string[];
}

interface JobListingRow {
  id: string;
  external_id: string;
  title: string;
  company_name: string;
  location: string | null;
  is_remote: boolean;
  is_hybrid: boolean;
  description_summary: string | null;
  description_full: string | null;
  salary_min: number | null;
  salary_max: number | null;
  requirements: string[] | null;
}

export interface MatchResult {
  matched: number;
  total_listings: number;
  listings_capped: boolean;
  errors: string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const BATCH_SIZE = 10; // Max listings per AI call per PR Prompt 9
const UPSERT_BATCH_SIZE = 50;
const MAX_LISTINGS = 10; // Single AI batch to stay within Vercel 60s function timeout

// ─── Main Matching Function ──────────────────────────────────────────

/**
 * Score active job listings against the employee's profile and persist
 * results to the job_matches table. Processes listings in batches of 10
 * per the SCORE_JOB_BATCH specification.
 */
export async function matchJobsForEmployee(
  supabase: SupabaseClient,
  employee: EmployeeContext,
  careerSnapshotJson: string,
  rolePaths: RolePath[]
): Promise<MatchResult> {
  const result: MatchResult = {
    matched: 0,
    total_listings: 0,
    listings_capped: false,
    errors: [],
  };

  if (rolePaths.length === 0) {
    result.errors.push("No role paths found for employee");
    return result;
  }

  // Step 1: Count total active listings to detect capping
  const { count: totalActive } = await supabase
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  result.total_listings = totalActive ?? 0;
  result.listings_capped = result.total_listings > MAX_LISTINGS;

  // Step 1b: Get IDs of listings this employee already has matches for
  const { data: existingMatches } = await supabase
    .from("job_matches")
    .select("job_listing_id")
    .eq("employee_id", employee.employeeId);

  const alreadyMatchedIds = new Set(
    (existingMatches ?? []).map((m) => m.job_listing_id as string)
  );

  // Step 1c: Fetch active job listings NOT already matched (capped at MAX_LISTINGS)
  let listingsQuery = supabase
    .from("job_listings")
    .select(
      "id, external_id, title, company_name, location, is_remote, is_hybrid, " +
        "description_summary, description_full, salary_min, salary_max, requirements"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(MAX_LISTINGS);

  // Exclude already-matched listings so refresh finds NEW jobs
  if (alreadyMatchedIds.size > 0) {
    const excludeIds = Array.from(alreadyMatchedIds);
    // Supabase .not().in() for exclusion — batch if needed
    if (excludeIds.length <= 100) {
      listingsQuery = listingsQuery.not("id", "in", `(${excludeIds.join(",")})`);
    }
  }

  const { data: listings, error: listError } = await listingsQuery;

  if (listError) {
    result.errors.push(`Failed to fetch job listings: ${listError.message}`);
    return result;
  }

  if (!listings || listings.length === 0) {
    return result;
  }

  const typedListings = listings as unknown as JobListingRow[];

  // Step 2: Build role paths JSON for the prompt
  const rolePathsJson = JSON.stringify(
    rolePaths.map((p) => ({
      id: p.id,
      title: p.title,
      core_keywords: p.core_keywords,
    }))
  );

  // Step 3: Process in batches of 10
  const allScoredJobs: Array<ScoredJob & { jobListingId: string }> = [];

  for (let i = 0; i < typedListings.length; i += BATCH_SIZE) {
    const batch = typedListings.slice(i, i + BATCH_SIZE);

    // Build the job listings JSON for this batch
    const jobListingsJson = JSON.stringify(
      batch.map((job) => ({
        external_id: job.external_id,
        title: job.title,
        company_name: job.company_name,
        location: job.location,
        is_remote: job.is_remote,
        description: job.description_summary ?? job.description_full ?? "",
        requirements: job.requirements ?? [],
        salary_min: job.salary_min,
        salary_max: job.salary_max,
      }))
    );

    // Build variables for the prompt template
    const variables: Record<string, string> = {
      career_snapshot_json: careerSnapshotJson,
      role_paths_json: rolePathsJson,
      seniority: employee.seniority,
      location_city: employee.locationCity,
      location_state: employee.locationState,
      work_pref: employee.workPref,
      comp_target_min: employee.compTargetMin.toString(),
      comp_target_max: employee.compTargetMax.toString(),
      job_listings_json: jobListingsJson,
    };

    try {
      const aiResult: ScoreJobBatchOutput = await executeAIPipeline(
        "SCORE_JOB_BATCH",
        variables,
        scoreJobBatchSchema,
        employee.authUserId
      );

      // Map external_id back to the DB listing id
      const externalToDbId = new Map<string, string>();
      for (const job of batch) {
        externalToDbId.set(job.external_id, job.id);
      }

      for (const scored of aiResult.scored_jobs) {
        const dbId = externalToDbId.get(scored.job_id);
        if (dbId) {
          allScoredJobs.push({ ...scored, jobListingId: dbId });
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "AI scoring batch failed";
      result.errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${msg}`
      );
    }
  }

  if (allScoredJobs.length === 0) {
    return result;
  }

  // Step 4: Persist to job_matches in upsert batches
  for (let i = 0; i < allScoredJobs.length; i += UPSERT_BATCH_SIZE) {
    const batch = allScoredJobs.slice(i, i + UPSERT_BATCH_SIZE);

    const rows = batch.map((scored) => {
      // Resolve matching_path_id: AI returns a role path id or null
      // If AI returns an invalid path id, leave null (per MP schema: role_path_id is nullable)
      let resolvedPathId: string | null = null;
      if (scored.matching_path_id) {
        const matchingPath = rolePaths.find(
          (p) => p.id === scored.matching_path_id
        );
        if (matchingPath) {
          resolvedPathId = matchingPath.id;
        }
      }

      return {
        employee_id: employee.employeeId,
        job_listing_id: scored.jobListingId,
        role_path_id: resolvedPathId,
        fit: scored.fit,
        match_explanation: scored.match_explanation,
        competition_level: scored.competition_level,
        recommended_action: scored.recommended_action,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("job_matches")
      .upsert(rows, {
        onConflict: "employee_id,job_listing_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      result.errors.push(
        `Upsert batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1} failed: ${upsertError.message}`
      );
    } else {
      result.matched += batch.length;
    }
  }

  return result;
}
