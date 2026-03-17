# Employer Seat Model Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure employer seats to be account-level, add seat purchase flow, simplify programs to organizational containers, fix invite flow, and add billing page.

**Architecture:** DB migration first (add columns, new table, new function), then API layer (new endpoints, fix existing), then frontend pages (purchase, programs list, billing, updated invite). Each task is independently deployable.

**Tech Stack:** Next.js 14, Supabase (Postgres), Zod, Tailwind, shadcn/ui, Edge Runtime

**Design doc:** `docs/plans/2026-03-16-employer-seat-model-redesign.md`

---

### Task 1: Database Migration — Account-Level Seats

**Files:**
- Create: `supabase/migrations/20260316_account_level_seats.sql`

**Step 1: Write the migration SQL**

```sql
-- Add seat balance columns to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_seats_purchased INT NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_seats_assigned INT NOT NULL DEFAULT 0;

-- Create seat_purchases table
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
CREATE POLICY "Service role full access on seat_purchases" ON seat_purchases FOR ALL USING (true);

-- Add company_id to seats table, make program_id optional
ALTER TABLE seats ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE seats ALTER COLUMN program_id DROP NOT NULL;

-- Backfill: set company_id on existing seats from their program's company_id
UPDATE seats s
SET company_id = tp.company_id
FROM transition_programs tp
WHERE s.program_id = tp.id AND s.company_id IS NULL;

-- Now make company_id NOT NULL after backfill
ALTER TABLE seats ALTER COLUMN company_id SET NOT NULL;

-- Create assign_seats function
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

-- Backfill: sync companies seat counts from existing transition_programs data
UPDATE companies c
SET total_seats_purchased = COALESCE(tp.total_seats, 0),
    total_seats_assigned = COALESCE(tp.used_seats, 0)
FROM transition_programs tp
WHERE tp.company_id = c.id AND tp.is_active = true;
```

**Step 2: Run migration against production**

Run via Supabase Management API:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/dqneifiwmxvskmjhwubx/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -Rs '{query: .}' supabase/migrations/20260316_account_level_seats.sql)"
```

Verify: Query `companies` table to confirm new columns exist. Query `seat_purchases` table to confirm it was created.

**Step 3: Commit**

```bash
git add supabase/migrations/20260316_account_level_seats.sql
git commit -m "feat: database migration for account-level seats"
```

---

### Task 2: Pricing Utility + Validators

**Files:**
- Create: `src/lib/pricing.ts`
- Modify: `src/lib/validators/program.ts`

**Step 1: Create pricing utility**

Create `src/lib/pricing.ts`:

```typescript
/**
 * Seat pricing logic — per-purchase, not cumulative.
 *
 * 10-49 seats  → $179/seat
 * 50-99 seats  → $149/seat
 * 100+  seats  → $129/seat
 *
 * Minimum purchase: 10 seats.
 */

export const PRICING_TIERS = [
  { min: 100, max: Infinity, pricePerSeat: 129_00, label: "100+" },
  { min: 50, max: 99, pricePerSeat: 149_00, label: "50-99" },
  { min: 10, max: 49, pricePerSeat: 179_00, label: "10-49" },
] as const;

export const MIN_SEAT_PURCHASE = 10;

export function getPricePerSeat(quantity: number): number {
  const tier = PRICING_TIERS.find((t) => quantity >= t.min && quantity <= t.max);
  return tier ? tier.pricePerSeat : PRICING_TIERS[PRICING_TIERS.length - 1].pricePerSeat;
}

export function calculateTotal(quantity: number): {
  quantity: number;
  pricePerSeatCents: number;
  totalCents: number;
  pricePerSeatDisplay: string;
  totalDisplay: string;
} {
  const pricePerSeatCents = getPricePerSeat(quantity);
  const totalCents = pricePerSeatCents * quantity;
  return {
    quantity,
    pricePerSeatCents,
    totalCents,
    pricePerSeatDisplay: `$${(pricePerSeatCents / 100).toFixed(0)}`,
    totalDisplay: `$${(totalCents / 100).toLocaleString()}`,
  };
}
```

**Step 2: Simplify program validator**

Replace contents of `src/lib/validators/program.ts`:

```typescript
import { z } from "zod";

/**
 * Simplified program schema — programs are organizational containers only.
 * No seats, no tiers, no duration, no feature toggles.
 */
export const programSchema = z.object({
  name: z.string().min(1, "Program name is required").max(200),
  custom_intro_message: z.string().max(2000).default(""),
  is_branded: z.boolean().default(true),
});

export type ProgramInput = z.infer<typeof programSchema>;

/**
 * Seat purchase validation.
 */
export const seatPurchaseSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(10, "Minimum purchase is 10 seats")
    .max(10000, "Maximum 10,000 seats per purchase"),
});

export type SeatPurchaseInput = z.infer<typeof seatPurchaseSchema>;
```

**Step 3: Commit**

```bash
git add src/lib/pricing.ts src/lib/validators/program.ts
git commit -m "feat: add pricing utility and simplify program validator"
```

---

### Task 3: Seat Purchase API

**Files:**
- Create: `src/app/api/v1/employer/seats/purchase/route.ts`
- Create: `src/app/api/v1/employer/seats/route.ts`

**Step 1: Create seat balance API**

Create `src/app/api/v1/employer/seats/route.ts` — GET returns account seat balance:

```typescript
/**
 * GET /api/v1/employer/seats
 *
 * Returns the employer's account-level seat balance.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const supabase = createServiceClient();

    const { data: company, error } = await supabase
      .from("companies")
      .select("total_seats_purchased, total_seats_assigned")
      .eq("id", auth.companyId)
      .single();

    if (error || !company) {
      return apiError(ERROR_CODES.NOT_FOUND, "Company not found");
    }

    const c = company as { total_seats_purchased: number; total_seats_assigned: number };

    return NextResponse.json({
      data: {
        total_purchased: c.total_seats_purchased,
        total_assigned: c.total_seats_assigned,
        available: c.total_seats_purchased - c.total_seats_assigned,
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch seat balance");
  }
}
```

**Step 2: Create seat purchase API**

Create `src/app/api/v1/employer/seats/purchase/route.ts`:

```typescript
/**
 * POST /api/v1/employer/seats/purchase
 *
 * Processes a seat purchase (simulated payment for now).
 * Creates a seat_purchases record and credits seats to the company account.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { seatPurchaseSchema } from "@/lib/validators/program";
import { calculateTotal } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const body = await request.json();
    const parsed = seatPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid purchase data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { quantity } = parsed.data;
    const pricing = calculateTotal(quantity);
    const supabase = createServiceClient();

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from("seat_purchases")
      .insert({
        company_id: auth.companyId,
        seats_purchased: quantity,
        price_per_seat_cents: pricing.pricePerSeatCents,
        total_amount_cents: pricing.totalCents,
        payment_method: "simulated",
      });

    if (purchaseError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to record purchase");
    }

    // Credit seats to company account
    const { error: creditError } = await supabase
      .from("companies")
      .update({
        total_seats_purchased: supabase.rpc ? undefined : undefined, // see below
      })
      .eq("id", auth.companyId);

    // Use raw SQL increment to avoid race conditions
    const { error: incrementError } = await supabase.rpc("increment_seats_purchased", {
      p_company_id: auth.companyId,
      p_count: quantity,
    });

    // Fallback: if RPC doesn't exist yet, do direct update
    if (incrementError) {
      const { data: company } = await supabase
        .from("companies")
        .select("total_seats_purchased")
        .eq("id", auth.companyId)
        .single();

      const current = (company as { total_seats_purchased: number } | null)?.total_seats_purchased ?? 0;

      const { error: updateError } = await supabase
        .from("companies")
        .update({
          total_seats_purchased: current + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.companyId);

      if (updateError) {
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to credit seats");
      }
    }

    // Fetch updated balance
    const { data: updatedCompany } = await supabase
      .from("companies")
      .select("total_seats_purchased, total_seats_assigned")
      .eq("id", auth.companyId)
      .single();

    const uc = updatedCompany as { total_seats_purchased: number; total_seats_assigned: number } | null;

    return NextResponse.json({
      data: {
        seats_purchased: quantity,
        price_per_seat: pricing.pricePerSeatDisplay,
        total: pricing.totalDisplay,
        balance: {
          total_purchased: uc?.total_seats_purchased ?? quantity,
          total_assigned: uc?.total_seats_assigned ?? 0,
          available: (uc?.total_seats_purchased ?? quantity) - (uc?.total_seats_assigned ?? 0),
        },
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to process purchase");
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/v1/employer/seats/purchase/route.ts src/app/api/v1/employer/seats/route.ts
git commit -m "feat: add seat balance and seat purchase API endpoints"
```

---

### Task 4: Seat Purchase History API

**Files:**
- Create: `src/app/api/v1/employer/seats/history/route.ts`

**Step 1: Create purchase history endpoint**

```typescript
/**
 * GET /api/v1/employer/seats/history
 *
 * Returns the employer's seat purchase history.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const supabase = createServiceClient();

    const { data: purchases, error } = await supabase
      .from("seat_purchases")
      .select("id, seats_purchased, price_per_seat_cents, total_amount_cents, payment_method, created_at")
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch purchase history");
    }

    return NextResponse.json({
      data: (purchases ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        seats_purchased: p.seats_purchased,
        price_per_seat: `$${((p.price_per_seat_cents as number) / 100).toFixed(0)}`,
        total: `$${((p.total_amount_cents as number) / 100).toLocaleString()}`,
        payment_method: p.payment_method,
        date: p.created_at,
      })),
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch purchase history");
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/v1/employer/seats/history/route.ts
git commit -m "feat: add seat purchase history API endpoint"
```

---

### Task 5: Simplify Program API

**Files:**
- Modify: `src/app/api/v1/employer/program/route.ts`
- Modify: `src/app/api/v1/employer/program/active/route.ts`

**Step 1: Rewrite program route**

Replace `src/app/api/v1/employer/program/route.ts` — POST creates a program (multiple allowed), PUT updates by ID. Remove all tier/seats/duration/feature fields. Only: name, custom_intro_message, is_branded.

**Step 2: Add GET to list all programs**

Add GET handler that returns all programs for the company.

**Step 3: Update active program route**

Update `src/app/api/v1/employer/program/active/route.ts` to return simplified program fields.

**Step 4: Commit**

```bash
git add src/app/api/v1/employer/program/route.ts src/app/api/v1/employer/program/active/route.ts
git commit -m "feat: simplify program API — remove tiers, seats, duration"
```

---

### Task 6: Fix Invite API

**Files:**
- Modify: `src/app/api/v1/employer/invite/route.ts`

**Step 1: Update invite handler**

Key changes:
- `program_id` becomes optional in the Zod schema
- Seat availability checks `companies.total_seats_purchased - companies.total_seats_assigned`
- Replace `increment_used_seats_batch` RPC with `assign_seats` RPC
- Add `company_id` to seat records
- Send actual invite emails via the existing email API

**Step 2: Commit**

```bash
git add src/app/api/v1/employer/invite/route.ts
git commit -m "fix: invite API — account-level seats, optional program_id"
```

---

### Task 7: Update Dashboard API

**Files:**
- Modify: `src/app/api/v1/employer/dashboard/route.ts`

**Step 1: Update dashboard to use account-level seat data**

Replace program-based `total_seats`/`used_seats` queries with `companies.total_seats_purchased`/`companies.total_seats_assigned`. Query seats by `company_id` instead of `program_id`.

**Step 2: Commit**

```bash
git add src/app/api/v1/employer/dashboard/route.ts
git commit -m "feat: dashboard API uses account-level seat data"
```

---

### Task 8: Seat Purchase Page (Frontend)

**Files:**
- Create: `src/app/employer/purchase/page.tsx`

**Step 1: Build the purchase page**

Full-page purchase flow with:
- Headline: "Purchase seats"
- Subtext about minimum 10, 90 days access
- Seat quantity input (number, min 10)
- Live pricing calculator showing per-seat price + total
- Pricing tier reference table
- "Purchase seats" CTA button
- Success state: "You're ready to launch. You have X available seats." with "Invite employees" CTA
- Uses `calculateTotal` from `src/lib/pricing.ts`
- Calls POST `/api/v1/employer/seats/purchase`

**Step 2: Commit**

```bash
git add src/app/employer/purchase/page.tsx
git commit -m "feat: seat purchase page with live pricing calculator"
```

---

### Task 9: Update Setup Page Redirect

**Files:**
- Modify: `src/app/employer/setup/page.tsx`

**Step 1: Change redirect from `/employer/program` to `/employer/purchase`**

Line 233: Change `router.push("/employer/program")` to `router.push("/employer/purchase")`.

Remove `default_program_duration_days` field from the form (no longer relevant — always 90 days).

**Step 2: Commit**

```bash
git add src/app/employer/setup/page.tsx
git commit -m "feat: setup redirects to seat purchase, remove duration field"
```

---

### Task 10: Programs List Page (Frontend)

**Files:**
- Create: `src/app/employer/programs/page.tsx`
- Delete or redirect: `src/app/employer/program/page.tsx`

**Step 1: Build programs list page**

At `/employer/programs`:
- List of all programs (name, employee count, created date)
- "Create program" button opens inline form
- Program form: name (required), custom intro message (optional), branded toggle
- Each program card has "Edit" and view employee count
- Empty state: "No programs yet. Programs help you organize employees by cohort or event."

**Step 2: Commit**

```bash
git add src/app/employer/programs/page.tsx
git commit -m "feat: programs list page with create/edit"
```

---

### Task 11: Billing Page (Frontend)

**Files:**
- Create: `src/app/employer/billing/page.tsx`

**Step 1: Build billing page**

At `/employer/billing`:
- Seat balance cards: Available / Assigned / Total purchased
- "Buy more seats" button → navigates to `/employer/purchase`
- Purchase history table: date, seats, price/seat, total, payment method
- Fetches from GET `/api/v1/employer/seats` and GET `/api/v1/employer/seats/history`

**Step 2: Commit**

```bash
git add src/app/employer/billing/page.tsx
git commit -m "feat: billing page with seat balance and purchase history"
```

---

### Task 12: Update Invite Page (Frontend)

**Files:**
- Modify: `src/app/employer/invite/page.tsx`

**Step 1: Update invite page**

Key changes:
- Add seat balance summary at top (fetched from `/api/v1/employer/seats`)
- Add employee status table showing all invited people
- Program assignment becomes optional dropdown (fetched from `/api/v1/employer/program` GET)
- Remove hard dependency on `program.id` for sending invites
- Show "No available seats" warning with link to billing when seats are exhausted

**Step 2: Commit**

```bash
git add src/app/employer/invite/page.tsx
git commit -m "feat: invite page with seat balance, optional program assignment"
```

---

### Task 13: Update Sidebar + Middleware

**Files:**
- Modify: `src/components/layout/employer-sidebar.tsx`
- Verify: `src/middleware.ts` handles new routes

**Step 1: Update sidebar navigation**

```typescript
const EMPLOYER_NAV_ITEMS = [
  { label: "Overview", href: "/employer/dashboard", Icon: LayoutDashboard },
  { label: "Invitations", href: "/employer/invite", Icon: Users },
  { label: "Programs", href: "/employer/programs", Icon: Settings },
  { label: "Reporting", href: "/employer/outcomes", Icon: BarChart3 },
  { label: "Billing", href: "/employer/billing", Icon: CreditCard },
] as const;
```

**Step 2: Verify middleware routes**

Check `src/middleware.ts` to ensure `/employer/purchase`, `/employer/programs`, `/employer/billing` are handled by auth middleware.

**Step 3: Commit**

```bash
git add src/components/layout/employer-sidebar.tsx
git commit -m "feat: update sidebar — Invitations, Programs (plural), Billing"
```

---

### Task 14: Build, Deploy, Verify

**Step 1: Run build**

```bash
npm run build
```

Fix any TypeScript or build errors.

**Step 2: Deploy to Vercel**

```bash
vercel --prod --token $VERCEL_TOKEN
```

**Step 3: End-to-end verification**

Test the full employer flow:
1. Sign up as employer
2. Complete company setup
3. Purchase seats (verify pricing calculator, verify seats credited)
4. Create a program
5. Invite an employee (with and without program assignment)
6. Check billing page (purchase history shows)
7. Buy more seats from billing
8. Check dashboard (metrics use account-level seats)

**Step 4: Commit any fixes and push**

```bash
git push origin master
```

---

Plan complete and saved to `docs/plans/2026-03-16-employer-seat-model-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?