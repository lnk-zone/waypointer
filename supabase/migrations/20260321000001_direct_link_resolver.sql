-- Direct Link Resolver: company_ats_cache, resolved_links, and job_listings patch
-- Creates caching tables for the direct link resolver module per the resolver spec.
-- Both tables are service-role-only; RLS is enabled with no user-facing policies.

-- ============================================================
-- COMPANY ATS CACHE
-- ============================================================
-- Once a company's ATS platform and careers URL are detected they are stored
-- here so subsequent resolutions skip the detection step entirely.

CREATE TABLE company_ats_cache (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_name    TEXT        NOT NULL,
    employer_domain  TEXT        NOT NULL,     -- e.g. "stripe.com"
    ats_platform     TEXT,                     -- e.g. "greenhouse", "lever", "ashby", "workday", "custom", null
    ats_slug         TEXT,                     -- e.g. "stripe" (board identifier used in ATS API URLs)
    careers_url      TEXT,                     -- e.g. "https://stripe.com/jobs"
    detection_method TEXT,                     -- how the ATS was discovered: "html_parse", "redirect", "manual"
    last_verified    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(employer_domain)
);

CREATE INDEX idx_company_ats_domain ON company_ats_cache(employer_domain);
CREATE INDEX idx_company_ats_name   ON company_ats_cache(employer_name);

-- ============================================================
-- RESOLVED LINKS CACHE
-- ============================================================
-- Maps a specific JSearch job_id to its verified direct application URL.
-- Rows expire after 7 days by default; the resolver rechecks after expiry.

CREATE TABLE resolved_links (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    job_listing_id    UUID         REFERENCES job_listings(id) ON DELETE CASCADE,
    jsearch_job_id    TEXT         NOT NULL,   -- JSearch job_id (stable identifier)
    employer_name     TEXT         NOT NULL,
    employer_domain   TEXT         NOT NULL,
    job_title         TEXT         NOT NULL,

    -- Resolution result
    direct_url        TEXT,                    -- the verified direct application URL
    resolution_tier   INTEGER      NOT NULL,   -- 1=ATS API, 2=HTML parse, 3=LLM, 4=fallback
    resolution_method TEXT         NOT NULL,   -- e.g. "greenhouse_api", "html_regex", "llm_haiku", "jsearch_fallback"
    is_verified       BOOLEAN      DEFAULT FALSE,  -- HTTP HEAD/GET confirmed 200
    is_direct         BOOLEAN      DEFAULT FALSE,  -- true for tiers 1-3, false for tier 4 fallback
    verified_at       TIMESTAMPTZ,

    -- ATS metadata
    ats_platform      TEXT,
    ats_job_id        TEXT,                    -- job ID within the ATS system
    page_title        TEXT,                    -- <title> of resolved page (used for verification display)

    -- LLM cost tracking (zero for tiers 1-2)
    llm_input_tokens  INTEGER      DEFAULT 0,
    llm_output_tokens INTEGER      DEFAULT 0,
    llm_cost_usd      DECIMAL(10,6) DEFAULT 0,

    -- Timestamps
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '7 days',

    UNIQUE(jsearch_job_id)
);

CREATE INDEX idx_resolved_employer ON resolved_links(employer_domain);
CREATE INDEX idx_resolved_expires  ON resolved_links(expires_at);
CREATE INDEX idx_resolved_listing  ON resolved_links(job_listing_id);

-- ============================================================
-- JOB LISTINGS PATCH
-- ============================================================
-- Adds the employer_website column so the resolver can reach the
-- employer's own domain without relying solely on JSearch metadata.

ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS employer_website TEXT;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- Both tables are internal infrastructure accessed exclusively through
-- server-side routes using the service role key, which bypasses RLS.
-- No user-facing policies are created; direct client access is denied
-- by default once RLS is enabled.

ALTER TABLE company_ats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolved_links     ENABLE ROW LEVEL SECURITY;
