-- Add location_country column to employee_profiles
ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS location_country TEXT;
