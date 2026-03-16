-- Add feedback detail columns to interview_sessions for ANALYZE_INTERVIEW output
-- These fields store the AI-generated narrative feedback alongside the numeric scores

ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS overall_summary TEXT,
  ADD COLUMN IF NOT EXISTS clarity_notes TEXT,
  ADD COLUMN IF NOT EXISTS specificity_notes TEXT,
  ADD COLUMN IF NOT EXISTS confidence_notes TEXT,
  ADD COLUMN IF NOT EXISTS filler_words_noted JSONB;
