# Direct Link Resolver Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JSearch's unreliable apply links with verified direct application URLs that drop users straight onto employer application forms — no intermediary registration.

**Architecture:** 4-tier waterfall resolver: (1) ATS API lookup for Greenhouse/Lever/Ashby/Workable, (2) HTML career page parsing, (3) Claude Haiku LLM fallback for complex pages, (4) JSearch fallback. Results cached in PostgreSQL with 1-7 day TTL. Resolution runs on-demand when user views a job detail page.

**Tech Stack:** TypeScript, Supabase (PostgreSQL), Anthropic SDK (Claude Haiku for Tier 3), `node-html-parser` (for Tier 2 — no Playwright since Vercel serverless doesn't support it), Zod validation.

**Key Adaptation from Spec:** No Playwright on Vercel — Tier 3 fetches the page HTML with browser-like headers and sends it to Claude Haiku for link extraction instead. This handles ~80% of JS-rendered pages because most career pages include job links in the initial HTML even if the page is SPA-rendered.

---

## Task 1: Database Schema — Resolver Tables

**Files:**
- Create: `supabase/migrations/20260321000001_direct_link_resolver.sql`

**Acceptance Criteria:**
- [ ] `company_ats_cache` table exists with columns: `id`, `employer_name`, `employer_domain` (unique), `ats_platform`, `ats_slug`, `careers_url`, `detection_method`, `last_verified`, `created_at`
- [ ] `resolved_links` table exists with columns: `id`, `job_listing_id` (FK to job_listings), `jsearch_job_id` (unique), `employer_name`, `employer_domain`, `job_title`, `direct_url`, `resolution_tier`, `resolution_method`, `is_verified`, `verified_at`, `is_direct`, `ats_platform`, `ats_job_id`, `page_title`, `llm_input_tokens`, `llm_output_tokens`, `llm_cost_usd`, `created_at`, `expires_at`
- [ ] `employer_website` column added to `job_listings` table
- [ ] All indexes created per spec
- [ ] RLS enabled on both tables (service role only)
- [ ] Migration pushed to Supabase successfully

**Implementation Notes:**
- Use `job_listing_id UUID REFERENCES job_listings(id)` for FK relationship
- Keep `jsearch_job_id TEXT UNIQUE` for cache lookups by external ID
- Add `is_direct BOOLEAN DEFAULT FALSE` to `resolved_links` (not in spec schema but needed per spec's ResolutionResult)
- Skip `resolution_metrics` table for now — can add later
- Add `employer_website TEXT` column to existing `job_listings` table

---

## Task 2: Capture `employer_website` from JSearch

**Files:**
- Modify: `src/lib/jobs/jsearch.ts` — add `employer_website` to schema and normalize function
- Modify: `src/lib/jobs/provider.ts` — add `employer_website` to `JobListing` interface
- Modify: `src/lib/jobs/ingest.ts` — include `employer_website` in upsert rows

**Acceptance Criteria:**
- [ ] `JobListing` interface includes `employer_website: string | null`
- [ ] JSearch schema validates `employer_website` field from API response
- [ ] `normalizeJob()` maps `job.employer_website` to `listing.employer_website`
- [ ] Ingest upsert includes `employer_website` in the row data
- [ ] Build passes with no type errors

**Implementation Notes:**
- JSearch returns `employer_website` as a nullable string (e.g., `"https://www.united.com"`)
- Add to `jSearchJobSchema`: `employer_website: z.string().nullable().optional()`
- Add to `normalizeJob` return: `employer_website: job.employer_website ?? null`
- Add to `ingestJobListings` row mapping: `employer_website: listing.employer_website`

---

## Task 3: Types & Constants for the Resolver

**Files:**
- Create: `src/lib/resolver/types.ts`
- Create: `src/lib/resolver/constants.ts`

**Acceptance Criteria:**
- [ ] `ATSConfig` interface defined with `name`, `apiUrlTemplate`, `detectPatterns`, `parseJobs`
- [ ] `ResolvedJob` interface defined with `title`, `applyUrl`, `location`, `atsJobId`, `matchScore`
- [ ] `ResolutionResult` interface defined with `directUrl`, `tier`, `method`, `isVerified`, `isDirect`, `matchedTitle`, `confidence`, `costUsd`
- [ ] `ATS_CONFIGS` constant object with configs for `greenhouse`, `lever`, `ashby`, `workable`
- [ ] `INTERMEDIARY_DOMAINS` set containing LinkedIn, Indeed, Monster, ZipRecruiter, Glassdoor, Talent.com, Adzuna, etc.
- [ ] `BROWSER_HEADERS` constant with realistic User-Agent and Accept headers
- [ ] Build passes

---

## Task 4: Fuzzy Title Matching

**Files:**
- Create: `src/lib/resolver/fuzzy-match.ts`

**Acceptance Criteria:**
- [ ] `fuzzyMatchScore(candidate, target)` returns 0-1 float
- [ ] Exact match returns 1.0
- [ ] Substring containment returns 0.9
- [ ] Word overlap (Jaccard similarity) with key-word bonus works correctly
- [ ] Normalization strips special characters, lowercases, collapses whitespace
- [ ] `fuzzyMatch(candidate, target)` convenience function returns boolean (score > 0.4)
- [ ] Build passes

---

## Task 5: URL Verification

**Files:**
- Create: `src/lib/resolver/url-verify.ts`

**Acceptance Criteria:**
- [ ] `verifyUrl(url)` sends HEAD request with browser headers, 8s timeout
- [ ] Falls back to GET if HEAD returns 405 or 403
- [ ] Returns `true` for 2xx responses, `false` otherwise
- [ ] Handles network errors gracefully (returns `false`, no throw)
- [ ] Build passes

---

## Task 6: ATS Detection

**Files:**
- Create: `src/lib/resolver/ats-detection.ts`

**Acceptance Criteria:**
- [ ] `detectATS(employerWebsite)` checks company_ats_cache first (30-day TTL)
- [ ] Probes common career page paths: `/careers`, `/jobs`, `/join`, `/careers/jobs`, etc.
- [ ] Detects Greenhouse, Lever, Ashby, Workable via URL redirect patterns and HTML content
- [ ] Detects Workday, iCIMS, Taleo, SmartRecruiters, Eightfold via HTML indicators (no slug)
- [ ] Upserts detection result to `company_ats_cache` table
- [ ] Returns `null` ATS if no careers page found (does not throw)
- [ ] Uses `createServiceClient()` for database access
- [ ] Build passes

**Implementation Notes:**
- Use `fetch()` with `redirect: "follow"` to detect ATS redirects
- 10s timeout per career page probe via `AbortSignal.timeout(10000)`
- Stop probing after first successful career page found

---

## Task 7: Tier 1 — ATS API Resolver

**Files:**
- Create: `src/lib/resolver/tier1-ats-api.ts`

**Acceptance Criteria:**
- [ ] `resolveViaTier1(atsConfig, atsSlug, jobTitle)` queries the ATS's public JSON API
- [ ] Parses response using `atsConfig.parseJobs()` from `ATS_CONFIGS`
- [ ] Returns best fuzzy-matched `ResolvedJob` or `null`
- [ ] Greenhouse API (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`) works
- [ ] Lever API (`api.lever.co/v0/postings/{slug}`) works
- [ ] Ashby API (`api.ashbyhq.com/posting-api/job-board/{slug}`) works
- [ ] Workable API (`apply.workable.com/api/v1/widget/accounts/{slug}`) works
- [ ] 10s timeout, graceful error handling
- [ ] Build passes

---

## Task 8: Tier 2 — HTML Career Page Parser

**Files:**
- Create: `src/lib/resolver/tier2-html-parse.ts`

**Acceptance Criteria:**
- [ ] `resolveViaTier2(careersUrl, targetTitle, employerDomain)` fetches career page HTML
- [ ] Extracts all `<a href>` links with their text content using regex
- [ ] Filters links to only employer domain or known ATS domains
- [ ] Filters for job-related URL patterns (`/jobs/`, `/careers/`, `/apply`, etc.)
- [ ] Fuzzy-matches link text against target job title
- [ ] Returns top matches sorted by score, or `null` if none above 0.4
- [ ] Resolves relative URLs to absolute
- [ ] Build passes

---

## Task 9: Tier 3 — LLM Resolver (No Playwright)

**Files:**
- Create: `src/lib/resolver/tier3-llm.ts`

**Acceptance Criteria:**
- [ ] `resolveViaTier3(careersUrl, targetTitle, employerName)` fetches page HTML with browser headers
- [ ] Extracts links and truncated page text from HTML
- [ ] Sends to Claude Haiku (`claude-haiku-4-5-20251001`) with structured prompt
- [ ] Prompt instructs: never return LinkedIn/Indeed/Glassdoor/job board links
- [ ] Parses JSON response with `matches` array
- [ ] Returns best match with LLM token counts for cost tracking
- [ ] Returns `null` on any failure (no throw)
- [ ] Uses `getAnthropicClient()` from existing `src/lib/ai/pipeline.ts` or creates its own
- [ ] Build passes

**Implementation Notes:**
- No Playwright — Vercel serverless can't run it. Just `fetch()` the HTML.
- This handles ~70% of JS-rendered pages because most include job links in initial HTML.
- For true SPAs that return empty `<div id="root"></div>`, this will fail gracefully → Tier 4 fallback.
- Use the Anthropic SDK directly (not `executeAIPipeline`) since this isn't a prompt registry prompt.

---

## Task 10: Cache Layer

**Files:**
- Create: `src/lib/resolver/cache.ts`

**Acceptance Criteria:**
- [ ] `getCachedResolution(jsearchJobId)` returns cached `ResolutionResult` if not expired
- [ ] `cacheResolution(job, result)` upserts to `resolved_links` with tier-based TTL (Tier 1: 7d, Tier 2: 5d, Tier 3: 5d, Tier 4: 1d)
- [ ] `getCachedATS(employerDomain)` returns ATS detection if verified within 30 days
- [ ] `cacheATS(domain, detection)` upserts to `company_ats_cache`
- [ ] All functions use `createServiceClient()` for Supabase access
- [ ] Build passes

---

## Task 11: Main Resolver — `resolveDirectLink()`

**Files:**
- Create: `src/lib/resolver/index.ts`

**Acceptance Criteria:**
- [ ] `resolveDirectLink(jobListing)` implements the full 4-tier waterfall
- [ ] Checks cache first → returns cached result if valid
- [ ] Tier 0: Checks if `source_url` already points to a known ATS domain
- [ ] Tier 1: Runs ATS detection → ATS API lookup if platform has slug
- [ ] Tier 2: Runs HTML career page parse if careers_url found
- [ ] Tier 3: Runs LLM resolver if Tiers 1-2 fail
- [ ] Tier 4: Falls back to best JSearch link (filters out LinkedIn/Indeed)
- [ ] Caches result at each tier
- [ ] Verifies resolved URL before caching
- [ ] `isDirect` is `true` for Tiers 1-3, `false` for Tier 4
- [ ] Handles missing `employer_website` gracefully (skips to Tier 4)
- [ ] Build passes

**Implementation Notes:**
- The input is a `job_listings` row, not a JSearch raw response
- We need `external_id`, `title`, `company_name`, `employer_website`, `source_url` from the job listing
- The function should accept a simple object with these fields

---

## Task 12: API Route — Resolve on Demand

**Files:**
- Create: `src/app/api/v1/employee/jobs/[id]/resolve/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/v1/employee/jobs/:id/resolve` resolves the direct link for a specific job
- [ ] Requires employee authentication
- [ ] Fetches job listing from `job_listings` table by the job match ID
- [ ] Calls `resolveDirectLink()` and returns the result
- [ ] Returns `{ data: { direct_url, is_direct, tier, method, confidence, matched_title } }`
- [ ] Returns cached result instantly if available
- [ ] Uses Node.js runtime, 30s max duration
- [ ] Proper error handling with standard API error format
- [ ] Build passes

---

## Task 13: Frontend — Job Detail Apply Button

**Files:**
- Modify: `src/app/jobs/[id]/page.tsx` — replace static apply link with resolver-powered button

**Acceptance Criteria:**
- [ ] On job detail page load, calls `/api/v1/employee/jobs/:id/resolve` to get direct link
- [ ] Shows loading skeleton while resolving
- [ ] If `is_direct === true`: shows "Apply Now" primary button linking to `direct_url`
- [ ] If `is_direct === false`: shows "View on [Publisher]" secondary button with tooltip warning about intermediary
- [ ] If resolution fails: falls back to original `source_url` with "Apply on Company Site" label
- [ ] Button opens in new tab (`target="_blank"`)
- [ ] Resolution state persisted so repeat views don't re-resolve
- [ ] Build passes

---

## Task 14: Store `resolved_link_url` on `job_listings`

**Files:**
- Modify: `src/lib/resolver/cache.ts` — also update `job_listings.source_url` when resolution succeeds
- Modify: `src/app/api/v1/employee/jobs/[id]/resolve/route.ts` — update listing source_url on Tier 1-3 success

**Acceptance Criteria:**
- [ ] When a Tier 1-3 resolution succeeds (isDirect=true), update `job_listings.source_url` with the resolved direct URL
- [ ] This ensures future page loads show the direct URL immediately without re-resolving
- [ ] Original JSearch URL is preserved in `resolved_links.direct_url` for audit
- [ ] Build passes

---

## Task 15: Build, Test End-to-End, Deploy

**Acceptance Criteria:**
- [ ] `npx next build` passes with zero errors
- [ ] Manual test: navigate to a job detail page, click "Apply Now", verify it opens the employer's application page (not LinkedIn/Indeed)
- [ ] Manual test: verify the resolution result is cached (second visit loads instantly)
- [ ] Manual test: verify Tier 4 fallback shows "View on [Publisher]" with tooltip
- [ ] All changes committed and pushed to `origin master`
- [ ] Vercel deployment succeeds
