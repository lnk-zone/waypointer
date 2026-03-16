-- Add week_focus and encouragement columns to weekly_plans
-- These fields come from the GENERATE_WEEKLY_PLAN prompt output

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS week_focus TEXT,
  ADD COLUMN IF NOT EXISTS encouragement TEXT;
