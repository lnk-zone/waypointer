-- E2-02: Database Schema — Employee and Feature Tables
-- Creates all remaining tables from MP §8: seats through email_sends.

-- ============================================================
-- EMPLOYEE / SEAT TABLES
-- ============================================================

CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES transition_programs(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  department TEXT,
  role_family TEXT,
  last_day DATE,
  status seat_status NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, employee_email)
);
CREATE INDEX idx_seats_program ON seats(program_id);
CREATE INDEX idx_seats_email ON seats(employee_email);
CREATE INDEX idx_seats_status ON seats(status);

CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  seat_id UUID UNIQUE NOT NULL REFERENCES seats(id),
  seniority seniority_level,
  management_exp management_experience,
  level_dir level_direction,
  location_city TEXT,
  location_state TEXT,
  work_pref work_preference,
  comp_target_min INT,
  comp_target_max INT,
  work_auth work_authorization,
  years_of_experience INT,
  most_recent_role TEXT,
  most_recent_company TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  paths_selected BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employee_profiles_auth ON employee_profiles(auth_user_id);
CREATE INDEX idx_employee_profiles_seat ON employee_profiles(seat_id);

-- ============================================================
-- CAREER SNAPSHOT TABLES
-- ============================================================

CREATE TABLE career_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  career_narrative TEXT,
  raw_extraction JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration_months INT,
  description TEXT,
  is_management_role BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_work_history_snapshot ON work_history(snapshot_id);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  is_user_added BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skills_snapshot ON skills(snapshot_id);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  impact impact_type,
  has_metric BOOLEAN NOT NULL DEFAULT FALSE,
  source_text TEXT,
  work_history_id UUID REFERENCES work_history(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_achievements_snapshot ON achievements(snapshot_id);

CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_industries_snapshot ON industries(snapshot_id);

CREATE TABLE tools_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tools_snapshot ON tools_technologies(snapshot_id);

-- ============================================================
-- ROLE TARGETING TABLES
-- ============================================================

CREATE TABLE role_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  why_it_fits TEXT NOT NULL,
  salary_band_min INT,
  salary_band_max INT,
  demand_level TEXT NOT NULL CHECK (demand_level IN ('high', 'medium', 'low')),
  confidence_score FLOAT NOT NULL,
  skills_overlap_pct INT NOT NULL,
  gap_analysis TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_role_paths_employee ON role_paths(employee_id);

-- ============================================================
-- RESUME TABLES
-- ============================================================

CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID NOT NULL REFERENCES role_paths(id) ON DELETE CASCADE,
  tone resume_tone NOT NULL DEFAULT 'professional',
  summary_statement TEXT,
  skills_section JSONB,
  experience_section JSONB,
  keywords JSONB,
  full_content JSONB,
  ats_score INT,
  clarity_score INT,
  specificity_score INT,
  score_feedback JSONB,
  pdf_url TEXT,
  docx_url TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, role_path_id, version)
);
CREATE INDEX idx_resumes_employee ON resumes(employee_id);
CREATE INDEX idx_resumes_path ON resumes(role_path_id);

CREATE TABLE linkedin_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  headline TEXT,
  about_section TEXT,
  experience_bullets JSONB,
  featured_suggestions JSONB,
  skill_recommendations JSONB,
  open_to_work_guidance TEXT,
  recruiter_tips TEXT,
  is_marked_updated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOB MATCHING TABLES
-- ============================================================

CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  location TEXT,
  is_remote BOOLEAN NOT NULL DEFAULT FALSE,
  is_hybrid BOOLEAN NOT NULL DEFAULT FALSE,
  description_summary TEXT,
  description_full TEXT,
  salary_min INT,
  salary_max INT,
  requirements JSONB,
  posted_at TIMESTAMPTZ,
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_listings_external ON job_listings(external_id);
CREATE INDEX idx_job_listings_active ON job_listings(is_active);

CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  job_listing_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  role_path_id UUID REFERENCES role_paths(id),
  fit fit_score NOT NULL,
  match_explanation TEXT NOT NULL,
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
  recommended_action job_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, job_listing_id)
);
CREATE INDEX idx_job_matches_employee ON job_matches(employee_id);
CREATE INDEX idx_job_matches_fit ON job_matches(fit);

CREATE TABLE application_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_match_id UUID UNIQUE NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  intro_paragraph TEXT,
  recruiter_message TEXT,
  hiring_manager_message TEXT,
  referral_request TEXT,
  resume_edits JSONB,
  interview_themes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  job_match_id UUID REFERENCES job_matches(id),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status application_status NOT NULL DEFAULT 'saved',
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_applications_employee ON applications(employee_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- OUTREACH TABLES
-- ============================================================

CREATE TABLE outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  recipient recipient_type NOT NULL,
  role_path_id UUID REFERENCES role_paths(id),
  job_match_id UUID REFERENCES job_matches(id),
  relationship relationship_strength NOT NULL DEFAULT 'cold',
  personal_context TEXT,
  tone outreach_tone NOT NULL DEFAULT 'warm',
  linkedin_message TEXT,
  email_message TEXT,
  followup_message TEXT,
  guidance JSONB,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outreach_employee ON outreach_messages(employee_id);

-- ============================================================
-- INTERVIEW TABLES
-- ============================================================

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID REFERENCES role_paths(id),
  job_match_id UUID REFERENCES job_matches(id),
  format interview_format NOT NULL DEFAULT 'behavioral',
  difficulty interview_difficulty NOT NULL DEFAULT 'standard',
  duration_minutes INT NOT NULL DEFAULT 15,
  elevenlabs_session_id TEXT,
  transcript TEXT,
  audio_url TEXT,
  overall_score INT,
  clarity_score INT,
  specificity_score INT,
  confidence_score INT,
  filler_word_count INT,
  answer_analyses JSONB,
  strongest_stories JSONB,
  weak_answers JSONB,
  next_recommendation TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  feedback_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interview_sessions_employee ON interview_sessions(employee_id);

-- ============================================================
-- PROGRESS AND PLANNING TABLES
-- ============================================================

CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  week_start DATE NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_number)
);
CREATE INDEX idx_weekly_plans_employee ON weekly_plans(employee_id);

CREATE TABLE confidence_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  week_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_number)
);
CREATE INDEX idx_confidence_employee ON confidence_checkins(employee_id);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_log_employee ON activity_log(employee_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- ============================================================
-- TRANSITION PLAN TABLE
-- ============================================================

CREATE TABLE transition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  search_strategy TEXT,
  readiness_score INT,
  readiness_breakdown JSONB,
  first_week_plan JSONB,
  suggested_timeline JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OUTCOME REPORTING TABLES
-- ============================================================

CREATE TABLE outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  has_landed BOOLEAN NOT NULL DEFAULT FALSE,
  new_role_title TEXT,
  new_company TEXT,
  time_to_first_interview_days INT,
  time_to_placement_days INT,
  satisfaction_score INT CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  confidence_improvement INT,
  would_recommend BOOLEAN,
  feedback_text TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outcome_reports_employee ON outcome_reports(employee_id);

-- ============================================================
-- PROMPT REGISTRY TABLE
-- ============================================================

CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT UNIQUE NOT NULL,
  version INT NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  output_format TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INT NOT NULL DEFAULT 4096,
  temperature FLOAT NOT NULL DEFAULT 0.3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);
CREATE INDEX idx_prompt_registry_active ON prompt_registry(prompt_id, is_active);

-- ============================================================
-- DAY ZERO EMAIL TRACKING
-- ============================================================

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  template_type email_template_type NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_sends_seat ON email_sends(seat_id);
CREATE INDEX idx_email_sends_template ON email_sends(template_type);

-- ============================================================
-- AUTO-UPDATE TRIGGERS FOR updated_at
-- ============================================================

CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_snapshots_updated_at
  BEFORE UPDATE ON career_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_history_updated_at
  BEFORE UPDATE ON work_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_paths_updated_at
  BEFORE UPDATE ON role_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_content_updated_at
  BEFORE UPDATE ON linkedin_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_kits_updated_at
  BEFORE UPDATE ON application_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_messages_updated_at
  BEFORE UPDATE ON outreach_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at
  BEFORE UPDATE ON weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transition_plans_updated_at
  BEFORE UPDATE ON transition_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outcome_reports_updated_at
  BEFORE UPDATE ON outcome_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_registry_updated_at
  BEFORE UPDATE ON prompt_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_technologies_updated_at
  BEFORE UPDATE ON tools_technologies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_matches_updated_at
  BEFORE UPDATE ON job_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confidence_checkins_updated_at
  BEFORE UPDATE ON confidence_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_log_updated_at
  BEFORE UPDATE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sends_updated_at
  BEFORE UPDATE ON email_sends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
