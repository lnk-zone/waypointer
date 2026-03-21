/**
 * Direct Link Resolver — Main Entry Point
 *
 * Implements the 4-tier waterfall resolution strategy for finding a direct
 * application URL for a job listing:
 *
 *   Tier 0 — source_url is already a known ATS link  (free, instant)
 *   Tier 1 — ATS public JSON API lookup              (free, instant, ~25% of jobs)
 *   Tier 2 — HTML career page parse                  (free, fast, ~20% of jobs)
 *   Tier 3 — LLM (Claude Haiku) analysis             (~$0.0005–0.001, ~35% of jobs)
 *   Tier 4 — JSearch fallback (not direct)           ($0, ~15% of jobs)
 *
 * Results are cached in PostgreSQL to avoid repeated resolution for the same
 * JSearch job ID.
 */

import { ATS_CONFIGS, ATS_DOMAINS, INTERMEDIARY_DOMAINS } from "./constants";
import { detectATS } from "./ats-detection";
import { resolveViaTier1 } from "./tier1-ats-api";
import { resolveViaTier2 } from "./tier2-html-parse";
import { resolveViaTier3 } from "./tier3-llm";
import { verifyUrl } from "./url-verify";
import { getCachedResolution, cacheResolution } from "./cache";
import type { JobListingForResolver, ResolutionResult } from "./types";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolve a direct application URL for a job listing.
 *
 * Implements the 4-tier waterfall: ATS API → HTML Parse → LLM → Fallback.
 * Results are cached to avoid repeated resolution for the same JSearch job ID.
 *
 * @param job - The job listing fields required for resolution.
 * @returns A `ResolutionResult` describing the resolved URL, which tier
 *          succeeded, confidence level, and whether the URL was verified.
 */
export async function resolveDirectLink(
  job: JobListingForResolver
): Promise<ResolutionResult> {
  // ── CHECK CACHE FIRST ──────────────────────────────────────────────────────
  const cached = await getCachedResolution(job.external_id);
  if (cached) return cached;

  // ── TIER 0: source_url already points to a known ATS domain ───────────────
  // JSearch occasionally provides a direct ATS link in source_url — free win.
  if (job.source_url) {
    try {
      const sourceHost = new URL(job.source_url).hostname;
      const isATS = ATS_DOMAINS.some((ats) => sourceHost.includes(ats));
      if (isATS) {
        const isVerified = await verifyUrl(job.source_url);
        const result: ResolutionResult = {
          directUrl: job.source_url,
          tier: 1,
          method: "jsearch_ats_link",
          isVerified,
          isDirect: true,
          matchedTitle: job.title,
          confidence: "high",
          costUsd: 0,
        };
        await cacheResolution(
          job.id,
          job.external_id,
          job.company_name,
          extractDomain(job.employer_website),
          job.title,
          result
        );
        return result;
      }
    } catch {
      // Malformed source_url — continue to next tier
    }
  }

  // ── Infer employer_website if missing ──────────────────────────────────────
  let employerWebsite = job.employer_website;

  if (!employerWebsite) {
    // Try to infer from company name (e.g., "Salesforce" → "https://www.salesforce.com")
    const companySlug = job.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
    if (companySlug.length >= 3) {
      const guessUrl = `https://www.${companySlug}.com`;
      try {
        const resp = await fetch(guessUrl, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (resp.ok) {
          employerWebsite = guessUrl;
        }
      } catch {
        // Guess failed, continue without employer website
      }
    }
  }

  if (!employerWebsite) {
    return fallback(job);
  }

  // ── TIER 1: ATS API Lookup ─────────────────────────────────────────────────
  const ats = await detectATS(employerWebsite);

  if (ats.ats_platform && ats.ats_slug && ATS_CONFIGS[ats.ats_platform]) {
    const match = await resolveViaTier1(ats.ats_platform, ats.ats_slug, job.title);
    if (match) {
      const isVerified = await verifyUrl(match.applyUrl);
      const result: ResolutionResult = {
        directUrl: match.applyUrl,
        tier: 1,
        method: `${ats.ats_platform}_api`,
        isVerified,
        isDirect: true,
        matchedTitle: match.title,
        confidence: "high",
        costUsd: 0,
      };
      await cacheResolution(
        job.id,
        job.external_id,
        job.company_name,
        extractDomain(employerWebsite),
        job.title,
        result
      );
      return result;
    }
  }

  // ── TIER 2: HTML Career Page Parse ─────────────────────────────────────────
  if (ats.careers_url) {
    const htmlMatches = await resolveViaTier2(
      ats.careers_url,
      job.title,
      extractDomain(job.employer_website)
    );

    if (htmlMatches && htmlMatches.length > 0) {
      const best = htmlMatches[0];
      const isVerified = await verifyUrl(best.applyUrl);
      const result: ResolutionResult = {
        directUrl: best.applyUrl,
        tier: 2,
        method: "html_regex",
        isVerified,
        isDirect: true,
        matchedTitle: best.title,
        confidence: (best.matchScore ?? 0) > 0.7 ? "high" : "medium",
        costUsd: 0,
      };
      await cacheResolution(
        job.id,
        job.external_id,
        job.company_name,
        extractDomain(employerWebsite),
        job.title,
        result
      );
      return result;
    }
  }

  // ── TIER 3: LLM Resolver ───────────────────────────────────────────────────
  const careersUrl = ats.careers_url ?? employerWebsite;
  const llmMatch = await resolveViaTier3(careersUrl, job.title, job.company_name);

  if (llmMatch) {
    const inputCost = ((llmMatch.llmTokens?.input ?? 0) * 1.0) / 1_000_000;
    const outputCost = ((llmMatch.llmTokens?.output ?? 0) * 5.0) / 1_000_000;
    const cost = inputCost + outputCost;

    const isVerified = await verifyUrl(llmMatch.applyUrl);
    const result: ResolutionResult = {
      directUrl: llmMatch.applyUrl,
      tier: 3,
      method: "llm_haiku",
      isVerified,
      isDirect: true,
      matchedTitle: llmMatch.title,
      confidence: "medium",
      costUsd: cost,
    };
    await cacheResolution(
      job.id,
      job.external_id,
      job.company_name,
      extractDomain(employerWebsite),
      job.title,
      result
    );
    return result;
  }

  // ── TIER 4: Fallback ───────────────────────────────────────────────────────
  return fallback(job);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Return a Tier-4 fallback result using source_url.
 *
 * If source_url belongs to a known intermediary domain we still use it — it
 * is the best available link — but `isDirect` is set to false so the UI can
 * surface the appropriate warning to the user.
 */
function fallback(job: JobListingForResolver): ResolutionResult {
  const bestUrl = job.source_url ?? "";

  if (bestUrl) {
    try {
      const host = new URL(bestUrl).hostname;
      // INTERMEDIARY_DOMAINS check is informational only; we still use the URL
      // because it is the only option at this tier.
      void INTERMEDIARY_DOMAINS.has(host);
    } catch {
      // Malformed source_url — bestUrl stays as-is (empty string or raw value)
    }
  }

  return {
    directUrl: bestUrl,
    tier: 4,
    method: "jsearch_fallback",
    isVerified: false,
    isDirect: false,
    matchedTitle: job.title,
    confidence: "low",
    costUsd: 0,
  };
}

/**
 * Extract the hostname from a URL, stripping a leading "www." prefix.
 * Returns an empty string when the URL is null or cannot be parsed.
 */
function extractDomain(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
