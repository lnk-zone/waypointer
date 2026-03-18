-- ============================================================
-- Interview Prep Cache Table
-- Caches AI-generated interview prep materials per employee,
-- role path, and optional job match combination.
-- ============================================================

CREATE TABLE IF NOT EXISTS interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID NOT NULL REFERENCES role_paths(id) ON DELETE CASCADE,
  job_match_id UUID REFERENCES job_matches(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_employee ON interview_prep(employee_id);

-- Unique index using COALESCE to handle nullable job_match_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_prep_unique
  ON interview_prep(employee_id, role_path_id, COALESCE(job_match_id, '00000000-0000-0000-0000-000000000000'));

-- RLS
ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_prep_employee_policy ON interview_prep
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()
    )
  );
