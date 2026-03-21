/**
 * Direct Link Resolver — Tier 2: HTML Career Page Parser
 *
 * Fetches a company's careers page HTML via a plain HTTP request, extracts all
 * anchor links, filters for job-related URLs on the employer's own domain or a
 * known ATS domain, then fuzzy-matches those links' visible text against the
 * target job title.
 *
 * This tier is free and fast — no LLM required.  It succeeds for companies
 * whose career pages are server-rendered (static HTML) and whose job-listing
 * URLs follow a predictable structure (e.g. `/careers/engineer-123`).
 *
 * Cost: $0
 * Timeout: 10 seconds
 */

import { BROWSER_HEADERS } from "./constants";
import { fuzzyMatchScore } from "./fuzzy-match";
import type { ResolvedJob } from "./types";

// ─── Known ATS Domains (valid targets even when not the employer domain) ──────

/**
 * Hostnames that are acceptable as link destinations even if they differ from
 * the employer's own domain.  These are structured, public ATS job boards whose
 * URLs are stable enough for the HTML-parse tier.
 */
const TIER2_ATS_DOMAINS: string[] = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workable.com",
  "smartrecruiters.com",
  "bamboohr.com",
];

// ─── Job-Signal Keywords ──────────────────────────────────────────────────────

/**
 * Substrings that indicate a link (by href path or visible text) is a job
 * listing rather than an unrelated internal page.
 */
const JOB_SIGNALS: string[] = [
  "job",
  "position",
  "role",
  "opening",
  "careers/",
  "jobs/",
  "apply",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a potentially relative `href` to an absolute URL using `baseUrl` as
 * the context.  Returns the original `href` unchanged if it cannot be parsed.
 *
 * @param href    - The raw href attribute value from the anchor tag.
 * @param baseUrl - The URL of the page that contained the link.
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Return the hostname of `url` without a leading "www." prefix.
 * Returns an empty string if the URL cannot be parsed.
 */
function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to resolve a direct application URL by fetching and parsing the
 * employer's careers page HTML.
 *
 * @param careersUrl     - The careers / jobs page URL to fetch.
 * @param targetTitle    - The job title we are trying to match.
 * @param employerDomain - The employer's root domain (e.g. `"stripe.com"`).
 *                         Used to accept links on the employer's own hostname.
 * @returns An array of up to 5 `ResolvedJob` candidates sorted by match score
 *          (highest first), or `null` when no qualifying matches are found or
 *          the page cannot be fetched.
 */
export async function resolveViaTier2(
  careersUrl: string,
  targetTitle: string,
  employerDomain: string
): Promise<ResolvedJob[] | null> {
  // ── Fetch the careers page ─────────────────────────────────────────────────
  let html: string;
  try {
    const resp = await fetch(careersUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return null;

    html = await resp.text();
  } catch {
    return null;
  }

  // ── Extract all anchor links with their visible text ──────────────────────
  // Regex captures: group 1 = href value, group 2 = inner HTML (stripped later)
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const rawLinks: Array<{ href: string; text: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    // Strip any nested HTML tags from the anchor's inner content
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (text.length > 0) {
      rawLinks.push({ href: resolveUrl(href, careersUrl), text });
    }
  }

  // ── Normalise the employer domain for comparison ───────────────────────────
  const normalizedEmployerDomain = employerDomain.replace(/^www\./, "");

  // ── Filter: domain must be employer's or a known ATS ──────────────────────
  const domainFiltered = rawLinks.filter((link) => {
    const host = safeHostname(link.href);
    if (!host) return false;

    const onEmployerDomain = host.includes(normalizedEmployerDomain);
    const onATSDomain = TIER2_ATS_DOMAINS.some((ats) => host.includes(ats));

    return onEmployerDomain || onATSDomain;
  });

  // ── Filter: href path or visible text must contain a job signal ───────────
  const jobLinks = domainFiltered.filter((link) => {
    const hrefLower = link.href.toLowerCase();
    const textLower = link.text.toLowerCase();
    return JOB_SIGNALS.some(
      (signal) => hrefLower.includes(signal) || textLower.includes(signal)
    );
  });

  if (jobLinks.length === 0) return null;

  // ── Fuzzy-match visible text against the target title ─────────────────────
  const scored = jobLinks
    .map((link) => ({
      ...link,
      score: fuzzyMatchScore(link.text, targetTitle),
    }))
    .filter((link) => link.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) return null;

  return scored.map((m) => ({
    title: m.text,
    applyUrl: m.href,
    location: null,
    matchScore: m.score,
  }));
}
