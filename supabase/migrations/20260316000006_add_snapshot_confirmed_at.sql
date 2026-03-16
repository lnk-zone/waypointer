-- Add confirmed_at column to career_snapshots
-- Used to track when the employee confirmed their snapshot review
ALTER TABLE career_snapshots
  ADD COLUMN confirmed_at TIMESTAMPTZ;
