-- E3-01: Fix prompt_registry schema to allow versioning.
-- The original schema had UNIQUE on prompt_id alone, preventing multiple versions.
-- Keep only the composite UNIQUE(prompt_id, version) constraint.

ALTER TABLE prompt_registry DROP CONSTRAINT IF EXISTS prompt_registry_prompt_id_key;
