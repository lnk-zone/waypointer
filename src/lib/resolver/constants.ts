/**
 * Direct Link Resolver — Constants & ATS Configurations
 *
 * Defines the ATS platform registry (Greenhouse, Lever, Ashby, Workable),
 * the set of known intermediary job-board domains, the list of ATS hostnames
 * used for Tier-0 direct-link detection, and shared HTTP browser headers.
 */

import type { ATSConfig, ResolvedJob } from "./types";
import { fuzzyMatch } from "./fuzzy-match";

// ─── ATS Platform Registry ────────────────────────────────────────────────────

export const ATS_CONFIGS: Record<string, ATSConfig> = {
  greenhouse: {
    name: "Greenhouse",
    apiUrlTemplate: "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs",
    detectPatterns: [
      /boards\.greenhouse\.io\/([\w][\w-]*)/,
      /job-boards\.greenhouse\.io\/([\w][\w-]*)/,
    ],
    parseJobs: (data: unknown, targetTitle: string): ResolvedJob[] => {
      const d = data as {
        jobs?: Array<{
          id: number;
          title: string;
          absolute_url: string;
          location?: { name: string };
        }>;
      };
      return (d.jobs ?? [])
        .filter((j) => fuzzyMatch(j.title, targetTitle))
        .map((j) => ({
          title: j.title,
          applyUrl: j.absolute_url,
          location: j.location?.name ?? null,
          atsJobId: String(j.id),
        }));
    },
  },

  lever: {
    name: "Lever",
    apiUrlTemplate: "https://api.lever.co/v0/postings/{slug}",
    detectPatterns: [/jobs\.lever\.co\/([\w-]+)/],
    parseJobs: (data: unknown, targetTitle: string): ResolvedJob[] => {
      const jobs = Array.isArray(data) ? data : [];
      return (
        jobs
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((j: any) => fuzzyMatch(j.text, targetTitle))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((j: any) => ({
            title: j.text as string,
            applyUrl: (j.hostedUrl || j.applyUrl) as string,
            location: (j.categories?.location as string) ?? null,
            atsJobId: j.id as string,
          }))
      );
    },
  },

  ashby: {
    name: "Ashby",
    apiUrlTemplate: "https://api.ashbyhq.com/posting-api/job-board/{slug}",
    detectPatterns: [/jobs\.ashbyhq\.com\/([\w-]+)/],
    parseJobs: (data: unknown, targetTitle: string): ResolvedJob[] => {
      const d = data as {
        jobs?: Array<{ id: string; title: string; location: string }>;
        slug?: string;
      };
      return (d.jobs ?? [])
        .filter((j) => fuzzyMatch(j.title, targetTitle))
        .map((j) => ({
          title: j.title,
          applyUrl: `https://jobs.ashbyhq.com/${d.slug ?? ""}/${j.id}`,
          location: j.location ?? null,
          atsJobId: j.id,
        }));
    },
  },

  workable: {
    name: "Workable",
    apiUrlTemplate:
      "https://apply.workable.com/api/v1/widget/accounts/{slug}",
    detectPatterns: [/apply\.workable\.com\/([\w-]+)/],
    parseJobs: (data: unknown, targetTitle: string): ResolvedJob[] => {
      const d = data as {
        jobs?: Array<{
          title: string;
          url?: string;
          shortcode: string;
          location?: { city: string };
        }>;
      };
      return (d.jobs ?? [])
        .filter((j) => fuzzyMatch(j.title, targetTitle))
        .map((j) => ({
          title: j.title,
          applyUrl: j.url || `https://apply.workable.com/${j.shortcode}`,
          location: j.location?.city ?? null,
          atsJobId: j.shortcode,
        }));
    },
  },
};

// ─── Intermediary Job-Board Domains ──────────────────────────────────────────

/**
 * Hostnames of job-board aggregators and intermediary platforms.
 * A resolved URL whose hostname is in this set is NOT a direct link.
 */
export const INTERMEDIARY_DOMAINS = new Set<string>([
  "linkedin.com",
  "www.linkedin.com",
  "indeed.com",
  "www.indeed.com",
  "glassdoor.com",
  "www.glassdoor.com",
  "monster.com",
  "www.monster.com",
  "ziprecruiter.com",
  "www.ziprecruiter.com",
  "talent.com",
  "www.talent.com",
  "adzuna.com",
  "www.adzuna.com",
  "careerbuilder.com",
  "www.careerbuilder.com",
  "simplyhired.com",
  "www.simplyhired.com",
  "dice.com",
  "www.dice.com",
  "jobleads.com",
  "www.jobleads.com",
  "jobilize.com",
  "www.jobilize.com",
  "learn4good.com",
  "www.learn4good.com",
  "snagajob.com",
  "www.snagajob.com",
  "lensa.com",
  "www.lensa.com",
]);

// ─── Known ATS Hostnames ──────────────────────────────────────────────────────

/**
 * Hostnames that indicate a URL already points to an ATS job board.
 * Used in Tier-0 to short-circuit resolution when JSearch already
 * provides a native ATS link.
 */
export const ATS_DOMAINS: string[] = [
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "apply.workable.com",
  "jobs.smartrecruiters.com",
];

// ─── Browser-Like HTTP Headers ───────────────────────────────────────────────

/**
 * Minimal browser-like headers to avoid bot-detection rejections
 * on employer career pages.
 */
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ─── Common Career Page Paths ─────────────────────────────────────────────────

/**
 * Ordered list of common career-page URL paths tried when probing
 * an employer's website for an ATS or job listing page.
 */
export const CAREER_PATHS: string[] = [
  "/careers",
  "/jobs",
  "/careers/jobs",
  "/join",
  "/join-us",
  "/work-with-us",
  "/about/careers",
  "/company/careers",
  "/careers/positions",
  "/open-positions",
  "/teams",
];
