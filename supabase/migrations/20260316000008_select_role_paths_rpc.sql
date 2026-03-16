-- Atomic role path selection RPC
-- Clears existing selections and sets primary + secondary paths in one transaction.
-- Returns the count of paths updated.

CREATE OR REPLACE FUNCTION select_role_paths(
  p_employee_id UUID,
  p_primary_path_id UUID,
  p_secondary_path_ids UUID[] DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  primary_updated INTEGER;
  secondary_updated INTEGER;
BEGIN
  -- Verify the primary path belongs to this employee
  IF NOT EXISTS (
    SELECT 1 FROM role_paths
    WHERE id = p_primary_path_id AND employee_id = p_employee_id
  ) THEN
    RAISE EXCEPTION 'Primary path not found for this employee'
      USING ERRCODE = 'P0002';
  END IF;

  -- Verify all secondary paths belong to this employee
  IF array_length(p_secondary_path_ids, 1) IS NOT NULL THEN
    IF EXISTS (
      SELECT unnest(p_secondary_path_ids)
      EXCEPT
      SELECT id FROM role_paths WHERE employee_id = p_employee_id
    ) THEN
      RAISE EXCEPTION 'One or more secondary paths not found for this employee'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Clear all existing selections for this employee
  UPDATE role_paths
  SET is_primary = FALSE, is_selected = FALSE, updated_at = NOW()
  WHERE employee_id = p_employee_id;

  -- Set primary path
  UPDATE role_paths
  SET is_primary = TRUE, is_selected = TRUE, updated_at = NOW()
  WHERE id = p_primary_path_id AND employee_id = p_employee_id;

  GET DIAGNOSTICS primary_updated = ROW_COUNT;
  updated_count := primary_updated;

  -- Set secondary paths
  IF array_length(p_secondary_path_ids, 1) IS NOT NULL THEN
    UPDATE role_paths
    SET is_selected = TRUE, updated_at = NOW()
    WHERE id = ANY(p_secondary_path_ids) AND employee_id = p_employee_id;

    GET DIAGNOSTICS secondary_updated = ROW_COUNT;
    updated_count := updated_count + secondary_updated;
  END IF;

  RETURN updated_count;
END;
$$;
