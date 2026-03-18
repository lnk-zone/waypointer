-- Add admin_emails JSONB column to store invited HR admin emails
ALTER TABLE companies ADD COLUMN IF NOT EXISTS admin_emails JSONB DEFAULT '[]'::jsonb;
