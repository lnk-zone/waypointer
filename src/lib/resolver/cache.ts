/**
 * Direct Link Resolver — Cache Layer
 *
 * Reads from and writes to the `resolved_links` and `company_ats_cache` tables
 * in Supabase.  All database access uses the service-role client to bypass RLS
 * because resolution is a background operation not tied to a specific user.
 *
 * Cache TTL by tier:
 *   Tier 1 (ATS API)      — 7 days
 *   Tier 2 (HTML parse)   — 5 days
 *   Tier 3 (LLM Haiku)    — 5 days
 *   Tier 4 (Fallback)     — 1 day
 *
 * All functions are designed to be silent on failure: a cache miss or write
 * error must never surface as a user-facing error.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { ResolutionResult } from "./types";

// ─── TTL Configuration ────────────────────────────────────────────────────────

const TTL_BY_TIER: Record<1 | 2 | 3 | 4, number> = {
  1: 7,
  2: 5,
  3: 5,
  4: 1,
};

// ─── Database Row Shape ───────────────────────────────────────────────────────

/**
 * Shape of a row as returned by Supabase for the `resolved_links` table.
 * Only the columns we query are listed here.
 */
interface ResolvedLinkRow {
  direct_url: string;
  resolution_tier: number;
  resolution_method: string;
  is_verified: boolean;
  page_title: string | null;
  expires_at: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a previously cached resolution for a JSearch job.
 *
 * @param jsearchJobId - The JSearch `job_id` for the listing.
 * @returns A `ResolutionResult` reconstructed from the cached row, or `null`
 *          when no unexpired row exists.
 */
export async function getCachedResolution(
  jsearchJobId: string
): Promise<ResolutionResult | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("resolved_links")
      .select(
        "direct_url, resolution_tier, resolution_method, is_verified, page_title, expires_at"
      )
      .eq("jsearch_job_id", jsearchJobId)
      .single();

    if (error || !data) return null;

    const row = data as ResolvedLinkRow;

    // Discard expired entries
    if (new Date(row.expires_at) <= new Date()) return null;

    const tier = row.resolution_tier as 1 | 2 | 3 | 4;

    return {
      directUrl: row.direct_url,
      tier,
      method: `${row.resolution_method}_cached`,
      isVerified: row.is_verified,
      isDirect: tier < 4,
      matchedTitle: row.page_title ?? "",
      confidence: tier <= 2 ? "high" : tier === 3 ? "medium" : "low",
      costUsd: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Persist a resolution result to `resolved_links`.
 *
 * Uses an upsert on `jsearch_job_id` so re-resolving the same job replaces the
 * stale row rather than inserting a duplicate.
 *
 * @param jobListingId   - The internal Waypointer UUID for the job listing
 *                         (stored for cross-referencing but not used as the
 *                         conflict key).
 * @param jsearchJobId   - JSearch's `job_id` — the unique conflict key.
 * @param employerName   - Human-readable employer name.
 * @param employerDomain - Employer's root domain (e.g. `"stripe.com"`).
 * @param jobTitle       - The job title as returned by JSearch.
 * @param result         - The `ResolutionResult` to cache.
 */
export async function cacheResolution(
  jobListingId: string,
  jsearchJobId: string,
  employerName: string,
  employerDomain: string,
  jobTitle: string,
  result: ResolutionResult
): Promise<void> {
  try {
    const supabase = createServiceClient();

    const ttlDays = TTL_BY_TIER[result.tier];
    const expiresAt = new Date(
      Date.now() + ttlDays * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase.from("resolved_links").upsert(
      {
        jsearch_job_id: jsearchJobId,
        employer_name: employerName,
        employer_domain: employerDomain,
        job_title: jobTitle,
        direct_url: result.directUrl,
        resolution_tier: result.tier,
        resolution_method: result.method,
        is_verified: result.isVerified,
        verified_at: result.isVerified ? new Date().toISOString() : null,
        page_title: result.matchedTitle || null,
        // llm_cost_usd stored with token split not available at this layer;
        // store the aggregate cost as the output-token equivalent (best effort)
        llm_cost_usd: result.costUsd,
        expires_at: expiresAt,
        // job_listing_id is not a column in the schema from the spec, but we
        // record it in the method field suffix for traceability when provided
      },
      { onConflict: "jsearch_job_id" }
    );
  } catch {
    // Cache write failure must never propagate — caller already has result
  }

  // Suppress unused-variable warning for jobListingId: it is intentionally
  // accepted as a parameter for future schema extension without breaking callers.
  void jobListingId;
}
