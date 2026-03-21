/**
 * Job Ingestion Pipeline — E7-01
 *
 * Fetches listings from a JobDataProvider, normalizes them to the
 * job_listings table schema, upserts into the database (deduplicating
 * by external_id), and marks stale listings as is_active = false.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobDataProvider, JobListing, JobSearchParams } from "./provider";

// ─── Types ───────────────────────────────────────────────────────────

export interface IngestResult {
  fetched: number;
  upserted: number;
  staleMarked: number;
  errors: string[];
}

// ─── Upsert Function ─────────────────────────────────────────────────

/**
 * Fetch listings from a provider and upsert into job_listings.
 * Returns the set of external_ids that were successfully upserted.
 * Does NOT mark stale listings — call markStaleListings separately
 * after all searches complete.
 */
export async function ingestJobListings(
  supabase: SupabaseClient,
  provider: JobDataProvider,
  searchParams: JobSearchParams
): Promise<IngestResult> {
  const result: IngestResult = {
    fetched: 0,
    upserted: 0,
    staleMarked: 0,
    errors: [],
  };

  // Step 1: Fetch from provider
  let listings: JobListing[];
  try {
    listings = await provider.searchJobs(searchParams);
  } catch (err) {
    result.errors.push(
      err instanceof Error ? err.message : "Failed to fetch job listings"
    );
    return result;
  }

  result.fetched = listings.length;

  if (listings.length === 0) {
    return result;
  }

  // Step 2: Upsert into job_listings in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    const rows = batch.map((listing) => ({
      external_id: listing.external_id,
      title: listing.title,
      company_name: listing.company_name,
      company_logo_url: listing.company_logo_url,
      location: listing.location,
      is_remote: listing.is_remote,
      is_hybrid: listing.is_hybrid,
      description_summary: listing.description_summary,
      description_full: listing.description_full,
      salary_min: listing.salary_min,
      salary_max: listing.salary_max,
      requirements: listing.requirements,
      posted_at: listing.posted_at,
      source_url: listing.source_url,
      employer_website: listing.employer_website,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("job_listings")
      .upsert(rows, {
        onConflict: "external_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      result.errors.push(
        `Upsert batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${upsertError.message}`
      );
    } else {
      result.upserted += batch.length;
    }
  }

  return result;
}

// ─── Stale Marking ──────────────────────────────────────────────────

/**
 * Mark active listings NOT in the provided set as is_active = false.
 * Should be called ONCE after all search ingestion runs complete,
 * passing the full set of all fetched external_ids across all searches.
 *
 * Uses batched ID lookups to avoid string interpolation injection risks.
 */
export async function markStaleListings(
  supabase: SupabaseClient,
  freshExternalIds: string[]
): Promise<{ staleMarked: number; error: string | null }> {
  if (freshExternalIds.length === 0) {
    return { staleMarked: 0, error: null };
  }

  // Fetch all currently active external_ids
  const { data: activeListings, error: fetchError } = await supabase
    .from("job_listings")
    .select("id, external_id")
    .eq("is_active", true);

  if (fetchError) {
    return { staleMarked: 0, error: `Failed to fetch active listings: ${fetchError.message}` };
  }

  if (!activeListings || activeListings.length === 0) {
    return { staleMarked: 0, error: null };
  }

  // Find IDs that are active but NOT in the fresh set
  const freshSet = new Set(freshExternalIds);
  const staleIds = activeListings
    .filter((l) => !freshSet.has(l.external_id))
    .map((l) => l.id as string);

  if (staleIds.length === 0) {
    return { staleMarked: 0, error: null };
  }

  // Mark stale in batches of 100 (using UUID primary keys, safe from injection)
  const BATCH_SIZE = 100;
  let totalMarked = 0;

  for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
    const batch = staleIds.slice(i, i + BATCH_SIZE);

    const { error: updateError } = await supabase
      .from("job_listings")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", batch);

    if (updateError) {
      return {
        staleMarked: totalMarked,
        error: `Stale marking batch failed: ${updateError.message}`,
      };
    }

    totalMarked += batch.length;
  }

  return { staleMarked: totalMarked, error: null };
}

// ─── Multi-Search Ingestion ─────────────────────────────────────────

/**
 * Run ingestion for multiple keyword sets (e.g., for different role paths).
 * Collects all fetched external_ids, then marks stale listings ONCE at the end.
 */
export async function ingestMultipleSearches(
  supabase: SupabaseClient,
  provider: JobDataProvider,
  searches: JobSearchParams[]
): Promise<IngestResult> {
  const merged: IngestResult = {
    fetched: 0,
    upserted: 0,
    staleMarked: 0,
    errors: [],
  };

  for (const search of searches) {
    const result = await ingestJobListings(supabase, provider, search);
    merged.fetched += result.fetched;
    merged.upserted += result.upserted;
    merged.errors.push(...result.errors);
  }

  // NOTE: We intentionally do NOT mark old listings as stale.
  // Old listings may have existing job_matches tied to them. Marking them
  // inactive would hide those matches from the employee's dashboard.
  // Instead, listings accumulate and the matching engine skips already-matched ones.

  return merged;
}
