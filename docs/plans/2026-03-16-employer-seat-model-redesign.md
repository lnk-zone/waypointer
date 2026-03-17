# Employer Seat Model Redesign

**Date:** 2026-03-16
**Status:** Approved

## Problem

The current implementation ties seats to programs (`transition_programs.total_seats`, `transition_programs.used_seats`). This creates friction when employers want to run multiple programs or reallocate unused seats. Additionally:

- Program creation has unnecessary fields (tiers, feature toggles, duration)
- The invite API calls a non-existent DB function (`increment_used_seats_batch` vs `increment_used_seats`)
- Invites fail silently with a red error message
- No seat purchase flow exists — seats are configured during program setup with no payment
- Everyone gets the same product (90 days, all features) so per-program configuration is pointless

## Design

### Core Principle

**Seats are account-level; programs only organize who those seats were used for.**

### Data Model Changes

#### `companies` table — add seat balance

```sql
ALTER TABLE companies ADD COLUMN total_seats_purchased INT NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN total_seats_assigned INT NOT NULL DEFAULT 0;
```

Available seats = `total_seats_purchased - total_seats_assigned` (computed, not stored).

#### New `seat_purchases` table

Replaces `billing_records`. Tracks each purchase independently.

```sql
CREATE TABLE seat_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seats_purchased INT NOT NULL,
  price_per_seat_cents INT NOT NULL,
  total_amount_cents INT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'simulated',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_seat_purchases_company ON seat_purchases(company_id);
```

#### `transition_programs` table — simplified

Remove: `tier`, `total_seats`, `used_seats`, `access_duration_days`, `interview_coaching_enabled`, `outreach_builder_enabled`.

Keep: `id`, `company_id`, `name`, `custom_intro_message`, `is_branded`, `is_active`, `created_at`, `updated_at`.

Programs are lightweight organizational containers for grouping employees.

#### `seats` table — add `company_id`, make `program_id` optional

```sql
ALTER TABLE seats ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE seats ALTER COLUMN program_id DROP NOT NULL;
```

Seats belong to the company account. Program assignment is optional.

#### New DB function: `assign_seats`

Replaces `increment_used_seats`. Atomically increments `companies.total_seats_assigned`.

```sql
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
```

### Pricing Logic

Pure function, per-purchase (not cumulative):

| Seats purchased | Price per seat |
|----------------|---------------|
| 10-49          | $179          |
| 50-99          | $149          |
| 100+           | $129          |

Minimum purchase: 10 seats.

### Employer Onboarding Flow (Revised)

1. **Sign up** — company name, admin name, email, password (exists, no change)
2. **Company setup** (`/employer/setup`) — logo, brand color, welcome message. CTA: "Continue to purchase seats"
3. **Purchase seats** (`/employer/purchase`, new) — seat quantity input, live pricing, simulated payment. CTA: "Purchase seats"
4. **Success + redirect** — "You have X available seats. Start inviting now." → `/employer/invite`

### Sidebar Navigation

```
Overview      → /employer/dashboard
Invitations   → /employer/invite (invite + status list)
Programs      → /employer/programs (list, create, edit)
Reporting     → /employer/outcomes
Billing       → /employer/billing (seat balance + purchase history + buy more)
```

### Invitations Page (`/employer/invite`)

- **Top:** Seat balance summary (Available / Assigned / Total purchased)
- **Employee table:** All invited people with name, email, program (if assigned), status, date
- **"Invite" button:** Opens invite flow (manual add or CSV). Program assignment is optional dropdown.

### Programs Page (`/employer/programs`, new)

- List of all programs with name, employee count, created date
- "Create program" button
- Program form: name (required), custom intro message (optional), branded toggle
- No seats, no tiers, no duration, no feature toggles

### Billing Page (`/employer/billing`, new)

- Seat balance: Available / Assigned / Total purchased
- Purchase history table: date, seats purchased, price per seat, total
- "Buy more seats" button → same purchase flow as onboarding step 3

### Invite API Changes

- `program_id` becomes optional in the request
- Seat availability checks `companies.total_seats_purchased - companies.total_seats_assigned`
- Uses new `assign_seats` RPC instead of broken `increment_used_seats_batch`
- Sends actual invitation emails via Resend

### Pages Affected

| Page | Action |
|------|--------|
| `/employer/setup` | Simplify, redirect to `/employer/purchase` |
| `/employer/purchase` | New — seat purchase with live pricing |
| `/employer/invite` | Rewrite — employee list + invite + seat balance |
| `/employer/programs` | New — replaces `/employer/program` (plural, list view) |
| `/employer/billing` | New — seat balance + purchase history |
| `/employer/dashboard` | Update metrics to use account-level seat data |
| Sidebar | Update labels and routes |
| Program API | Simplify — remove tier/seats/duration/feature fields |
| Invite API | Fix RPC call, make program_id optional, add company_id to seats |
| Seat purchase API | New — POST creates purchase record + credits seats |
| Seat balance API | New — GET returns account seat balance |
