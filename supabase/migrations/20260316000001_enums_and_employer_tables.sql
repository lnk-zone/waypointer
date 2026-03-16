-- E2-01: Database Schema — Enums and Employer Tables
-- Creates all 18 PostgreSQL enums and employer-side tables from MP §8.

-- ============================================================
-- ENUMS (in dependency order from MP §8)
-- ============================================================

CREATE TYPE seniority_level AS ENUM (
  'entry_level',
  'mid_level',
  'senior',
  'staff_principal',
  'manager',
  'senior_manager',
  'director',
  'vp_plus'
);

CREATE TYPE management_experience AS ENUM (
  'no_direct_reports',
  '1_to_3',
  '4_to_10',
  '10_plus'
);

CREATE TYPE level_direction AS ENUM (
  'stay_current',
  'open_to_step_up',
  'open_to_step_down'
);

CREATE TYPE work_preference AS ENUM (
  'remote',
  'hybrid',
  'on_site'
);

CREATE TYPE work_authorization AS ENUM (
  'us_citizen',
  'green_card',
  'h1b',
  'opt',
  'other'
);

CREATE TYPE fit_score AS ENUM (
  'high_fit',
  'stretch',
  'low_fit'
);

CREATE TYPE job_action AS ENUM (
  'apply_now',
  'reach_out_first',
  'seek_referral',
  'save_for_later',
  'skip'
);

CREATE TYPE application_status AS ENUM (
  'saved',
  'applied',
  'interviewing',
  'offer',
  'closed'
);

CREATE TYPE seat_status AS ENUM (
  'invited',
  'activated',
  'active',
  'inactive',
  'expired'
);

CREATE TYPE interview_format AS ENUM (
  'behavioral',
  'technical',
  'mixed'
);

CREATE TYPE interview_difficulty AS ENUM (
  'standard',
  'challenging'
);

CREATE TYPE recipient_type AS ENUM (
  'recruiter',
  'hiring_manager',
  'former_colleague',
  'alumni',
  'referral_request',
  'follow_up'
);

CREATE TYPE relationship_strength AS ENUM (
  'cold',
  'warm',
  'close'
);

CREATE TYPE resume_tone AS ENUM (
  'professional',
  'confident',
  'conversational'
);

CREATE TYPE outreach_tone AS ENUM (
  'warm',
  'formal'
);

CREATE TYPE plan_item_category AS ENUM (
  'resume',
  'jobs',
  'outreach',
  'interviews',
  'linkedin',
  'other'
);

CREATE TYPE impact_type AS ENUM (
  'revenue',
  'efficiency',
  'scale',
  'quality',
  'leadership'
);

CREATE TYPE program_tier AS ENUM (
  'standard',
  'plus',
  'premium'
);

CREATE TYPE email_template_type AS ENUM (
  'invitation',
  'reengagement_72h',
  'weekly_nudge',
  'thirty_day_checkin'
);

-- ============================================================
-- EMPLOYER TABLES
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#2563EB',
  support_email TEXT,
  welcome_message TEXT,
  default_program_duration_days INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employer_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  auth_user_id UUID UNIQUE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);
CREATE INDEX idx_employer_admins_company ON employer_admins(company_id);
CREATE INDEX idx_employer_admins_auth ON employer_admins(auth_user_id);

CREATE TABLE transition_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Program',
  tier program_tier NOT NULL DEFAULT 'standard',
  total_seats INT NOT NULL,
  used_seats INT NOT NULL DEFAULT 0,
  access_duration_days INT NOT NULL DEFAULT 90,
  is_branded BOOLEAN NOT NULL DEFAULT TRUE,
  custom_intro_message TEXT,
  interview_coaching_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  outreach_builder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transition_programs_company ON transition_programs(company_id);

CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES transition_programs(id),
  seats_purchased INT NOT NULL,
  price_per_seat INT NOT NULL, -- in cents
  total_amount INT NOT NULL, -- in cents
  payment_method TEXT, -- 'stripe', 'invoice'
  stripe_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_billing_company ON billing_records(company_id);

-- ============================================================
-- AUTO-UPDATE TRIGGER FOR updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employer_admins_updated_at
  BEFORE UPDATE ON employer_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transition_programs_updated_at
  BEFORE UPDATE ON transition_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at
  BEFORE UPDATE ON billing_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
