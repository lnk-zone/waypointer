# Lifecycle Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Waypointer act as a background transition coach — detecting stalls, sending smart nudges, and pulling employees back into the next best action.

**Architecture:** Database migration expands seat states and email types, adds notifications + self_pay_purchases tables. A unified lifecycle cron replaces the old email-triggers cron. Real-time state transitions happen in a shared utility called from API routes. Event logging is a fire-and-forget utility added to existing routes. Notification bell + contextual banners are client components that poll a new notifications API.

**Tech Stack:** Next.js 14, Supabase (PostgreSQL), Resend email, jose JWT, Zod validation, Tailwind + shadcn/ui, Lucide icons.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260317000001_lifecycle_automation.sql`

**What:** Expand enums, add columns, create new tables, add RLS policies.

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Lifecycle Automation Migration
-- ============================================================

-- 1. Expand seat_status enum
ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'stalled';
ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'grace_period';
ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'self_pay';
ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'placed';

-- 2. Expand email_template_type enum (16 new values)
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'activation_day1';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'activation_day3';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'activation_day7';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'dropoff_finish_onboarding';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'dropoff_choose_paths';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'dropoff_generate_resume';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'dropoff_review_jobs';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'dropoff_practice_interview';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'weekly_progress';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'milestone_first_resume';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'milestone_first_outreach';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'milestone_first_interview';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'milestone_interview_reported';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'milestone_offer_reported';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'access_day75';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'access_day82';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'access_day88';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'access_grace_start';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'access_grace_end';

-- 3. Add grace_expires_at to seats
ALTER TABLE seats ADD COLUMN IF NOT EXISTS grace_expires_at TIMESTAMPTZ;

-- 4. Add seat_id to activity_log (nullable for backward compat)
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS seat_id UUID REFERENCES seats(id);
CREATE INDEX IF NOT EXISTS idx_activity_log_seat ON activity_log(seat_id);

-- 5. Create notification_type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('nudge', 'milestone', 'system', 'access_warning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_profiles(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_seat ON notifications(seat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(employee_id, read);

-- 7. Create self_pay_purchases table
CREATE TABLE IF NOT EXISTS self_pay_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL DEFAULT 14900,
  payment_method TEXT NOT NULL DEFAULT 'simulated',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_pay_seat ON self_pay_purchases(seat_id);

-- 8. RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employee_own_notifications') THEN
    CREATE POLICY employee_own_notifications ON notifications
      FOR ALL USING (
        employee_id IN (
          SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 9. RLS for self_pay_purchases
ALTER TABLE self_pay_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employee_own_self_pay') THEN
    CREATE POLICY employee_own_self_pay ON self_pay_purchases
      FOR ALL USING (
        employee_id IN (
          SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 10. Updated_at triggers
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_self_pay_purchases_updated_at
  BEFORE UPDATE ON self_pay_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Execute migration against production Supabase**

```bash
# Read the migration file content and execute via Supabase Management API
SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2 || echo "sbp_a71f845f717fd1cedc4c062dd9f89478730c5b26")
curl -s -X POST "https://api.supabase.com/v1/projects/dqneifiwmxvskmjhwubx/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat supabase/migrations/20260317000001_lifecycle_automation.sql | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
```

Expected: `[]` (empty array = success)

**Step 3: Commit**

```bash
git add supabase/migrations/20260317000001_lifecycle_automation.sql
git commit -m "feat: add lifecycle automation database migration

Expands seat_status enum (onboarding, stalled, grace_period, self_pay, placed),
email_template_type enum (16 new types), adds grace_expires_at to seats,
seat_id to activity_log, creates notifications and self_pay_purchases tables."
```

---

## Task 2: Event Logging Utility

**Files:**
- Create: `src/lib/events.ts`

**What:** A single function to log lifecycle events. Accepts optional `seatId` so events can be tracked before an employee profile exists.

**Step 1: Create the utility**

```typescript
/**
 * Lifecycle event logging utility.
 * Fire-and-forget — never blocks the calling route.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type LifecycleEvent =
  | "invite_sent"
  | "account_activated"
  | "onboarding_started"
  | "onboarding_completed"
  | "resume_generated"
  | "linkedin_completed"
  | "job_saved"
  | "job_applied"
  | "application_kit_generated"
  | "outreach_drafted"
  | "mock_interview_completed"
  | "interview_reported"
  | "offer_reported"
  | "weekly_plan_generated"
  | "confidence_checkin"
  | "self_pay_purchased";

interface LogEventParams {
  supabase: SupabaseClient;
  employeeId?: string;
  seatId?: string;
  action: LifecycleEvent;
  metadata?: Record<string, unknown>;
}

export function logEvent(params: LogEventParams): void {
  const { supabase, employeeId, seatId, action, metadata } = params;

  Promise.resolve(
    supabase.from("activity_log").insert({
      ...(employeeId && { employee_id: employeeId }),
      ...(seatId && { seat_id: seatId }),
      action,
      metadata: metadata ?? {},
    })
  ).catch(() => {
    // Fire-and-forget — event logging failure is never fatal
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/events.ts
git commit -m "feat: add lifecycle event logging utility"
```

---

## Task 3: State Engine Utility

**Files:**
- Create: `src/lib/lifecycle/state-engine.ts`

**What:** Functions for real-time state transitions. Called by API routes and middleware.

**Step 1: Create the state engine**

```typescript
/**
 * Real-time state transition engine.
 *
 * Handles transitions that should happen immediately on user action:
 * - stalled -> active (any API request)
 * - invited -> onboarding (first login)
 * - onboarding -> active (onboarding complete)
 * - any -> self_pay (purchase)
 * - any -> placed (offer reported)
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reactivate a stalled seat. Called on any employee API request
 * where seat status is 'stalled'. Zero friction — just flips the status.
 */
export async function reactivateIfStalled(
  supabase: SupabaseClient,
  seatId: string,
  currentStatus: string
): Promise<void> {
  if (currentStatus !== "stalled") return;

  await supabase
    .from("seats")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", seatId)
    .eq("status", "stalled");
}

/**
 * Transition seat to onboarding status on first login.
 */
export async function transitionToOnboarding(
  supabase: SupabaseClient,
  seatId: string
): Promise<void> {
  await supabase
    .from("seats")
    .update({ status: "onboarding", updated_at: new Date().toISOString() })
    .eq("id", seatId)
    .in("status", ["invited", "activated"]);
}

/**
 * Transition seat to active when onboarding is complete.
 */
export async function transitionToActive(
  supabase: SupabaseClient,
  seatId: string
): Promise<void> {
  await supabase
    .from("seats")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", seatId)
    .eq("status", "onboarding");
}

/**
 * Transition seat to placed when user reports an offer.
 */
export async function transitionToPlaced(
  supabase: SupabaseClient,
  seatId: string
): Promise<void> {
  await supabase
    .from("seats")
    .update({ status: "placed", updated_at: new Date().toISOString() })
    .eq("id", seatId);
}

/**
 * Check if a seat is in grace period or expired (read-only access).
 * Returns true if the user should be blocked from AI features.
 */
export function isReadOnly(status: string): boolean {
  return status === "grace_period" || status === "expired";
}
```

**Step 2: Commit**

```bash
git add src/lib/lifecycle/state-engine.ts
git commit -m "feat: add real-time state transition engine"
```

---

## Task 4: Wire State Transitions Into Auth Middleware

**Files:**
- Modify: `src/lib/api/auth-middleware.ts`

**What:** When an employee makes any API request and their seat is `stalled`, automatically flip them back to `active`. Also support `grace_period` and `self_pay` statuses (currently only `expired` is rejected).

**Step 1: Update authenticateRequest**

In `src/lib/api/auth-middleware.ts`, find the section that checks seat status (around line 66-98 where employee_profiles is queried).

Add imports at top:
```typescript
import { reactivateIfStalled, isReadOnly } from "@/lib/lifecycle/state-engine";
```

After the existing seat expiry check, add:
```typescript
// Auto-reactivate stalled seats on any API request
if (seatData.status === "stalled") {
  reactivateIfStalled(supabase, seatData.id, seatData.status);
  // Don't await — fire and forget, let the request proceed
}
```

Update the status check to allow `onboarding`, `stalled`, `grace_period`, and `self_pay`:
```typescript
// Block only fully expired seats
const blockedStatuses = ["expired"];
if (blockedStatuses.includes(seatData.status)) {
  return apiError(ERROR_CODES.SEAT_EXPIRED, "Your access has ended.");
}
```

Add `seatStatus` and `seatId` to the returned AuthContext so downstream routes can check grace_period:
```typescript
// In the AuthContext interface, add:
seatId?: string;
seatStatus?: string;

// In the return statement for employees:
return {
  user: auth.user,
  role: "employee",
  employeeId: employee.id,
  seatId: seatData.id,
  seatStatus: seatData.status,
};
```

**Step 2: Commit**

```bash
git add src/lib/api/auth-middleware.ts
git commit -m "feat: wire state transitions into auth middleware

Auto-reactivates stalled seats on API request. Adds seatId and seatStatus
to AuthContext for downstream grace period checks."
```

---

## Task 5: Instrument Existing API Routes With Event Logging

**Files:**
- Modify: `src/app/api/v1/employer/invite/route.ts` — add `invite_sent` event
- Modify: `src/app/api/v1/employee/activate/route.ts` — add `account_activated` event
- Modify: `src/app/api/v1/employee/snapshot/extract/route.ts` — add `onboarding_started` event
- Modify: `src/app/api/v1/employee/snapshot/confirm/route.ts` — add `onboarding_completed` + transition to active
- Modify: `src/app/api/v1/employee/resume/generate/route.ts` — add `resume_generated` event
- Modify: `src/app/api/v1/employee/linkedin/generate/route.ts` — add `linkedin_completed` event
- Modify: `src/app/api/v1/employee/jobs/[id]/track/route.ts` — add `job_saved` / `job_applied` events
- Modify: `src/app/api/v1/employee/jobs/[id]/kit/route.ts` — add `application_kit_generated` event
- Modify: `src/app/api/v1/employee/outreach/generate/route.ts` — add `outreach_drafted` event
- Modify: `src/app/api/v1/employee/interviews/session/[id]/complete/route.ts` — add `mock_interview_completed` event
- Modify: `src/app/api/v1/employee/plan/weekly/generate/route.ts` — add `weekly_plan_generated` event

**What:** Add `logEvent()` calls to existing API routes. Each is a one-line fire-and-forget call right after the successful action.

**Pattern for each route:**

1. Add import at top: `import { logEvent } from "@/lib/events";`
2. After the successful database operation, add:

```typescript
logEvent({
  supabase,
  employeeId: auth.employeeId,
  seatId: auth.seatId,
  action: "resume_generated", // or whatever event
  metadata: { /* relevant context */ },
});
```

**Special cases:**

- `invite/route.ts`: Log `invite_sent` for each seat created. Use `seatId` only (no `employeeId` yet).
- `activate/route.ts`: Log `account_activated` with the new `employeeId` and `seatId`. Also call `transitionToOnboarding()` from state engine.
- `snapshot/confirm/route.ts`: Log `onboarding_completed`. Call `transitionToActive()` from state engine.
- `jobs/[id]/track/route.ts`: Check the action type — log `job_saved` for save actions, `job_applied` for apply actions.

**Step 1: Add events to all routes listed above**

Each file gets 2-3 lines added. No structural changes.

**Step 2: Commit**

```bash
git add src/app/api/v1/employer/invite/route.ts \
  src/app/api/v1/employee/activate/route.ts \
  src/app/api/v1/employee/snapshot/extract/route.ts \
  src/app/api/v1/employee/snapshot/confirm/route.ts \
  src/app/api/v1/employee/resume/generate/route.ts \
  src/app/api/v1/employee/linkedin/generate/route.ts \
  src/app/api/v1/employee/jobs/*/track/route.ts \
  src/app/api/v1/employee/jobs/*/kit/route.ts \
  src/app/api/v1/employee/outreach/generate/route.ts \
  src/app/api/v1/employee/interviews/session/*/complete/route.ts \
  src/app/api/v1/employee/plan/weekly/generate/route.ts
git commit -m "feat: instrument API routes with lifecycle event logging

Adds logEvent() calls to 11 API routes tracking invite_sent, account_activated,
onboarding_started, onboarding_completed, resume_generated, linkedin_completed,
job_saved, job_applied, application_kit_generated, outreach_drafted,
mock_interview_completed, and weekly_plan_generated events."
```

---

## Task 6: Expand Email Templates (20 total)

**Files:**
- Modify: `src/lib/email/templates.ts`

**What:** Expand `EmailTemplateType` from 4 to 20 types. Add `EmailTemplateData` fields for new templates. Add rendering functions for all 16 new templates.

**Step 1: Update the type**

Replace the `EmailTemplateType` with:
```typescript
export type EmailTemplateType =
  // Existing
  | "invitation"
  | "reengagement_72h"
  | "weekly_nudge"
  | "thirty_day_checkin"
  // Activation nudges
  | "activation_day1"
  | "activation_day3"
  | "activation_day7"
  // Drop-off recovery
  | "dropoff_finish_onboarding"
  | "dropoff_choose_paths"
  | "dropoff_generate_resume"
  | "dropoff_review_jobs"
  | "dropoff_practice_interview"
  // Weekly progress
  | "weekly_progress"
  // Milestones
  | "milestone_first_resume"
  | "milestone_first_outreach"
  | "milestone_first_interview"
  | "milestone_interview_reported"
  | "milestone_offer_reported"
  // End-of-access
  | "access_day75"
  | "access_day82"
  | "access_day88"
  | "access_grace_start"
  | "access_grace_end";
```

**Step 2: Update EmailTemplateData**

Add fields needed by new templates:
```typescript
export interface EmailTemplateData {
  // Existing fields stay
  recipientName: string;
  companyName: string;
  companyLogoUrl?: string | null;
  customMessage?: string | null;
  activationLink?: string;
  loginLink?: string;
  unsubscribeLink: string;
  trackingPixelUrl?: string;
  clickTrackBaseUrl?: string;
  emailSendId?: string;
  jobMatchCount?: number;
  progressSummary?: string;
  daysSinceActivation?: number;
  // New fields
  daysRemaining?: number;
  resumeCount?: number;
  jobsSavedCount?: number;
  interviewCount?: number;
  outreachCount?: number;
  continueLink?: string;  // self-pay link
  downloadLink?: string;  // export materials link
  nextAction?: string;    // "Choose target roles", "Generate your first resume", etc.
  nextActionUrl?: string; // deep link to the next action
}
```

**Step 3: Add render functions for each new template**

Each template follows the same HTML structure as existing ones (header, body, CTA button, footer). The key differences are:

- **Activation day 1/3/7:** Same structure as `reengagement_72h` but with different copy. CTA: activation link.
- **Dropoff templates:** Each has a specific `nextAction` and `nextActionUrl`. CTA: login link with deep link.
- **Weekly progress:** Shows stats (resumes, jobs, interviews this week). CTA: login link to dashboard.
- **Milestone templates:** Celebratory tone. Short. CTA: login link to relevant page.
- **Access countdown:** Shows days remaining, progress summary, CTA varies (day 75/82 = "Finish key tasks", day 88 = "Download materials", grace = "Continue for $149").

All templates:
- Use "career transition" and "next step" language (never "layoff" or "termination")
- Include tracking pixel and click tracking
- Include unsubscribe link
- Show company branding if available

**Step 4: Update renderEmailTemplate switch**

Add cases for all 20 template types in the main render function.

**Step 5: Commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat: expand email templates from 4 to 20

Adds activation nudges (day 1/3/7), drop-off recovery (5 stall points),
weekly progress, milestones (5 achievements), and end-of-access countdown
(5 stages including grace period)."
```

---

## Task 7: Notifications API

**Files:**
- Create: `src/app/api/v1/employee/notifications/route.ts`
- Create: `src/app/api/v1/employee/notifications/read/route.ts`
- Create: `src/app/api/v1/employee/notifications/read-all/route.ts`
- Create: `src/lib/lifecycle/notify.ts`

**What:** API for listing notifications, marking as read, marking all as read. Plus a server-side utility to create notifications.

**Step 1: Create the notify utility**

`src/lib/lifecycle/notify.ts`:
```typescript
/**
 * Create in-app notifications. Fire-and-forget.
 */

import { SupabaseClient } from "@supabase/supabase-js";

type NotificationType = "nudge" | "milestone" | "system" | "access_warning";

interface CreateNotificationParams {
  supabase: SupabaseClient;
  employeeId?: string;
  seatId?: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
}

export function createNotification(params: CreateNotificationParams): void {
  const { supabase, employeeId, seatId, type, title, body, actionUrl } = params;

  Promise.resolve(
    supabase.from("notifications").insert({
      ...(employeeId && { employee_id: employeeId }),
      ...(seatId && { seat_id: seatId }),
      type,
      title,
      body,
      action_url: actionUrl,
    })
  ).catch(() => {});
}
```

**Step 2: Create GET /api/v1/employee/notifications**

Returns last 20 notifications for the authenticated employee. Supports `?unread_only=true` query param. Returns unread count in response.

```typescript
// Response shape:
{
  data: {
    notifications: Array<{
      id: string;
      type: "nudge" | "milestone" | "system" | "access_warning";
      title: string;
      body: string;
      action_url: string | null;
      read: boolean;
      created_at: string;
    }>;
    unread_count: number;
  }
}
```

**Step 3: Create POST /api/v1/employee/notifications/read**

Accepts `{ notification_id: string }`. Marks single notification as read.

**Step 4: Create POST /api/v1/employee/notifications/read-all**

Marks all notifications as read for the authenticated employee.

**Step 5: Commit**

```bash
git add src/lib/lifecycle/notify.ts \
  src/app/api/v1/employee/notifications/route.ts \
  src/app/api/v1/employee/notifications/read/route.ts \
  src/app/api/v1/employee/notifications/read-all/route.ts
git commit -m "feat: add notifications API and create utility

GET /notifications returns last 20 with unread count.
POST /notifications/read marks one as read.
POST /notifications/read-all marks all as read.
createNotification() utility for server-side notification creation."
```

---

## Task 8: Milestone Triggers in API Routes

**Files:**
- Modify: `src/app/api/v1/employee/resume/generate/route.ts`
- Modify: `src/app/api/v1/employee/outreach/generate/route.ts`
- Modify: `src/app/api/v1/employee/interviews/session/[id]/complete/route.ts`
- Modify: `src/app/api/v1/employee/progress/route.ts` (or wherever interview/offer reporting lives)

**What:** When a user hits a milestone for the first time, create an in-app notification and send a milestone email.

**Pattern for each:**

1. After successful action, check if this is the first time (query count of previous events)
2. If first time: call `createNotification()` + call `sendTrackedEmail()` with milestone template
3. If not first time: skip (already celebrated)

**Example for first resume:**

```typescript
// After resume is created successfully:
const { count } = await supabase
  .from("activity_log")
  .select("id", { count: "exact", head: true })
  .eq("employee_id", auth.employeeId)
  .eq("action", "resume_generated");

if (count === 1) {
  // This is the first resume — celebrate!
  createNotification({
    supabase,
    employeeId: auth.employeeId,
    seatId: auth.seatId,
    type: "milestone",
    title: "Your first tailored resume is ready!",
    body: "You've completed a major step in your career transition.",
    actionUrl: "/resumes",
  });

  // Send milestone email (fetch seat email first)
  const { data: seat } = await supabase
    .from("seats")
    .select("employee_email, employee_name, company_id")
    .eq("id", auth.seatId)
    .single();

  if (seat) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", seat.company_id)
      .single();

    sendTrackedEmail({
      supabase,
      seatId: auth.seatId!,
      recipientEmail: seat.employee_email,
      templateType: "milestone_first_resume",
      templateData: {
        recipientName: seat.employee_name || "there",
        companyName: company?.name || "Your Company",
        unsubscribeLink: `${baseUrl}/unsubscribe?seat=${auth.seatId}`,
        loginLink: `${baseUrl}/resumes`,
      },
    }).catch(() => {});
  }
}
```

Apply same pattern for:
- `milestone_first_outreach` — first outreach message generated
- `milestone_first_interview` — first mock interview completed
- `milestone_interview_reported` — first real interview reported
- `milestone_offer_reported` — first offer reported (also triggers `transitionToPlaced()`)

**Step 1: Add milestone checks to all 5 routes**

**Step 2: Commit**

```bash
git add src/app/api/v1/employee/resume/generate/route.ts \
  src/app/api/v1/employee/outreach/generate/route.ts \
  src/app/api/v1/employee/interviews/session/*/complete/route.ts \
  src/app/api/v1/employee/progress/route.ts
git commit -m "feat: add real-time milestone triggers

Sends celebration email + in-app notification on first resume, first outreach,
first mock interview, first real interview reported, and first offer reported."
```

---

## Task 9: Lifecycle Cron Endpoint

**Files:**
- Create: `src/app/api/v1/cron/lifecycle/route.ts`
- Create: `src/lib/lifecycle/cron-jobs.ts`

**What:** Unified cron that replaces the old `email-triggers` cron. Runs 6 jobs: activation nudges, state transitions, drop-off recovery, weekly progress, milestones (skip), access countdown.

**Step 1: Create cron job functions**

`src/lib/lifecycle/cron-jobs.ts` — contains the 6 job functions:

```typescript
export async function processActivationNudges(supabase, baseUrl): Promise<JobResult>
export async function processStateTransitions(supabase): Promise<JobResult>
export async function processDropoffRecovery(supabase, baseUrl): Promise<JobResult>
export async function processWeeklyProgress(supabase, baseUrl): Promise<JobResult>
export async function processAccessCountdown(supabase, baseUrl): Promise<JobResult>
```

Each function:
- Queries relevant seats (max 200 per batch)
- Checks deduplication via `hasRecentEmail()`
- Checks one-email-per-day rule (query `email_sends` for seat within last 24h, skip if any found with higher priority)
- Sends email via `sendTrackedEmail()`
- Creates in-app notification via `createNotification()`
- Returns `{ sent, skipped, failed, errors[] }`

**Key logic per job:**

**Job 1 — Activation Nudges:**
```sql
SELECT s.* FROM seats s
WHERE s.status = 'invited'
AND s.created_at <= NOW() - INTERVAL '24 hours'
LIMIT 200
```
Then check each: if 24-72h → `activation_day1`, if 72h-7d → `activation_day3`, if 7d+ → `activation_day7`.

**Job 2 — State Transitions:**
```sql
-- Active -> Stalled (no activity in 7 days)
UPDATE seats SET status = 'stalled'
WHERE status = 'active'
AND id NOT IN (
  SELECT DISTINCT seat_id FROM activity_log
  WHERE created_at > NOW() - INTERVAL '7 days'
  AND seat_id IS NOT NULL
);

-- Active/Stalled -> Grace Period
UPDATE seats SET status = 'grace_period',
  grace_expires_at = expires_at + INTERVAL '7 days'
WHERE status IN ('active', 'stalled', 'onboarding')
AND expires_at IS NOT NULL AND expires_at <= NOW();

-- Grace Period -> Expired
UPDATE seats SET status = 'expired'
WHERE status = 'grace_period'
AND grace_expires_at IS NOT NULL AND grace_expires_at <= NOW();
```

**Job 3 — Drop-off Recovery:**
Query seats in `onboarding`, `active`, `stalled` with last activity 3+ days ago. For each seat, determine the furthest milestone from `activity_log`:
1. No `onboarding_completed` → `dropoff_finish_onboarding`
2. No paths selected (no `onboarding_completed` with paths) → `dropoff_choose_paths`
3. No `resume_generated` → `dropoff_generate_resume`
4. No `job_saved` → `dropoff_review_jobs`
5. No `mock_interview_completed` (5+ days idle) → `dropoff_practice_interview`

Send appropriate email if not sent in last 7 days.

**Job 4 — Weekly Progress:**
Query active/stalled seats with no `weekly_progress` email in 7 days. Gather stats per seat, send email + notification.

**Job 6 — Access Countdown:**
Query seats by days remaining. For each threshold (75, 82, 88 days), check if template already sent. For grace start/end, check status change timing.

**Step 2: Create the cron route**

`src/app/api/v1/cron/lifecycle/route.ts`:
- Node.js runtime
- Auth via `CRON_SECRET` bearer token
- Calls all 5 active job functions sequentially
- Returns aggregated results
- Isolates failures (one job failing doesn't stop others)

**Step 3: Commit**

```bash
git add src/lib/lifecycle/cron-jobs.ts \
  src/app/api/v1/cron/lifecycle/route.ts
git commit -m "feat: add unified lifecycle cron endpoint

Replaces email-triggers cron with lifecycle cron running 5 jobs:
activation nudges (day 1/3/7), state transitions (active->stalled,
grace period, expired), drop-off recovery, weekly progress, and
access countdown. Max 200 seats per job per run."
```

---

## Task 10: Notification Bell Component

**Files:**
- Create: `src/components/notifications/notification-bell.tsx`
- Modify: `src/components/layout/sidebar.tsx` — add bell to employee nav

**What:** Bell icon in top of sidebar with unread badge. Dropdown with last 10 notifications.

**Step 1: Create NotificationBell component**

```typescript
"use client";

// Bell icon with unread badge count
// Dropdown panel showing last 10 notifications
// 60-second polling interval while tab is active
// "Mark all as read" link
// Each notification clickable → navigates to action_url
// Read notifications dimmed (opacity-60)
// Uses: GET /api/v1/employee/notifications
//       POST /api/v1/employee/notifications/read
//       POST /api/v1/employee/notifications/read-all
```

**Design specs:**
- Bell icon: `Bell` from lucide-react, 20x20px
- Badge: red circle, 16x16px, white text, positioned top-right of bell
- Shows count number (max "9+")
- Dropdown: 320px wide, max-h-96, overflow-y-auto
- Each notification: flex row with colored left border (blue for nudge, green for milestone, yellow for access_warning, gray for system)
- Title: text-sm font-medium
- Body: text-xs text-gray-500
- Time: text-xs text-gray-400, relative ("2h ago")
- Transition: 200ms ease-out for dropdown open/close

**Step 2: Add bell to employee sidebar**

In `src/components/layout/sidebar.tsx`, add `<NotificationBell />` above the nav items, between the logo and the first nav link.

**Step 3: Commit**

```bash
git add src/components/notifications/notification-bell.tsx \
  src/components/layout/sidebar.tsx
git commit -m "feat: add notification bell with dropdown to employee sidebar

Polls every 60s for unread count. Shows last 10 notifications in dropdown.
Mark individual or all as read. Color-coded by type."
```

---

## Task 11: Contextual Banner Component

**Files:**
- Create: `src/components/notifications/contextual-banner.tsx`
- Modify: Employee page components that should show banners (dashboard, jobs, resumes, interviews, outreach, linkedin, progress)

**What:** A banner at the top of relevant pages showing the highest-priority unread nudge or access warning for that page.

**Step 1: Create ContextualBanner component**

```typescript
"use client";

// Props: pageUrl (string) — the current page path
// Fetches unread notifications where action_url starts with pageUrl
// Shows the highest-priority one (access_warning > nudge)
// Dismissible — marks as read on dismiss
// Only shows types: nudge, access_warning
// Max 1 per page
// Styling: rounded-lg, p-4, left colored border, dismiss X button
// Yellow bg for access_warning, blue bg for nudge
```

**Step 2: Add to employee pages**

Add `<ContextualBanner pageUrl="/jobs" />` to each page component. The banner appears above the main content but below the page header.

Pages to add banners to:
- `/dashboard` (employee) — `pageUrl="/dashboard"`
- `/resumes` — `pageUrl="/resumes"`
- `/jobs` — `pageUrl="/jobs"`
- `/interviews` — `pageUrl="/interviews"`
- `/outreach` — `pageUrl="/outreach"`
- `/linkedin` — `pageUrl="/linkedin"`
- `/progress` — `pageUrl="/progress"`

**Step 3: Commit**

```bash
git add src/components/notifications/contextual-banner.tsx \
  src/app/dashboard/page.tsx \
  src/app/resumes/page.tsx \
  src/app/jobs/page.tsx \
  src/app/interviews/page.tsx \
  src/app/outreach/page.tsx \
  src/app/linkedin/page.tsx \
  src/app/progress/page.tsx
git commit -m "feat: add contextual banner component to employee pages

Shows highest-priority unread nudge or access warning per page.
Dismissible, max 1 per page. Added to all 7 employee pages."
```

---

## Task 12: Self-Pay Purchase API

**Files:**
- Create: `src/app/api/v1/employee/continue/route.ts`
- Create: `src/app/api/v1/employee/continue/status/route.ts`

**What:** POST to purchase continuation ($149/3mo, simulated). GET to check current access status and stats.

**Step 1: Create GET /api/v1/employee/continue/status**

Returns:
```typescript
{
  data: {
    seat_status: string;
    expires_at: string | null;
    grace_expires_at: string | null;
    days_remaining: number;
    can_purchase: boolean; // true if grace_period or expired
    stats: {
      resumes_created: number;
      jobs_saved: number;
      interviews_completed: number;
      outreach_sent: number;
    }
  }
}
```

**Step 2: Create POST /api/v1/employee/continue**

Accepts: `{ payment_method: "simulated" }` (later Stripe token)

Logic:
1. Verify seat is in `grace_period` or `expired`
2. Create `self_pay_purchases` record (amount_cents: 14900)
3. Update seat: `status = 'self_pay'`, `expires_at = NOW() + 90 days`, `grace_expires_at = NULL`
4. Log `self_pay_purchased` event
5. Create milestone notification
6. Return updated access info

**Step 3: Commit**

```bash
git add src/app/api/v1/employee/continue/route.ts \
  src/app/api/v1/employee/continue/status/route.ts
git commit -m "feat: add self-pay continuation API

GET /continue/status returns access info and stats.
POST /continue processes $149 purchase (simulated), extends access 90 days."
```

---

## Task 13: Self-Pay Continue Page (Frontend)

**Files:**
- Create: `src/app/continue/page.tsx`

**What:** The `/continue` page where grace_period or expired users can purchase 90 more days.

**Design:**
- Centered card layout (max-w-lg)
- Headline: "Continue your career transition support"
- Stats summary: what they've accomplished (from GET /continue/status)
- What they keep: bullet list of features
- Price: $149 for 3 months, displayed prominently
- "Continue my access" button (primary, full width)
- Processing state with skeleton
- Success state: "You're back! Redirecting to dashboard..." → redirect
- If seat is NOT in grace_period or expired: redirect to dashboard

**Step 1: Build the page**

**Step 2: Commit**

```bash
git add src/app/continue/page.tsx
git commit -m "feat: add self-pay continuation page

Shows accomplishments, price ($149/3mo), simulated purchase.
Redirects non-eligible users to dashboard."
```

---

## Task 14: Grace Period Access Gates

**Files:**
- Modify: `src/app/api/v1/employee/resume/generate/route.ts`
- Modify: `src/app/api/v1/employee/linkedin/generate/route.ts`
- Modify: `src/app/api/v1/employee/jobs/match/route.ts`
- Modify: `src/app/api/v1/employee/jobs/[id]/kit/route.ts`
- Modify: `src/app/api/v1/employee/outreach/generate/route.ts`
- Modify: `src/app/api/v1/employee/interviews/session/start/route.ts`
- Modify: `src/app/api/v1/employee/plan/weekly/generate/route.ts`
- Create: `src/lib/lifecycle/access-gate.ts`

**What:** Block AI generation features for grace_period users. Read-only access (viewing, downloading) stays open.

**Step 1: Create access gate utility**

`src/lib/lifecycle/access-gate.ts`:
```typescript
import { NextResponse } from "next/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

/**
 * Returns an error response if the user's seat is in grace period.
 * Call at the top of any AI generation route.
 * Returns null if access is allowed.
 */
export function checkGenerationAccess(seatStatus?: string): NextResponse | null {
  if (seatStatus === "grace_period") {
    return apiError(
      ERROR_CODES.FORBIDDEN,
      "Your full access has ended. Continue for $149 to unlock all features.",
      { redirect: "/continue" }
    );
  }
  return null;
}
```

**Step 2: Add gate to all AI generation routes**

At the top of each route handler, after auth:
```typescript
const gate = checkGenerationAccess(auth.seatStatus);
if (gate) return gate;
```

Routes to gate (all POST routes that generate AI content):
- `resume/generate`
- `linkedin/generate`
- `jobs/match`
- `jobs/[id]/kit`
- `outreach/generate`
- `interviews/session/start`
- `plan/weekly/generate`

Routes that stay open (read-only, no AI):
- `resume/[id]` GET, `resume/[id]/download` GET
- `resumes` GET
- `jobs` GET
- `outreach` GET
- `linkedin` GET
- `profile` GET
- `progress` GET
- `notifications` GET

**Step 3: Commit**

```bash
git add src/lib/lifecycle/access-gate.ts \
  src/app/api/v1/employee/resume/generate/route.ts \
  src/app/api/v1/employee/linkedin/generate/route.ts \
  src/app/api/v1/employee/jobs/match/route.ts \
  src/app/api/v1/employee/jobs/*/kit/route.ts \
  src/app/api/v1/employee/outreach/generate/route.ts \
  src/app/api/v1/employee/interviews/session/start/route.ts \
  src/app/api/v1/employee/plan/weekly/generate/route.ts
git commit -m "feat: add grace period access gates to AI generation routes

Blocks resume/linkedin/outreach/interview/plan generation for grace_period
users with redirect to /continue. Read-only access stays open."
```

---

## Task 15: Grace Period Banner on Employee Pages

**Files:**
- Create: `src/components/notifications/access-banner.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**What:** Persistent banner for grace_period users across all employee pages. Shows "Your full access has ended. Continue for $149 →"

**Step 1: Create AccessBanner component**

```typescript
"use client";

// Fetches seat status from a lightweight endpoint or uses context
// Shows persistent yellow/amber banner at top of content area
// Not dismissible (persistent until they purchase or expire)
// CTA: "Continue for $149" → links to /continue
// Shows days remaining in grace period
// Only renders for grace_period status
```

**Step 2: Add to employee sidebar layout**

In `src/components/layout/sidebar.tsx`, render `<AccessBanner />` above the main content slot. It auto-hides if the user isn't in grace_period.

**Step 3: Commit**

```bash
git add src/components/notifications/access-banner.tsx \
  src/components/layout/sidebar.tsx
git commit -m "feat: add persistent access banner for grace period users

Shows 'Your full access has ended. Continue for $149' with days remaining.
Not dismissible. Links to /continue page."
```

---

## Task 16: Expired User Redirect

**Files:**
- Create: `src/app/expired/page.tsx`
- Modify: `src/middleware.ts`

**What:** When an expired user logs in, redirect to a dedicated expired page with self-pay CTA.

**Step 1: Create /expired page**

Simple page:
- Headline: "Your access has ended"
- Summary of what they accomplished
- "It's not too late — continue for $149" CTA → `/continue`
- "Download your materials" secondary CTA (if we have export)
- Clean, empathetic design

**Step 2: Update middleware**

In `src/middleware.ts`, after session refresh: if user is authenticated, check their seat status. If `expired`, redirect to `/expired` (unless they're already on `/expired`, `/continue`, or `/api/`).

**Step 3: Commit**

```bash
git add src/app/expired/page.tsx src/middleware.ts
git commit -m "feat: add expired user page and redirect

Redirects expired users to /expired with self-pay CTA.
Allows access to /continue for purchasing."
```

---

## Task 17: Build, Deploy, Verify

**Files:** None new

**Step 1: Build**

```bash
npm run build
```

Expected: Clean build, no errors.

**Step 2: Deploy**

```bash
VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d'=' -f2) && \
npx vercel --prod --token "$VERCEL_TOKEN" --scope shachias-projects
```

**Step 3: Verify key flows**

1. Send an invite → check that `invite_sent` event is logged in `activity_log`
2. Check notifications API returns empty array for new user
3. Check the lifecycle cron endpoint responds (with CRON_SECRET)
4. Check that the `/continue` page loads and shows stats
5. Verify the notification bell appears in employee sidebar

**Step 4: Final commit + push**

```bash
git push origin master
```
