/**
 * Direct Link Resolver — ATS Detection
 *
 * Detects which ATS platform a company uses by probing common career page
 * URL paths on their website. Results are cached in `company_ats_cache` for
 * 30 days to avoid redundant HTTP probing on repeat lookups.
 *
 * Resolution hierarchy:
 *   1. Cache hit (< 30 days old)  → return immediately
 *   2. Redirect to known Tier-1 ATS domain  → detect slug via regex
 *   3. HTML contains a known ATS indicator  → platform known, slug unknown
 *   4. Any working careers page found  → platform = "custom"
 *   5. No careers page found  → all fields null
 */

import { createServiceClient } from "@/lib/supabase/server";
import { ATS_CONFIGS, BROWSER_HEADERS, CAREER_PATHS } from "./constants";
import type { ATSDetection } from "./types";

// ─── ATS Indicator Strings (Tier 2 / 3 platforms — no free public API) ────────

/**
 * Substring indicators that identify a specific ATS platform when found in
 * page HTML or the final redirect URL.  These platforms are handled by Tier 2
 * (HTML parse) or Tier 3 (Playwright + LLM); we cannot query them via a free
 * JSON API so we record the platform name but leave `ats_slug` as null.
 */
const ATS_INDICATORS: Record<string, string[]> = {
  workday: ["myworkdayjobs.com", "wd5.myworkdayjobs"],
  icims: [".icims.com", "careers-"],
  eightfold: ["eightfold.ai"],
  smartrecruiters: ["jobs.smartrecruiters.com"],
  taleo: ["taleo.net"],
  bamboohr: ["bamboohr.com/careers"],
};

// ─── 30-Day Cache TTL ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect which ATS platform the employer at `employerWebsite` uses.
 *
 * @param employerWebsite - The employer's root website URL (e.g. "https://stripe.com").
 * @returns An `ATSDetection` describing the ATS platform, board slug, and
 *          careers page URL found.  All three fields are `null` when detection
 *          completely fails (no careers page reachable, or invalid URL).
 */
export async function detectATS(
  employerWebsite: string
): Promise<ATSDetection> {
  // ── Parse & normalise the domain ──────────────────────────────────────────
  let domain: string;
  try {
    domain = new URL(employerWebsite).hostname.replace(/^www\./, "");
  } catch {
    // Malformed URL — cannot proceed
    return { ats_platform: null, ats_slug: null, careers_url: null };
  }

  const supabase = createServiceClient();

  // ── 1. Cache lookup ───────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from("company_ats_cache")
    .select(
      "ats_platform, ats_slug, careers_url, detection_method, last_verified"
    )
    .eq("employer_domain", domain)
    .single();

  if (cached) {
    const lastVerified = new Date(cached.last_verified as string);
    const staleAfter = new Date(Date.now() - CACHE_TTL_MS);

    if (lastVerified > staleAfter) {
      return {
        ats_platform: cached.ats_platform as string | null,
        ats_slug: cached.ats_slug as string | null,
        careers_url: cached.careers_url as string | null,
        detection_method: cached.detection_method as string | undefined,
      };
    }
  }

  // ── 2. Probe common career page paths ─────────────────────────────────────
  const baseUrl = employerWebsite.replace(/\/$/, "");

  for (const path of CAREER_PATHS) {
    const url = `${baseUrl}${path}`;

    try {
      const resp = await fetch(url, {
        redirect: "follow",
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) continue;

      const html = await resp.text();
      const finalUrl = resp.url;

      // ── 2a. Check final URL / HTML for known Tier-1 ATS platforms ─────────
      for (const [atsName, config] of Object.entries(ATS_CONFIGS)) {
        for (const pattern of config.detectPatterns) {
          const match = finalUrl.match(pattern) ?? html.match(pattern);
          if (match) {
            const result: ATSDetection = {
              ats_platform: atsName,
              ats_slug: match[1] ?? null,
              careers_url: url,
              detection_method: "redirect",
            };
            await upsertCache(supabase, domain, result);
            return result;
          }
        }
      }

      // ── 2b. Check for Tier-2/3 ATS indicators (no slug available) ─────────
      const htmlLower = html.toLowerCase();
      const finalUrlLower = finalUrl.toLowerCase();

      for (const [ats, indicators] of Object.entries(ATS_INDICATORS)) {
        const found = indicators.some(
          (indicator) =>
            htmlLower.includes(indicator) ||
            finalUrlLower.includes(indicator)
        );
        if (found) {
          const result: ATSDetection = {
            ats_platform: ats,
            ats_slug: null,
            careers_url: finalUrl,
            detection_method: "html_indicator",
          };
          await upsertCache(supabase, domain, result);
          return result;
        }
      }

      // ── 2c. Found a working careers page — ATS unknown ────────────────────
      const result: ATSDetection = {
        ats_platform: "custom",
        ats_slug: null,
        careers_url: finalUrl,
        detection_method: "html_parse",
      };
      await upsertCache(supabase, domain, result);
      return result;
    } catch {
      // Network error, timeout, or redirect loop — try the next path
      continue;
    }
  }

  // ── 3. No careers page found ──────────────────────────────────────────────
  return { ats_platform: null, ats_slug: null, careers_url: null };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Write (or overwrite) an ATS detection result to `company_ats_cache`.
 * Uses `employer_domain` as the conflict key so each domain has exactly one row.
 *
 * Silently swallows errors — a cache write failure must never surface as a
 * user-facing error; the caller already has a valid `ATSDetection` to return.
 */
async function upsertCache(
  supabase: SupabaseServiceClient,
  domain: string,
  detection: ATSDetection
): Promise<void> {
  // Derive a best-effort human-readable name from the domain's apex label
  const employerName = domain.split(".")[0];

  await supabase.from("company_ats_cache").upsert(
    {
      employer_domain: domain,
      employer_name: employerName,
      ats_platform: detection.ats_platform,
      ats_slug: detection.ats_slug,
      careers_url: detection.careers_url,
      detection_method: detection.detection_method ?? "unknown",
      last_verified: new Date().toISOString(),
    },
    { onConflict: "employer_domain" }
  );
}
