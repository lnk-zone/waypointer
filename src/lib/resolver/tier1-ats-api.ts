/**
 * Direct Link Resolver — Tier 1: ATS API Resolver
 *
 * Queries a known ATS platform's public JSON API for job listings and returns
 * the best fuzzy-matched job for the given target title.
 *
 * Only platforms registered in `ATS_CONFIGS` with a known slug are eligible
 * for Tier 1 resolution.  The caller is expected to have already run
 * `detectATS()` and confirmed both `ats_platform` and `ats_slug` are non-null.
 *
 * Cost: $0 — all ATS APIs used here are free and public.
 */

import { ATS_CONFIGS, BROWSER_HEADERS } from "./constants";
import { fuzzyMatchScore } from "./fuzzy-match";
import type { ResolvedJob } from "./types";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to resolve a direct application URL via a Tier-1 ATS public API.
 *
 * @param atsPlatform - The ATS platform key (e.g. `"greenhouse"`, `"lever"`).
 *                      Must exist as a key in `ATS_CONFIGS`.
 * @param atsSlug     - The company's board identifier on that ATS
 *                      (e.g. `"stripe"` for `boards.greenhouse.io/stripe`).
 * @param targetTitle - The job title to match against listings returned by
 *                      the ATS API.
 * @returns The best-matching `ResolvedJob` (highest fuzzy-match score), or
 *          `null` if the platform is unsupported, the API is unreachable, or
 *          no listing matches the target title above the acceptance threshold.
 */
export async function resolveViaTier1(
  atsPlatform: string,
  atsSlug: string,
  targetTitle: string
): Promise<ResolvedJob | null> {
  const config = ATS_CONFIGS[atsPlatform];
  if (!config) return null;

  const apiUrl = config.apiUrlTemplate.replace("{slug}", atsSlug);

  let data: unknown;
  try {
    const resp = await fetch(apiUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return null;

    data = await resp.json();
  } catch {
    // Network error, timeout, or JSON parse failure
    return null;
  }

  const matches = config.parseJobs(data, targetTitle);
  if (matches.length === 0) return null;

  // Score every candidate and return the highest-confidence match
  const scored: ResolvedJob[] = matches.map((m) => ({
    ...m,
    matchScore: fuzzyMatchScore(m.title, targetTitle),
  }));

  scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return scored[0];
}
