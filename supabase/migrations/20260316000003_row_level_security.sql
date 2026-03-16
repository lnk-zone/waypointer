-- E2-03: Row-Level Security Policies
-- Enables RLS on all tables and creates isolation policies per MP §8.
-- Service role key bypasses all RLS policies.

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EMPLOYEE PROFILE POLICY
-- ============================================================

CREATE POLICY employee_own_data ON employee_profiles
  FOR ALL USING (auth.uid() = auth_user_id);

-- ============================================================
-- EMPLOYER POLICIES — company-scoped access
-- ============================================================

CREATE POLICY employer_own_company ON companies
  FOR ALL USING (
    id IN (
      SELECT company_id FROM employer_admins
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY employer_own_admins ON employer_admins
  FOR ALL USING (auth.uid() = auth_user_id);

CREATE POLICY employer_own_programs ON transition_programs
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM employer_admins
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY employer_own_billing ON billing_records
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM employer_admins
      WHERE auth_user_id = auth.uid()
    )
  );

-- Seats: employer admins access seats for their company's programs
CREATE POLICY employer_seats ON seats
  FOR ALL USING (
    program_id IN (
      SELECT tp.id FROM transition_programs tp
      JOIN companies c ON tp.company_id = c.id
      JOIN employer_admins ea ON ea.company_id = c.id
      WHERE ea.auth_user_id = auth.uid()
    )
  );

-- Email sends: employer admins for seats in their company's programs
CREATE POLICY employer_email_sends ON email_sends
  FOR ALL USING (
    seat_id IN (
      SELECT s.id FROM seats s
      JOIN transition_programs tp ON s.program_id = tp.id
      JOIN employer_admins ea ON ea.company_id = tp.company_id
      WHERE ea.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- EMPLOYEE-OWNED TABLE POLICIES
-- All use the same pattern: employee_id must belong to the
-- authenticated user's profile.
-- ============================================================

CREATE POLICY employee_own_snapshots ON career_snapshots
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_work_history ON work_history
  FOR ALL USING (
    snapshot_id IN (
      SELECT cs.id FROM career_snapshots cs
      JOIN employee_profiles ep ON cs.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_skills ON skills
  FOR ALL USING (
    snapshot_id IN (
      SELECT cs.id FROM career_snapshots cs
      JOIN employee_profiles ep ON cs.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_achievements ON achievements
  FOR ALL USING (
    snapshot_id IN (
      SELECT cs.id FROM career_snapshots cs
      JOIN employee_profiles ep ON cs.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_industries ON industries
  FOR ALL USING (
    snapshot_id IN (
      SELECT cs.id FROM career_snapshots cs
      JOIN employee_profiles ep ON cs.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_tools ON tools_technologies
  FOR ALL USING (
    snapshot_id IN (
      SELECT cs.id FROM career_snapshots cs
      JOIN employee_profiles ep ON cs.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_role_paths ON role_paths
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_resumes ON resumes
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_linkedin ON linkedin_content
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_job_matches ON job_matches
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_app_kits ON application_kits
  FOR ALL USING (
    job_match_id IN (
      SELECT jm.id FROM job_matches jm
      JOIN employee_profiles ep ON jm.employee_id = ep.id
      WHERE ep.auth_user_id = auth.uid()
    )
  );

CREATE POLICY employee_own_applications ON applications
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_outreach ON outreach_messages
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_interviews ON interview_sessions
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_weekly_plans ON weekly_plans
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_checkins ON confidence_checkins
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_activity ON activity_log
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_transition_plan ON transition_plans
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY employee_own_outcomes ON outcome_reports
  FOR ALL USING (
    employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- SHARED DATA POLICIES
-- ============================================================

-- Prompt registry: readable by any authenticated user
CREATE POLICY prompt_registry_read ON prompt_registry
  FOR SELECT USING (auth.role() = 'authenticated');

-- Job listings: readable by any authenticated user
CREATE POLICY job_listings_read ON job_listings
  FOR SELECT USING (auth.role() = 'authenticated');
