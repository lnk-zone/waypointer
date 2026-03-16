-- Add extra columns to role_paths for AI-generated metadata from PR Prompt 4.
-- title_variations: alternative job titles for search matching
-- core_keywords: keywords that should appear in job listings
-- ideal_company_profile: description of best-fit company type

ALTER TABLE role_paths ADD COLUMN IF NOT EXISTS title_variations TEXT[] DEFAULT '{}';
ALTER TABLE role_paths ADD COLUMN IF NOT EXISTS core_keywords TEXT[] DEFAULT '{}';
ALTER TABLE role_paths ADD COLUMN IF NOT EXISTS ideal_company_profile TEXT;
