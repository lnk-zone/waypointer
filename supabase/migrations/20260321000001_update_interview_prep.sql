-- Update interview_prep table for job-description-driven interview prep
-- Makes role_path_id nullable and adds new columns for JD-centric workflow

-- Make role_path_id nullable (new flow is JD-driven, not role-path-driven)
ALTER TABLE interview_prep ALTER COLUMN role_path_id DROP NOT NULL;

-- Add new columns
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS job_description_hash TEXT;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS job_description_text TEXT;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS interviewer_titles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS interview_stage TEXT;
ALTER TABLE interview_prep ADD COLUMN IF NOT EXISTS format TEXT;

-- Drop old unique index (COALESCE-based for role_path + job_match)
DROP INDEX IF EXISTS idx_interview_prep_unique;

-- Add new unique index for cache deduplication
-- Hash includes JD content + stage + format so same JD can have different stage preps
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_jd_hash
  ON interview_prep(employee_id, job_description_hash)
  WHERE job_description_hash IS NOT NULL;
