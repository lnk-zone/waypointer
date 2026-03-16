-- E2-04: RPC function for atomically incrementing used_seats on a program.
-- Guards against exceeding total_seats.

CREATE OR REPLACE FUNCTION increment_used_seats(p_program_id UUID)
RETURNS VOID AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE transition_programs
  SET used_seats = used_seats + 1
  WHERE id = p_program_id
    AND used_seats < total_seats;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated = 0 THEN
    RAISE EXCEPTION 'No seats available or program not found for id %', p_program_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
