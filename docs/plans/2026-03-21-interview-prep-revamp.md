# Interview Prep Revamp — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace role-path-centric interview prep with a job-description-driven interview preparation guide that produces comprehensive, personalized Q&A materials with STAR-format answers, and connect mock interviews to use the same questions.

**Architecture:** The new flow centers on the user pasting a job description (or selecting a saved job match). The AI generates a multi-section interview preparation guide modeled after professional coaching outputs. The mock interview agent reads the generated questions from the cache and asks those exact questions. The frontend is overhauled to support the new input form and richer output sections.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL), Anthropic Claude API via `@anthropic-ai/sdk`, ElevenLabs Conversational AI, Zod validation, Tailwind CSS + shadcn/ui, Zustand (not needed here — local state sufficient)

**AI Timeout Strategy:** The Vercel function timeout is 60s. The new interview prep output is much larger (~8192 tokens). To avoid timeouts:
- Use `maxDuration = 60` on the API route
- Use `claude-sonnet-4-20250514` (faster than opus) with temperature 0.3
- If the AI call exceeds 50s, the pipeline's 30s timeout + 30s retry = 60s max, which fits within Vercel's limit
- The prompt should instruct the AI to be concise in talking points/tips (not verbose paragraphs)

**Mock Interview Lag Mitigation:** ElevenLabs Conversational AI latency comes from:
- Agent creation (1-3s) — already handled
- Voice synthesis latency — use ElevenLabs' low-latency voice models
- The persona prompt being too long slows first response — keep prep_questions injection concise (questions only, no answers)

---

## Current State Summary

- **Interview prep API** (`/api/v1/employee/interviews/prep`): Fetches by `path_id` + optional `job_match_id`. Calls `GENERATE_INTERVIEW_PREP` prompt. Caches in `interview_prep` table keyed by `(employee_id, role_path_id, COALESCE(job_match_id, NULL_UUID))`.
- **Interview prep frontend** (`/interviews/page.tsx`): Dropdown to select role path, optional saved job context. Displays sections: common questions, behavioral questions, company-specific, strengths, weak spots, compensation prep. Questions show expandable suggested answers.
- **Mock interview session start** (`/api/v1/employee/interviews/session/start`): Creates ElevenLabs agent with `INTERVIEW_PERSONA` prompt. Already fetches prep questions from `interview_prep` cache and injects them into the persona.
- **Mock interview session page** (`/interviews/session/page.tsx`): WebSocket voice session with ElevenLabs agent.
- **Feedback page** (`/interviews/feedback/[id]/page.tsx`): Post-session analysis with scores, answer breakdowns, coaching.
- **Database**: `interview_prep` table (employee_id, role_path_id, job_match_id, content JSONB). `interview_sessions` table with full feedback fields.

## New Design

### Input Form
The user provides:
1. **Job description** (required) — paste text or select from saved job matches
2. **Interviewer titles** (optional) — e.g., "VP Engineering", "HR Manager"
3. **Interview stage** (optional) — phone screen, first round, second round, final round
4. **Format** — behavioral, technical, or mixed

### Output Sections (in order)
1. **Know Your Interviewers & Their Lens** — what each interviewer cares about based on title (only if interviewer titles provided)
2. **Role Snapshot & Strongest Alignments** — two-column mapping of candidate experience to JD requirements
3. **The Gap(s) to Address** — weak spots with bridging strategies
4. **Opening & Closing Positioning** — "Tell me about yourself" scripted answer + closing statement
5. **Behavioral Questions & STAR Answers** — full Situation/Action/Result answers using real resume experiences, with per-question tips
6. **Technical & Situational Questions** — with detailed talking points
7. **Smart Questions to Ask Your Interviewers** — tailored per interviewer if titles provided
8. **Final Preparation Checklist** — day-before and day-of items

### Mock Interview Connection
- Mock interview uses the behavioral + technical questions from the generated prep
- User starts mock interview directly from the prep guide ("Practice These Questions" button)

### UI Note
- Banner text: "Use these as frameworks to internalize, not scripts to memorize."

---

## Task Breakdown

### Task 1: Update Zod Schema for New Interview Prep Output

**Files:**
- Modify: `src/lib/validators/ai.ts`

**What to do:**
Replace `generateInterviewPrepSchema` with a new schema matching the 8-section output structure. The new schema must validate:

```typescript
const interviewerLensSchema = z.object({
  title: z.string(),
  focus: z.string(),
  they_want_to_know: z.array(z.string()),
});

const alignmentSchema = z.object({
  your_experience: z.string(),
  jd_requirement: z.string(),
});

const starAnswerSchema = z.object({
  question: z.string(),
  situation: z.string(),
  action: z.string(),
  result: z.string(),
  tip: z.string().optional(),
});

const technicalQuestionSchema = z.object({
  question: z.string(),
  talking_points: z.array(z.string()),
  tip: z.string().optional(),
});

const smartQuestionSchema = z.object({
  for_interviewer: z.string().optional(),
  question: z.string(),
});

export const generateInterviewPrepSchema = z.object({
  interviewer_lenses: z.array(interviewerLensSchema),
  alignments: z.array(alignmentSchema).min(3).max(8),
  gaps_to_address: z.array(z.object({
    gap: z.string(),
    bridging_strategy: z.string(),
  })).min(1).max(3),
  opening_statement: z.string(),
  closing_statement: z.string(),
  behavioral_questions: z.array(starAnswerSchema).min(5).max(8),
  technical_questions: z.array(technicalQuestionSchema).min(3).max(6),
  smart_questions_to_ask: z.array(smartQuestionSchema).min(3).max(6),
  preparation_checklist: z.object({
    day_before: z.array(z.string()).min(3).max(6),
    day_of: z.array(z.string()).min(2).max(4),
  }),
});
```

**Acceptance Criteria:**
- [ ] Old `generateInterviewPrepSchema` is replaced with new schema
- [ ] All sub-schemas (interviewerLensSchema, starAnswerSchema, etc.) are exported
- [ ] `GenerateInterviewPrepOutput` type is re-exported from the new schema
- [ ] TypeScript compiles with no errors (`npx next build` passes type checking)
- [ ] The old `interviewQuestionSchema` helper is removed

---

### Task 2: Update the GENERATE_INTERVIEW_PREP Prompt in Database

**Files:**
- No code files — database update via Supabase REST API

**What to do:**
Update the `prompt_registry` row for `GENERATE_INTERVIEW_PREP`:
- Update `system_prompt` to instruct the AI to produce the 8-section guide
- Update `user_prompt_template` with new variables: `{{job_description}}`, `{{interviewer_titles}}`, `{{interview_stage}}`, `{{interview_format}}`
- Keep existing variables: `{{career_snapshot_json}}`
- Set `max_tokens` to 8192 (the output is much longer now)
- The prompt MUST instruct:
  - "Tell me about yourself" is always the first behavioral question
  - STAR format for all behavioral answers using the candidate's real experience
  - Interviewer lenses only populated if interviewer titles are provided
  - Opening statement comes before Q&A sections
  - Each behavioral answer must include a tip specific to the JD context

**Acceptance Criteria:**
- [ ] `prompt_registry` row for `GENERATE_INTERVIEW_PREP` is updated with new system_prompt
- [ ] `user_prompt_template` includes `{{job_description}}`, `{{interviewer_titles}}`, `{{interview_stage}}`, `{{interview_format}}` variables
- [ ] `max_tokens` is set to 8192
- [ ] Verified by fetching the row via curl and confirming the template contains all required variables and JSON output shape instructions
- [ ] Existing `interview_prep` cache rows are cleared (since the output format changed)

---

### Task 3: Update the Interview Prep API Route

**Files:**
- Modify: `src/app/api/v1/employee/interviews/prep/route.ts`

**What to do:**
Change the API from role-path-centric to job-description-centric:

1. Change from `GET` to `POST` (since we're now sending a job description body, not just query params)
2. New request body schema:
   ```typescript
   const prepRequestSchema = z.object({
     job_description: z.string().min(50, "Job description must be at least 50 characters"),
     job_match_id: z.string().uuid().optional(), // auto-fills JD from saved job
     interviewer_titles: z.array(z.string()).max(5).optional(),
     interview_stage: z.enum(["phone_screen", "first_round", "second_round", "final_round"]).optional(),
     format: z.enum(["behavioral", "technical", "mixed"]).default("mixed"),
     regenerate: z.boolean().default(false),
   });
   ```
3. Keep `GET` handler with two modes:
   - `GET /prep?prep_id=X` — returns a single cached prep by ID (for viewing saved preps and mock interview loading)
   - `GET /prep?list=true` — returns all preps for this employee (for "My Prep Guides" list), selecting only: id, job_title, company_name, interview_stage, format, created_at (not the full content)
4. Add `DELETE` handler: `DELETE /prep` with body `{ prep_id: uuid }` — deletes a prep guide
5. Cache key: SHA-256 hash of `job_description + interview_stage + format` to prevent exact duplicates but allow different stage preps for the same JD
5. The API still uses `assemblePathContext` to get the employee's career snapshot
6. Pass new variables to the AI pipeline: `job_description`, `interviewer_titles` (joined as text), `interview_stage`, `interview_format`

**Acceptance Criteria:**
- [ ] `POST /api/v1/employee/interviews/prep` accepts the new request body
- [ ] `GET /api/v1/employee/interviews/prep?prep_id=X` returns cached prep by ID with full content
- [ ] `GET /api/v1/employee/interviews/prep?list=true` returns all preps (id, job_title, company_name, stage, format, created_at) without full content
- [ ] `DELETE /api/v1/employee/interviews/prep` with `{ prep_id }` deletes a prep guide
- [ ] Validation rejects job descriptions under 50 characters
- [ ] The AI pipeline is called with the new variables
- [ ] Response contains all 8 sections from the new schema
- [ ] Cache is stored in `interview_prep` table with content matching new schema
- [ ] If `job_match_id` is provided, the job description is pulled from `job_listings.description_full`
- [ ] TypeScript compiles cleanly
- [ ] Old cached entries with the previous format are gracefully handled (don't crash)

---

### Task 4: Database Migration — Update interview_prep Table

**Files:**
- Create: `supabase/migrations/2026MMDD_update_interview_prep.sql`

**What to do:**
The `interview_prep` table currently requires `role_path_id NOT NULL`. The new flow is job-description-driven, not role-path-driven. We need to:
1. Make `role_path_id` nullable (it may not be relevant in the new flow)
2. Add a `job_description_hash` TEXT column for cache deduplication (SHA-256 of JD + stage + format)
3. Add `job_title` TEXT and `company_name` TEXT columns for display in the "My Prep Guides" list
4. Add `interviewer_titles` JSONB column to store the input
5. Add `interview_stage` TEXT column (phone_screen, first_round, second_round, final_round)
6. Add `format` TEXT column (behavioral, technical, mixed)
7. Add `job_description_text` TEXT column to store the raw JD for re-display
8. Drop the old COALESCE-based unique index
9. Add a new unique index on `(employee_id, job_description_hash)` to prevent exact duplicates but allow multiple preps for the same job at different stages

**Acceptance Criteria:**
- [ ] Migration runs without errors via `npx supabase db push --linked`
- [ ] `role_path_id` is nullable
- [ ] New columns exist: `job_description_hash`, `job_title`, `company_name`, `interviewer_titles`, `interview_stage`, `format`, `job_description_text`
- [ ] Unique index on `(employee_id, job_description_hash)` exists (hash includes stage+format so same JD can have different stage preps)
- [ ] Old unique index is dropped
- [ ] RLS policy still works (employee isolation)

---

### Task 5: Overhaul the Interview Prep Frontend — Input Form

**Files:**
- Modify: `src/app/interviews/page.tsx`

**What to do:**
Replace the current role-path selector + job context dropdown with a new input form:

1. **Job Description Input**: Large textarea with placeholder "Paste the full job description here..."
   - OR a "Select from saved jobs" dropdown that auto-fills the textarea from job_listings.description_full
2. **Interviewer Titles** (optional): Repeatable input fields — "Add interviewer" button, each with a title input (e.g., "VP Engineering"). Max 5.
3. **Interview Stage** (optional): Select dropdown — Phone Screen, First Round, Second Round, Final Round
4. **Format**: Radio group — Behavioral, Technical, Mixed (default Mixed)
5. **"Generate Interview Guide" button** — calls the new POST endpoint
6. Keep the performance sidebar as-is

Remove the old role-path dropdown and job context selector.

The form should show validation errors inline. The textarea should show a character count.

**"My Prep Guides" Section:**
Below the input form, show a list of previously generated prep guides. Each card shows:
- Job title + company name (or "Custom Job Description" if no match)
- Interview stage badge (Phone Screen, First Round, etc.)
- Format badge (Behavioral, Technical, Mixed)
- Date generated
- "View" button to load the full guide
- "Delete" button to remove

This lets the user go back to different preps for different stages of the same role, or for different companies entirely.

**Acceptance Criteria:**
- [ ] Job description textarea renders with at least 6 rows, character count visible
- [ ] "Select from saved jobs" dropdown loads saved job matches and fills textarea + job_match_id
- [ ] Interviewer titles section allows adding/removing up to 5 titles
- [ ] Interview stage dropdown shows 4 options + "Not specified" default
- [ ] Format radio group defaults to "Mixed"
- [ ] "Generate Interview Guide" button is disabled when job_description is empty
- [ ] Button shows loading state with contextual message during generation
- [ ] Validation error shows if JD < 50 characters
- [ ] Performance sidebar still renders correctly
- [ ] "My Prep Guides" section lists all previously generated preps for this employee
- [ ] Each prep card shows job title, company, stage, format, date, and View/Delete buttons
- [ ] Clicking "View" loads the full prep guide in the results display area
- [ ] Clicking "Delete" removes the prep with confirmation dialog
- [ ] User can have multiple preps for the same job (different stages/formats)

---

### Task 6: Overhaul the Interview Prep Frontend — Results Display

**Files:**
- Modify: `src/app/interviews/page.tsx`

**What to do:**
Replace the current flat question list sections with the 8-section guide display:

1. **Section 1: Know Your Interviewers** — Only shown if `interviewer_lenses` is non-empty. Card per interviewer with title, focus description, "They want to know" bullet list.
2. **Section 2: Role Snapshot & Strongest Alignments** — Two-column table: "Your Experience" | "JD Requirement" with checkmark matches.
3. **Section 3: The Gap(s) to Address** — Warning-styled cards with gap description + bridging strategy.
4. **Section 4: Opening & Closing Positioning** — "Tell me about yourself" answer in a highlighted callout + closing statement. Banner: "Use these as frameworks to internalize, not scripts to memorize."
5. **Section 5: Behavioral Questions & STAR Answers** — Expandable accordion. Each item shows Question header, then SITUATION / ACTION / RESULT sections with tip callout. Always starts with "Tell me about yourself."
6. **Section 6: Technical & Situational Questions** — Expandable accordion. Each shows question + talking points as bullets + optional tip.
7. **Section 7: Smart Questions to Ask** — Grouped by interviewer (if titles provided) or flat list.
8. **Section 8: Final Preparation Checklist** — Two subsections: "Day Before" and "Day Of" with checkbox-styled items.

At the top of the results, show a "Practice These Questions" button that opens the mock interview modal pre-configured with this prep's questions.

**Acceptance Criteria:**
- [ ] All 8 sections render when data is present
- [ ] Section 1 (Interviewers) only appears when `interviewer_lenses` array is non-empty
- [ ] Section 2 (Alignments) renders as a two-column layout
- [ ] Section 3 (Gaps) uses warning/amber styling
- [ ] Section 4 (Opening/Closing) shows before behavioral questions
- [ ] Section 4 includes the "internalize, not memorize" banner
- [ ] Section 5 (Behavioral) is expandable accordion with STAR format labels
- [ ] Section 5 first question is always "Tell me about yourself"
- [ ] Section 6 (Technical) is expandable with talking points
- [ ] Section 7 (Smart Questions) groups by interviewer when available
- [ ] Section 8 (Checklist) has day-before and day-of subsections
- [ ] "Practice These Questions" button is visible and opens mock interview modal
- [ ] Loading skeleton shows during generation
- [ ] Empty state shows when no prep has been generated yet

---

### Task 7: Update Mock Interview Session Start to Use New Prep Format

**Files:**
- Modify: `src/app/api/v1/employee/interviews/session/start/route.ts`

**What to do:**
1. Add `prep_id` to the request schema (UUID of the interview_prep record to pull questions from)
2. Make `role_path_id` optional (the new flow may not have one)
3. When `prep_id` is provided, fetch the `interview_prep` record and extract questions:
   - Behavioral questions: `content.behavioral_questions[].question`
   - Technical questions: `content.technical_questions[].question`
4. Format the questions and inject into the `INTERVIEW_PERSONA` prompt via `{{prep_questions}}`
5. Fall back to existing behavior if `prep_id` is not provided (backward compatibility)

**Acceptance Criteria:**
- [ ] Request schema accepts optional `prep_id` UUID
- [ ] `role_path_id` is optional (not required)
- [ ] When `prep_id` is provided, questions are extracted from the matching `interview_prep` row
- [ ] Questions are formatted as a numbered list and injected as `{{prep_questions}}`
- [ ] When `prep_id` is not provided, existing behavior is preserved (extracts from interview_prep by role_path_id)
- [ ] TypeScript compiles cleanly
- [ ] The ElevenLabs agent receives the prep questions in its system prompt

---

### Task 8: Update Mock Interview Modal & Session Page

**Files:**
- Modify: `src/app/interviews/page.tsx` (modal component)
- Modify: `src/app/interviews/session/page.tsx` (session page)

**What to do:**
1. **Modal**: When launched from "Practice These Questions", pass the `prep_id` to the session start API. The modal should show which prep guide the practice is based on (job title / company name if available).
2. **Session page**: Accept `prep_id` as a query parameter. Pass it to the session start POST call. The rest of the session flow (WebSocket, audio, transcript) remains unchanged.
3. Keep the existing format/difficulty/duration selectors in the modal.

**Acceptance Criteria:**
- [ ] "Practice These Questions" button passes `prep_id` to the modal
- [ ] Modal displays the job title / company name context when available
- [ ] Session start POST includes `prep_id` in the request body
- [ ] Session page reads `prep_id` from query params and includes it in the start call
- [ ] Existing mock interview flow (without prep context) still works
- [ ] Format/difficulty/duration selectors still present and functional

---

### Task 9: Update INTERVIEW_PERSONA Prompt for New Question Format

**Files:**
- No code files — database update via Supabase REST API

**What to do:**
The `INTERVIEW_PERSONA` prompt already has `{{#if prep_questions}}` block. Verify it works with the new question format (behavioral + technical extracted separately). If needed, update to distinguish between behavioral and technical questions in the injected list so the agent knows which format to use for each.

**Acceptance Criteria:**
- [ ] `INTERVIEW_PERSONA` prompt's `{{#if prep_questions}}` block correctly processes questions from the new format
- [ ] The prompt instructs the agent to ask behavioral questions using "Tell me about..." framing
- [ ] The prompt instructs the agent to ask technical questions as scenario/knowledge questions
- [ ] Verified by fetching the prompt via curl and reviewing the template

---

### Task 10: Build, Test End-to-End, Commit and Push

**Files:**
- All modified files from Tasks 1-9

**What to do:**
1. Run `npx next build` — must compile with zero errors
2. Test the full flow manually:
   - Generate a prep guide with a pasted job description
   - Verify all 8 sections render correctly
   - Start a mock interview from the prep guide
   - Verify the agent asks the prep questions
3. Commit all changes with a descriptive commit message
4. Push to `origin master`

**Acceptance Criteria:**
- [ ] `npx next build` passes with zero errors
- [ ] POST `/api/v1/employee/interviews/prep` with a job description returns all 8 sections
- [ ] The frontend renders all 8 sections correctly
- [ ] "Practice These Questions" opens the mock interview modal with prep context
- [ ] Session start POST with `prep_id` creates an agent with the prep questions
- [ ] All changes committed and pushed to `origin master`
- [ ] Vercel deployment succeeds
