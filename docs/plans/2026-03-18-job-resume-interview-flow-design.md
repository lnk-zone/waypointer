# Job → Resume → Interview Flow Redesign

**Date:** 2026-03-18
**Status:** Approved

---

## Problem

End-to-end testing revealed multiple UX gaps in the Jobs, Resume, and Interview flows:

- Job detail page doesn't load existing kits or application status on revisit
- Applied jobs still show "Apply Now" on the jobs list
- Job kit resume edits don't connect to the resume workspace
- Interview prep regenerates on every page visit (no persistence)
- Mock interview job selector excludes applied jobs
- Interview feedback 404s on early stop
- Readiness score only visible on dashboard
- Resume ATS score not labeled clearly (role vs job-specific)

## Design Decisions

### 1. Job Detail Page — Status-Aware Command Center

The job detail page loads all existing data on mount: job listing, application kit (`application_kits`), application status (`applications`), and related interview sessions (`interview_sessions` where `job_match_id` matches).

**Page states:**

| State | Display |
|-------|---------|
| New match | Job info + "Generate Application Kit" button |
| Kit generated | Job info + full kit + "Track as Applied" + "Start Mock Interview" link + mock interview feedback (if any) |
| Applied | "Applied on [date]" banner + full kit + resume match score + "Start Mock Interview" + mock interview feedback (if any) |
| Interviewing | "Interviewing" banner + full kit + resume match score + "Start Mock Interview" + mock interview feedback (if any) |

Mock interview feedback summaries appear whenever sessions exist for this job, regardless of application status.

**Resume match score:**
- Stored in `application_kits` as `resume_match_score`, `resume_match_projected`, `resume_match_date`
- Displayed as: "Resume match: 72% (as of March 17) → 89% projected if you apply suggested edits"
- "Refresh" button recalculates on demand
- "Apply edits to resume" link navigates to resume workspace with suggestions queued

**Kit sections displayed:**
1. Resume edits (with match score)
2. Intro paragraph (copy button)
3. Recruiter message (copy button)
4. Hiring manager message (copy button)
5. Referral request (copy button)
6. Interview themes ("Start mock interview" link)

### 2. Jobs List Page — Filter Tabs + Status Badges

**Tab bar:** `All Matches (47)` | `Saved (5)` | `Applied (3)` | `Interviewing (1)`

- Tabs filter by `applications.status`
- Counts shown in tab labels
- Tabs layer on top of existing filters (role path, fit score, location, sort)

**Card badges:**
- No status → no badge
- Saved → blue "Saved" badge
- Applied → green "Applied ✓" badge with date
- Interviewing → yellow "Interviewing" badge

### 3. Resume Workspace — In-Context Job-Specific Edits

**Entry from job detail:** "Apply edits to resume" link navigates to `/resumes?path_id={id}&kit_id={id}`.

**Notification bar:** "3 suggested edits from your CIBC Data Analyst application kit" at the top of the workspace. Dismissible.

**Inline suggestions:** Each edit appears highlighted (amber background) next to the target bullet:
- Current text (struck through)
- Suggested replacement
- Accept / Dismiss buttons

**Multiple kits:** If multiple kits have pending edits for the same role path, notification shows: "5 pending edits from 2 application kits" with a dropdown filter by job.

**Re-scoring:** After edits, a "Re-score Resume" button appears. Runs the SCORE_RESUME pipeline on the updated content. New scores replace old ones, suggestions list refreshes.

**Score labeling:**
- Resume workspace: "Role fit score — how well this resume matches Senior Data Analyst positions generally"
- Job detail page: "Job match — how well this resume matches this specific position"

### 4. Interview Prep Hub — Cached with Performance Sidebar

**New table: `interview_prep`**
- `id` UUID PK
- `employee_id` UUID FK
- `role_path_id` UUID FK
- `job_match_id` UUID FK nullable (null = general prep)
- `content` JSONB (common_questions, behavioral_questions, company_specific, strengths, weak_spots, compensation_prep)
- `created_at`, `updated_at` TIMESTAMPTZ

**Load flow:**
1. Check if cached prep exists for role path + job context
2. If yes → return instantly
3. If no → generate via AI, persist, return
4. "Regenerate" button for fresh content

**Two levels accessed via dropdowns (not tabs):**
- **Prep for:** `[Senior Data Analyst ▾]` (role path selector)
- **Context:** `[General ▾]` (dropdown: General, CIBC — Data Analyst, Google — Analytics Lead, etc.)

General is always default. Company-specific prep cached separately per role path + job match. Scales to any number of jobs.

**Performance sidebar:**
- Total mock interviews completed
- Average overall score
- Strongest area
- Weakest area
- Score trend (improving / declining / steady)
- Links to feedback reports (most recent first)

**Back navigation:** Returns to cached content instantly. No regeneration. Sidebar reflects new interview data.

### 5. Mock Interview — Job Source + Feedback Fix

**Job selector:** Shows all jobs with an `applications` record (saved, applied, or interviewing). Not filtered by `recommended_action`.

**Feedback flow:**
1. User ends interview or it times out
2. POST `/api/v1/employee/interviews/session/{id}/complete` with transcript
3. ≥ 2 minutes → AI analysis → redirect to feedback page
4. < 2 minutes → skip analysis → feedback page shows "Session too short for detailed feedback"
5. GET `/api/v1/employee/interviews/session/{id}` returns session + feedback

**Fix:** Ensure the GET route for session by ID exists and returns properly. The 404 was a routing issue.

**Feedback visible from:**
- Interview prep hub (performance sidebar)
- Job detail page (if mock was for that job)
- Feedback page directly

### 6. Readiness Score — Universal Sidebar Visibility

**Placement:** Compact circular progress indicator in the sidebar, above navigation items. Visible on every page.

**What feeds the score:**
- Resume ATS scores (all role paths)
- LinkedIn marked as updated
- Jobs applied to
- Mock interviews completed
- Outreach sent

**Updates:** Fetches on app load, caches client-side. Refreshes on relevant actions (resume edit, job applied, interview completed). Event-driven, not polling.

**Interaction:** Clicking the score navigates to the progress page for full breakdown.

## Data Model Changes

### New table: `interview_prep`
```sql
CREATE TABLE interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID NOT NULL REFERENCES role_paths(id) ON DELETE CASCADE,
  job_match_id UUID REFERENCES job_matches(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, role_path_id, job_match_id)
);
```

### Alter `application_kits`
```sql
ALTER TABLE application_kits
  ADD COLUMN resume_match_score INTEGER,
  ADD COLUMN resume_match_projected INTEGER,
  ADD COLUMN resume_match_date TIMESTAMPTZ;
```

### Existing tables used as-is
- `applications` — already tracks saved/applied/interviewing status
- `application_kits` — already persists kit content
- `interview_sessions` — already stores feedback
- `resumes` — already has ATS scores
