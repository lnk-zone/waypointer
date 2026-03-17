# Lifecycle Automation, Nudges & Recovery Flows — Design Document

**Date:** 2026-03-17
**Status:** Approved

---

## Purpose

Waypointer has the features. The problem now is getting people to use them deeply enough to create outcomes. This system makes Waypointer act as a background transition coach: detecting when someone stalls, sending the right prompt, and pulling them back into the next best action.

---

## 1. State Engine

Every employee seat has a lifecycle state that determines what nudges, emails, and UI they see.

### States

| State | Entry condition | Exit condition |
|-------|----------------|----------------|
| `invited` | Seat created, invitation email sent | Employee activates account |
| `onboarding` | First login, profile creation starts | Completes onboarding (snapshot confirmed + paths selected) |
| `active` | Onboarding complete | 7 days with no activity -> `stalled` |
| `stalled` | 7 days no activity after being active | Any activity -> back to `active` |
| `grace_period` | Day 90 reached | Day 97 reached OR self-pay purchase |
| `expired` | Grace period ends without self-pay | Terminal (can be revived by self-pay) |
| `self_pay` | Purchases continuation during/after grace | 90 days from purchase date |
| `placed` | Reports landing a role | Terminal (positive) |

### Transition Model (Hybrid)

**Real-time transitions** (triggered by API routes on user action):
- `invited` -> `onboarding`: first login
- `onboarding` -> `active`: onboarding completed
- `stalled` -> `active`: any API request from a stalled user (zero friction)
- Any -> `self_pay`: self-pay purchase
- Any -> `placed`: offer reported

**Cron-based transitions** (batch processed every 4 hours):
- `active` -> `stalled`: 7 days no activity in `activity_log`
- `active`/`stalled` -> `grace_period`: `expires_at` <= now
- `grace_period` -> `expired`: `grace_expires_at` <= now

---

## 2. Event System

Events are logged to the existing `activity_log` table (extended with a `seat_id` column). Standardized event names:

| Event | Triggered by |
|-------|-------------|
| `invite_sent` | Invite API creates seat |
| `account_activated` | First login after invite |
| `onboarding_started` | Profile creation begins |
| `onboarding_completed` | Snapshot confirmed + paths selected |
| `resume_generated` | Any resume created |
| `linkedin_completed` | LinkedIn content generated |
| `job_saved` | User saves a job |
| `job_applied` | User marks applied |
| `application_kit_generated` | Cover letter / outreach for a job |
| `outreach_drafted` | Outreach message generated |
| `mock_interview_completed` | Interview session finished |
| `interview_reported` | User logs a real interview |
| `offer_reported` | User logs an offer |
| `weekly_plan_generated` | Plan created for the week |
| `confidence_checkin` | Weekly confidence score submitted |
| `self_pay_purchased` | Employee buys continuation |

No new table. Column addition (`seat_id`) to `activity_log` and standardized action names.

---

## 3. Email Templates (20 total)

### Activation Nudges (pre-login)

| Template | When | Subject |
|----------|------|---------|
| `activation_day1` | 24h after invite, still `invited` | "Your career transition support is ready" |
| `activation_day3` | 72h after invite, still `invited` | "Your personalized tools are waiting" |
| `activation_day7` | 7 days after invite, still `invited` | "One step to unlock your career support" |

After day 7: no more automated nudges. The door stays open if they come back on their own.

### Drop-off Recovery (logged in but stalled, 3+ days idle)

| Template | Stall point | Subject |
|----------|------------|---------|
| `dropoff_finish_onboarding` | Started onboarding, didn't complete | "Let's finish setting up your profile" |
| `dropoff_choose_paths` | Onboarded, no target roles | "What kind of roles interest you?" |
| `dropoff_generate_resume` | Paths selected, no resume | "Your tailored resume is one click away" |
| `dropoff_review_jobs` | Resume done, no jobs saved/viewed | "We found roles that match your experience" |
| `dropoff_practice_interview` | Jobs reviewed, no mock interview (5+ days) | "Practice makes confident -- try a mock interview" |

**Delivery rule:** In-app notification first (when they visit). Email only if 3+ days pass with no visit after stalling.

### Weekly Progress (active users)

| Template | When | Subject |
|----------|------|---------|
| `weekly_progress` | Every 7 days for `active`/`stalled` users | "Your week in review + what's next" |

### Milestones (instant, on achievement)

| Template | When | Subject |
|----------|------|---------|
| `milestone_first_resume` | First resume generated | "Your first tailored resume is ready" |
| `milestone_first_outreach` | First outreach drafted | "Your first outreach message is ready to send" |
| `milestone_first_interview` | First mock interview completed | "You crushed your first mock interview" |
| `milestone_interview_reported` | User logs a real interview | "Great news -- you have an interview lined up" |
| `milestone_offer_reported` | User logs an offer | "Congratulations on your offer!" |

Milestones are sent in real-time by the API route that handles the action (not by cron).

### End-of-Access (countdown)

| Template | When | Subject |
|----------|------|---------|
| `access_day75` | 15 days remaining | "You have 15 days left -- here's what to finish" |
| `access_day82` | 8 days remaining | "8 days left -- download your materials" |
| `access_day88` | 2 days remaining | "Your access ends in 2 days" |
| `access_grace_start` | Day 90, grace period begins | "Your full access has ended -- here's what you can still do" |
| `access_grace_end` | Day 95, 2 days before lockout | "Last chance: continue for $149 or download everything" |

### Email Priority Rule

**One email per day max.** If multiple triggers fire on the same day:
1. End-of-access (highest)
2. Milestone
3. Drop-off recovery
4. Weekly progress (lowest)

---

## 4. In-App Notifications

### Database: `notifications` table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | `gen_random_uuid()` |
| `employee_id` | UUID FK | References `employee_profiles(id)` |
| `seat_id` | UUID FK | References `seats(id)`, for pre-profile notifications |
| `type` | enum | `nudge`, `milestone`, `system`, `access_warning` |
| `title` | text | Short headline |
| `body` | text | 1-2 sentence description |
| `action_url` | text | Deep link (e.g., `/resumes`, `/jobs`) |
| `read` | boolean | Default false |
| `created_at` | timestamptz | When created |
| `updated_at` | timestamptz | When updated |

### Bell Icon (top nav)

- Badge shows unread count (max "9+")
- Dropdown shows last 10 notifications, most recent first
- "Mark all as read" link at top
- Each notification is clickable -> navigates to `action_url`
- Read notifications are visually dimmed

### Contextual Banner (per page)

- Max 1 per page
- Shows highest-priority unread notification relevant to that page
- Examples:
  - On `/jobs`: "You have 6 saved roles waiting for review"
  - On `/dashboard`: "You're one step away from finishing your LinkedIn update"
- Dismissible (marks as read), doesn't reappear
- Only `nudge` and `access_warning` types. Milestones go to bell only.

### Polling

No websockets. Bell polls on 60-second interval while tab is active. Notifications also load on page navigation.

### When Notifications Are Created

- Milestone events: instant, created by the API route handling the action
- Drop-off nudges: cron creates alongside emails
- Access warnings: cron creates alongside emails
- Weekly progress: cron creates alongside email

---

## 5. Self-Pay Continuation Flow

### Price

$149 for 3 months. One option. No tiers.

### When It Appears

- Banner on employee dashboard starting at day 75
- CTA in `access_grace_start` and `access_grace_end` emails
- Full-page prompt when `grace_period` user tries to access an AI feature

### Page: `/continue`

- Headline: "Continue your career transition support"
- Summary of accomplishments (resumes, jobs saved, interviews)
- What they keep: 90 more days of full access
- Simulated payment (Stripe placeholder for now)
- On purchase: seat status -> `self_pay`, new `expires_at` = now + 90 days

### Database: `self_pay_purchases` table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | `gen_random_uuid()` |
| `seat_id` | UUID FK | References `seats(id)` |
| `employee_id` | UUID FK | References `employee_profiles(id)` |
| `amount_cents` | int | 14900 |
| `payment_method` | text | `simulated` (later `stripe`) |
| `stripe_payment_id` | text | Nullable |
| `created_at` | timestamptz | When purchased |
| `updated_at` | timestamptz | When updated |

### Grace Period Access Rules (day 90-97)

- Can log in
- Can view/download all created content (resumes, outreach, saved jobs, interview transcripts)
- Cannot generate new AI content, save new jobs, or practice interviews
- Persistent banner: "Your full access has ended. Continue for $149 ->"

### After Day 97 Without Self-Pay

- Status -> `expired`
- Login redirects to "Your access has ended" page with final self-pay CTA
- If they purchase after expiry: status -> `self_pay`, full access restored for 90 days

---

## 6. Cron Architecture

### Endpoint: `GET /api/v1/cron/lifecycle`

Replaces the current `email-triggers` cron. Runs every 4 hours. Node.js runtime.

### Jobs (processed sequentially, failures isolated)

**Job 1 -- Activation Nudges:**
- Seats where `status = 'invited'`
- Day 1: `invited_at` 24-72h ago, no `activation_day1` sent
- Day 3: `invited_at` 72h-7d ago, no `activation_day3` sent
- Day 7: `invited_at` 7d+ ago, no `activation_day7` sent

**Job 2 -- State Transitions:**
- `active` seats with no `activity_log` entry in 7+ days -> `stalled`
- Seats where `expires_at` <= now -> `grace_period`, set `grace_expires_at` = `expires_at` + 7 days
- Seats where `grace_expires_at` <= now AND `grace_period` -> `expired`

**Job 3 -- Drop-off Recovery:**
- Seats where status IN (`onboarding`, `active`, `stalled`), last activity 3+ days ago
- Determine furthest milestone from `activity_log`
- Send appropriate `dropoff_*` email if not sent in last 7 days
- Create in-app notification

**Job 4 -- Weekly Progress:**
- Seats where status IN (`active`, `stalled`), no `weekly_progress` email in 7 days
- Gather stats: jobs saved, resumes created, interviews this week
- Send email + create notification

**Job 5 -- Milestones:**
- Handled in real-time by API routes, not cron. Skipped.

**Job 6 -- Access Countdown:**
- Day 75: `expires_at` - now <= 15 days, no `access_day75` sent
- Day 82: <= 8 days remaining
- Day 88: <= 2 days remaining
- Grace start: status just changed to `grace_period`
- Grace day 95: `grace_expires_at` - now <= 2 days

### Limits

- Max 200 seats per job per run (overflow caught in next 4-hour cycle)
- Deduplication via `email_sends` table (template type + seat + time window)
- One email per day max per seat (priority: access > milestone > dropoff > weekly)

---

## 7. Schema Changes Summary

### Modified tables

- `seats`: add `grace_expires_at TIMESTAMPTZ` column
- `activity_log`: add `seat_id UUID` column (FK to seats, nullable for backward compat)

### New tables

- `notifications` (see Section 4)
- `self_pay_purchases` (see Section 5)

### Modified enums

- `seat_status`: add `onboarding`, `stalled`, `grace_period`, `self_pay` values
- `email_template_type`: expand from 4 to 20 values (see Section 3)
