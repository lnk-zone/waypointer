-- ============================================================
-- Migration: Account-Level Seats
-- ============================================================
-- Seats move from program-level to account-level.
-- Programs become lightweight organizational containers.
-- ============================================================

-- 1. Add seat balance columns to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_seats_purchased INT NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_seats_assigned INT NOT NULL DEFAULT 0;

-- 2. Create seat_purchases table
CREATE TABLE IF NOT EXISTS seat_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seats_purchased INT NOT NULL,
  price_per_seat_cents INT NOT NULL,
  total_amount_cents INT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'simulated',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seat_purchases_company ON seat_purchases(company_id);

-- Enable RLS on seat_purchases
ALTER TABLE seat_purchases ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on seat_purchases'
  ) THEN
    CREATE POLICY "Service role full access on seat_purchases"
      ON seat_purchases FOR ALL USING (true);
  END IF;
END $$;

-- 3. Add company_id to seats table, make program_id optional
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seats' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE seats ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

ALTER TABLE seats ALTER COLUMN program_id DROP NOT NULL;

-- 4. Backfill: set company_id on existing seats from their program's company_id
UPDATE seats s
SET company_id = tp.company_id
FROM transition_programs tp
WHERE s.program_id = tp.id AND s.company_id IS NULL;

-- 5. Make company_id NOT NULL after backfill (only if no NULLs remain)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seats WHERE company_id IS NULL) THEN
    ALTER TABLE seats ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- 6. Create assign_seats function (atomic seat assignment)
CREATE OR REPLACE FUNCTION assign_seats(p_company_id UUID, p_count INT)
RETURNS VOID AS $$
BEGIN
  UPDATE companies
  SET total_seats_assigned = total_seats_assigned + p_count,
      updated_at = NOW()
  WHERE id = p_company_id
    AND total_seats_purchased - total_seats_assigned >= p_count;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough available seats';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Backfill: sync companies seat counts from existing transition_programs data
UPDATE companies c
SET total_seats_purchased = COALESCE(sub.total_seats, 0),
    total_seats_assigned = COALESCE(sub.used_seats, 0)
FROM (
  SELECT company_id, SUM(total_seats) AS total_seats, SUM(used_seats) AS used_seats
  FROM transition_programs
  WHERE is_active = true
  GROUP BY company_id
) sub
WHERE sub.company_id = c.id;

-- 8. Create index on seats.company_id
CREATE INDEX IF NOT EXISTS idx_seats_company ON seats(company_id);
