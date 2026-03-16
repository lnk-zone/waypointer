-- E11-03: Batch version of increment_used_seats that atomically increments
-- by a given count, guarding against exceeding total_seats.

CREATE OR REPLACE FUNCTION increment_used_seats_batch(p_program_id UUID, p_count INT)
RETURNS VOID AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE transition_programs
  SET used_seats = used_seats + p_count
  WHERE id = p_program_id
    AND used_seats + p_count <= total_seats;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'Not enough seats available or program not found for id %', p_program_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
