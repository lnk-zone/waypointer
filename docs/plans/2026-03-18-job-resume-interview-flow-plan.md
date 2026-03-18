# Job → Resume → Interview Flow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken state persistence across Jobs, Resume, and Interview flows, and implement the approved UX design from `docs/plans/2026-03-18-job-resume-interview-flow-design.md`.

**Architecture:** Fix existing API routes to read back persisted data, create `interview_prep` table for caching, add resume match scores to application kits, add filter tabs to jobs list, add inline edit suggestions to resume workspace, add readiness score to sidebar, and fix the interview feedback 404.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), Anthropic SDK, React, Tailwind CSS, shadcn/ui, Zustand, TanStack Query

---

### Task 1: Database Migration — interview_prep table + application_kits columns

**Files:**
- Run SQL via Supabase Management API

**Step 1: Create interview_prep table**

```sql
CREATE TABLE interview_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID NOT NULL REFERENCES role_paths(id) ON DELETE CASCADE,
  job_match_id UUID REFERENCES job_matches(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, role_path_id, COALESCE(job_match_id, '00000000-0000-0000-0000-000000000000'))
);

ALTER TABLE interview_prep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own prep" ON interview_prep
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to interview_prep" ON interview_prep
  FOR ALL USING (true) WITH CHECK (true);
```

**Step 2: Add resume match columns to application_kits**

```sql
ALTER TABLE application_kits
  ADD COLUMN IF NOT EXISTS resume_match_score INTEGER,
  ADD COLUMN IF NOT EXISTS resume_match_projected INTEGER,
  ADD COLUMN IF NOT EXISTS resume_match_date TIMESTAMPTZ;
```

**Step 3: Verify tables**

Run queries to confirm columns exist on both tables.

**Step 4: Commit**

```
feat: add interview_prep table and resume match columns to application_kits
```

**Acceptance Criteria:**
- [ ] `interview_prep` table exists with correct columns and UNIQUE constraint
- [ ] RLS enabled with employee read policy and service role full access
- [ ] `application_kits` has `resume_match_score`, `resume_match_projected`, `resume_match_date` columns
- [ ] Both tables queryable via service role

---

### Task 2: Fix Job Detail Page — Load Existing Kit + Application Status

**Files:**
- Modify: `src/app/jobs/[id]/page.tsx`
- Modify: `src/app/api/v1/employee/jobs/route.ts` (single match lookup)
- Read: `src/app/api/v1/employee/jobs/[id]/kit/route.ts` (understand kit persistence)
- Read: `src/app/api/v1/employee/jobs/[id]/track/route.ts` (understand tracking)

**Step 1: Update the job detail page to load existing state on mount**

The page must call on mount:
1. `GET /api/v1/employee/jobs?match_id={id}` — get the job match + listing
2. Check if kit exists: query `application_kits` where `job_match_id = match.id`
3. Check application status: query `applications` where `job_match_id = match.id`
4. Check mock interviews: query `interview_sessions` where `job_match_id = match.id`

Create a new API route `GET /api/v1/employee/jobs/[id]/detail` that returns all of this in one call:
```typescript
{
  match: { ...jobMatch, job_listing: {...} },
  kit: { ...applicationKit } | null,
  application: { status, applied_at } | null,
  interviews: [{ id, overall_score, completed_at, format }] | []
}
```

**Step 2: Update the page UI to be status-aware**

- Show "Applied on [date]" banner when application exists
- Show kit sections when kit exists (not regenerate button)
- Show "Track as Applied" only when no application exists
- Show resume match score from kit when available
- Show mock interview feedback summaries when sessions exist
- Show "Start Mock Interview" link when kit exists (uses interview_themes)

**Step 3: Verify**

Navigate to a job you've already generated a kit for → kit should load instantly without regeneration. Mark as applied → navigate away and back → "Applied" banner should show.

**Step 4: Commit**

```
feat: make job detail page status-aware with persisted kit, application, and interview data
```

**Acceptance Criteria:**
- [ ] Job detail page loads existing kit without regeneration
- [ ] "Applied on [date]" banner shows when application exists
- [ ] Kit sections display when kit exists
- [ ] Mock interview feedback summaries show when sessions exist for this job
- [ ] Resume match score displays with date and refresh button
- [ ] "Track as Applied" button only shows when not yet applied
- [ ] Navigating away and back preserves all state

---

### Task 3: Fix Jobs List Page — Filter Tabs + Status Badges

**Files:**
- Modify: `src/app/jobs/page.tsx`
- Modify: `src/app/api/v1/employee/jobs/route.ts` (add status filter + join with applications)

**Step 1: Update the jobs API to include application status**

Join `job_matches` with `applications` table to include status on each job card. Add query param `?app_status=saved|applied|interviewing` for tab filtering.

**Step 2: Add tab bar to jobs list page**

Tabs: `All Matches` | `Saved` | `Applied` | `Interviewing`
- Each tab shows count in parentheses
- Clicking a tab sets the `app_status` filter
- Tabs layer on top of existing filters (role path, fit, location, sort)

**Step 3: Add status badges to job cards**

- Saved → blue badge
- Applied → green "Applied ✓" badge with date
- Interviewing → yellow badge
- No status → no badge (existing fit score badge remains)

**Step 4: Verify**

Apply to a job → go back to jobs list → job should show green "Applied ✓" badge → click "Applied" tab → only applied jobs show.

**Step 5: Commit**

```
feat: add filter tabs and status badges to jobs list page
```

**Acceptance Criteria:**
- [ ] Tab bar renders with All Matches, Saved, Applied, Interviewing
- [ ] Each tab shows accurate count
- [ ] Clicking a tab filters the list correctly
- [ ] Status badges appear on cards matching their application status
- [ ] Tabs work alongside existing filters (role path, fit, location)
- [ ] Applied jobs no longer show "Apply Now" — they show "Applied ✓"

---

### Task 4: Resume Workspace — In-Context Job-Specific Edits

**Files:**
- Modify: `src/app/resumes/page.tsx`
- Create: `src/app/api/v1/employee/resume/[id]/suggestions/route.ts` (GET pending suggestions from kits)
- Modify: `src/app/api/v1/employee/resume/[id]/route.ts` (accept/dismiss suggestion)

**Step 1: Create suggestions API**

`GET /api/v1/employee/resume/{role_path_id}/suggestions` returns pending resume edits from all application kits for this role path:
```typescript
{
  data: [
    {
      kit_id: "uuid",
      job_title: "Data Analyst",
      company: "CIBC",
      edits: [
        { id: "uuid", target_section: "experience", target_index: 2, current_text: "...", suggested_text: "...", status: "pending" }
      ]
    }
  ]
}
```

**Step 2: Add notification bar to resume workspace**

When `?kit_id={id}` query param is present OR when pending suggestions exist:
- Show amber notification bar: "3 suggested edits from your CIBC Data Analyst application kit"
- If multiple kits: "5 pending edits from 2 application kits" with dropdown filter

**Step 3: Add inline suggestion display**

Each edit appears highlighted next to the target bullet:
- Amber/yellow background
- Current text (struck through) + suggested replacement
- Accept / Dismiss buttons
- On accept → update resume content via PATCH API
- On dismiss → mark suggestion as dismissed

**Step 4: Add re-score button**

After edits are accepted, show "Re-score Resume" button. Calls the SCORE_RESUME pipeline on updated content. Updates ATS/clarity/specificity scores.

**Step 5: Add score labels**

- Label the ATS score: "Role fit score — how well this resume matches [role path title] positions generally"

**Step 6: Verify**

Generate a kit for a job → click "Apply edits to resume" → land on resume workspace with suggestions visible → accept one → score updates.

**Step 7: Commit**

```
feat: add in-context job-specific resume edit suggestions with re-scoring
```

**Acceptance Criteria:**
- [ ] Navigating from job detail "Apply edits" lands on resume workspace with suggestions loaded
- [ ] Notification bar shows count of pending edits with source job name
- [ ] Multiple kits' suggestions display with filter dropdown
- [ ] Inline suggestions show current vs suggested text with Accept/Dismiss
- [ ] Accepting an edit updates the resume content
- [ ] Dismissing an edit removes it from the list
- [ ] Re-score button appears after edits, recalculates ATS scores
- [ ] Score is labeled as "Role fit score" with explanation

---

### Task 5: Interview Prep Hub — Cache in Database

**Files:**
- Modify: `src/app/api/v1/employee/interviews/prep/route.ts`
- Modify: `src/app/interviews/page.tsx`

**Step 1: Update prep API to check cache first**

```typescript
// 1. Check for existing prep
const { data: cached } = await supabase
  .from("interview_prep")
  .select("*")
  .eq("employee_id", employee.id)
  .eq("role_path_id", pathId)
  .is("job_match_id", jobMatchId || null)
  .single();

if (cached) {
  return NextResponse.json({ data: cached.content, cached: true });
}

// 2. Generate via AI pipeline (existing code)
// 3. Persist to interview_prep table
// 4. Return content
```

Add `?regenerate=true` query param to force fresh generation (deletes cached entry first).

**Step 2: Update prep page — context dropdown instead of auto-regenerate**

- Role path dropdown: selects which role path
- Context dropdown: "General" + list of saved/applied jobs
- On dropdown change → fetch prep for that combination (cached or generated)
- "Regenerate" button calls API with `?regenerate=true`
- No auto-generation on mount — only fetches cached or shows empty state with "Generate" button

**Step 3: Add performance sidebar**

Query `interview_sessions` for the selected role path:
- Count completed sessions
- Average overall_score
- Best/worst area (compare clarity_score, specificity_score, confidence_score averages)
- Links to feedback pages (most recent first)

**Step 4: Fix job selector to include saved AND applied jobs**

The job dropdown currently filters by `recommended_action`. Change to query `applications` table to show any job the user has saved or applied to.

**Step 5: Verify**

Generate prep → navigate away → come back → prep loads instantly from cache. Select a different job from dropdown → new prep generates and caches. Sidebar shows mock interview stats.

**Step 6: Commit**

```
feat: cache interview prep in database with performance sidebar
```

**Acceptance Criteria:**
- [ ] First visit generates prep and caches it
- [ ] Subsequent visits load cached prep instantly (no AI call)
- [ ] Context dropdown shows General + all saved/applied jobs
- [ ] Selecting a job loads or generates company-specific prep
- [ ] "Regenerate" button forces fresh generation
- [ ] Performance sidebar shows mock interview count, avg score, best/worst areas
- [ ] Sidebar links to individual feedback reports
- [ ] Navigating back from mock interview loads cached prep (no regeneration)

---

### Task 6: Fix Interview Feedback 404

**Files:**
- Check: `src/app/api/v1/employee/interviews/session/[id]/route.ts`
- Check: `src/app/interviews/feedback/[id]/page.tsx`

**Step 1: Verify the GET route exists and works**

The route file exists at `src/app/api/v1/employee/interviews/session/[id]/route.ts`. Check:
- Is it exported as `GET`?
- Does it use `runtime = "nodejs"`?
- Does it query `interview_sessions` with correct column names?
- Does it validate the session belongs to the authenticated employee?

**Step 2: Fix any issues found**

Common causes of 404 on dynamic routes in Next.js App Router:
- Missing or incorrect route file location
- Route conflicts with other files in the same directory
- Incorrect export name

**Step 3: Handle short sessions gracefully**

If session < 2 minutes and `feedback_generated` is false:
- Feedback page shows: "Session too short for detailed feedback. Practice for at least 2 minutes for a full coaching report."
- "Practice Again" button

**Step 4: Verify**

Start a mock interview → end after 3 minutes → feedback page loads with scores. Start another → end after 1 minute → feedback page shows "too short" message.

**Step 5: Commit**

```
fix: resolve interview feedback 404 and handle short sessions
```

**Acceptance Criteria:**
- [ ] GET `/api/v1/employee/interviews/session/{id}` returns session data
- [ ] Feedback page renders scores, answer breakdowns, strongest stories, weak answers
- [ ] Sessions < 2 minutes show "too short" message instead of error
- [ ] "Practice Again" button works from feedback page

---

### Task 7: Mock Interview Job Selector — Include Applied Jobs

**Files:**
- Modify: `src/app/interviews/page.tsx` (job selector in the modal)

**Step 1: Update job query**

Change the job selector to query `applications` table (saved + applied + interviewing) instead of filtering `job_matches` by `recommended_action`.

```typescript
const { data: savedJobs } = await supabase
  .from("applications")
  .select("id, job_title, company_name, status, job_match_id")
  .eq("employee_id", employee.id)
  .order("created_at", { ascending: false });
```

**Step 2: Display in dropdown**

Show: "CIBC — Data Analyst (Applied)" or "Google — Analytics Lead (Saved)"

**Step 3: Verify**

Save a job → it appears in interview job selector. Apply to a job → it also appears.

**Step 4: Commit**

```
feat: include saved and applied jobs in mock interview job selector
```

**Acceptance Criteria:**
- [ ] Mock interview job selector shows saved, applied, and interviewing jobs
- [ ] Jobs display with company name, title, and status
- [ ] Selecting a job passes `job_match_id` to the session start API

---

### Task 8: Readiness Score in Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/api/v1/employee/progress/route.ts` (ensure it returns a composite score)

**Step 1: Calculate composite readiness score**

The progress API already aggregates metrics. Add a composite percentage:
```typescript
const weights = {
  resumes: 25,      // has at least one resume
  linkedin: 15,     // marked as updated
  jobs_applied: 20, // has applied to at least one job
  interviews: 20,   // has completed at least one mock interview
  outreach: 20,     // has sent at least one outreach
};

let score = 0;
if (resumeCount > 0) score += weights.resumes;
if (linkedinUpdated) score += weights.linkedin;
if (applicationsCount > 0) score += weights.jobs_applied;
if (interviewsCount > 0) score += weights.interviews;
if (outreachCount > 0) score += weights.outreach;
```

**Step 2: Add compact score indicator to sidebar**

Circular progress ring with percentage in the center. Positioned below the logo, above nav items. Uses Waypointer Blue for the filled arc.

- Shows percentage number in center
- Label below: "Readiness"
- Clickable → navigates to `/progress`

**Step 3: Fetch on mount**

Call `GET /api/v1/employee/progress` on sidebar mount. Cache in component state. Re-fetch when navigating to dashboard or after relevant actions.

**Step 4: Verify**

Log in → sidebar shows readiness score on every page. Complete an action (e.g., apply to job) → score updates on next page navigation.

**Step 5: Commit**

```
feat: add readiness score indicator to employee sidebar
```

**Acceptance Criteria:**
- [ ] Circular progress indicator shows in sidebar on all employee pages
- [ ] Score percentage reflects resume, LinkedIn, jobs, interviews, outreach completion
- [ ] Clicking the score navigates to `/progress`
- [ ] Score updates after completing relevant actions
- [ ] Score displays correctly on mobile (icon-only sidebar) and desktop

---

### Task 9: Fix JSearch API Integration

**Files:**
- Modify: `src/lib/jobs/jsearch.ts`

**Step 1: Update API endpoint**

The code calls `jsearch.p.rapidapi.com` but the user's subscription is on `app.openwebninja.com`. Update the base URL and headers to match the OpenWeb Ninja API format.

Check the OpenWeb Ninja JSearch docs for:
- Correct base URL
- Required headers (API key header name)
- Request format

**Step 2: Verify the JOB_DATA_API_KEY env var is set on Vercel**

**Step 3: Test with a real search**

Trigger job ingestion → verify listings appear in `job_listings` table → trigger matching → verify matches appear on jobs page.

**Step 4: Commit**

```
fix: update JSearch API to use OpenWeb Ninja endpoint
```

**Acceptance Criteria:**
- [ ] JSearch API calls use correct base URL and headers for OpenWeb Ninja
- [ ] Job search returns results for "Senior Data Analyst" in "Dallas"
- [ ] Results persist in `job_listings` table
- [ ] Matching scores jobs against employee profile
- [ ] Jobs page displays matched jobs with fit scores

---

### Task 10: Deploy and End-to-End Verification

**Step 1: Build locally**

```bash
npx tsc --noEmit
npm run build
```

**Step 2: Push and deploy**

```bash
git push origin master
```

**Step 3: End-to-end test on production**

1. Go to Jobs → click "Find Job Matches" → jobs appear
2. Click a job → generate kit → resume edits + messages show
3. Track as applied → navigate away and back → "Applied" banner shows
4. Go to Jobs list → "Applied" tab shows the job with green badge
5. Click "Apply edits to resume" → resume workspace shows inline suggestions
6. Accept an edit → re-score → score updates
7. Go to Interviews → prep loads from cache (or generates first time)
8. Select a company from context dropdown → company-specific prep loads
9. Start mock interview with applied job → complete → feedback page loads
10. Go back to interview prep → cached content loads instantly, sidebar shows new session
11. Check sidebar → readiness score visible on all pages
12. Go to job detail → mock interview feedback shows

**Acceptance Criteria:**
- [ ] Full flow works end-to-end without 500/502/404 errors
- [ ] All persisted data loads on page revisit
- [ ] No unnecessary AI regeneration on cached content
- [ ] Readiness score visible on every page
- [ ] Filter tabs work on jobs list
- [ ] Resume suggestions flow works from kit to workspace
