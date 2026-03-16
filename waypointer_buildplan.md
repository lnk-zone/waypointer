# Waypointer — Build Plan

Version: 1.0
Date: March 15, 2026
Status: Pre-build specification

---

## Purpose

This document breaks the Waypointer masterplan into a sequenced list of discrete work units — epics and issues — that Claude Code can execute one at a time, in order, without making architectural decisions.

Every issue references specific sections of the masterplan (MP) and, where applicable, the prompt registry (PR). Claude Code must read those sections before writing any code.

---

## Reference Documents

| Shorthand | Full Name | File |
|-----------|-----------|------|
| MP | Master Plan | `waypointer_masterplan.md` |
| PR | Prompt Registry | `waypointer_prompt_registry.md` |

---

## How to Use This Document

1. Read the referenced MP and PR sections before writing any code for an issue
2. Complete all acceptance criteria before marking an issue done
3. Never proceed to the next issue if current acceptance criteria are not met
4. Issues within an epic are ordered by dependency — do not skip ahead
5. When an issue references PR, read the full prompt entry (system prompt, user prompt template, output format) before implementing the AI call

---

## Epics Overview

| Epic | Title | Issues | Description |
|------|-------|--------|-------------|
| E1 | Development Environment | 3 | Next.js 14 + Supabase + Vercel dev environment working end to end |
| E2 | Database & Auth | 4 | All tables, enums, RLS policies, Supabase Auth with email/password and Google OAuth |
| E3 | AI Infrastructure | 3 | Prompt registry seeding, Claude API integration pipeline, structured output parsing |
| E4 | Employee Onboarding | 5 | Welcome screen, profile intake, resume upload, career snapshot extraction and review |
| E5 | Role Targeting | 3 | Role path generation, selection, custom paths, transition plan |
| E6 | Resume & LinkedIn | 4 | Resume generation, scoring, editing, download (PDF/DOCX), LinkedIn optimization |
| E7 | Job Discovery | 4 | Job data provider integration, matching/scoring, application kits, tracking |
| E8 | Outreach | 2 | Outreach message generation, tracking |
| E9 | Interview System | 3 | ElevenLabs integration, mock interview sessions, feedback analysis |
| E10 | Weekly Plan & Progress | 3 | Weekly plan generation, progress tracker, confidence check-ins |
| E11 | Employer Portal | 5 | Company setup, program config, employee invites, dashboard, outcomes/exports |
| E12 | Email System | 2 | Day Zero email templates, transactional email sending (invitations, re-engagement, nudges) |
| E13 | Design System & Polish | 3 | Component library, responsive layouts, empty/loading/error states across all screens |
| E14 | Integration & Launch Prep | 3 | End-to-end flow testing, performance optimization, deployment configuration |

**Total: 47 issues**

---

## Critical Path

```
E1-01 → E1-02 → E1-03 → E2-01 → E2-02 → E2-03 → E2-04 → E3-01 → E3-02 → E3-03
→ E4-01 → E4-02 → E4-03 → E4-04 → E4-05 → E5-01 → E5-02 → E5-03
→ E6-01 → E6-02 → E6-03 → E6-04 → E7-01 → E7-02 → E7-03 → E7-04
→ E8-01 → E8-02 → E9-01 → E9-02 → E9-03 → E10-01 → E10-02 → E10-03
→ E11-01 → E11-02 → E11-03 → E11-04 → E11-05 → E12-01 → E12-02
→ E13-01 → E13-02 → E13-03 → E14-01 → E14-02 → E14-03
```

---

# Epic 1 — Development Environment

## E1-01 — Next.js Project Initialization

**Type:** Setup
**Depends on:** Nothing
**Master Plan:** MP §7 Technical Architecture → Frontend, Backend
**Prompt Registry:** —

### Description

Initialize the Next.js 14 project with App Router, TypeScript, Tailwind CSS, and all required dependencies. This is the foundation — every subsequent issue builds on this working project scaffold.

### Implementation Notes

- Use `create-next-app` with TypeScript and App Router enabled
- Install and configure Tailwind CSS with the design system values from MP §11
- Install shadcn/ui and initialize it with the `default` theme, then customize to match the Waypointer design system
- Install all key libraries listed in MP §7: `@anthropic-ai/sdk`, `react-dropzone`, `recharts`, `date-fns`, `zod`, `zustand`, `@tanstack/react-query`, `@react-pdf/renderer`, `docx`
- Configure `tsconfig.json` with strict mode and path aliases (`@/` for `src/`)
- Set up the base layout with Inter and JetBrains Mono fonts loaded from Google Fonts
- Create a `.env.local` file with placeholder variables for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`
- Add `.env.local` to `.gitignore`

### Acceptance Criteria

- [ ] `npm run dev` starts the Next.js dev server without errors on `http://localhost:3000`
- [ ] TypeScript strict mode is enabled and compiles without errors
- [ ] Tailwind CSS is configured with custom colors, spacing, typography, and border-radius tokens matching MP §11 exactly
- [ ] shadcn/ui is initialized and at least one component (`Button`) renders correctly with Waypointer styling
- [ ] All key libraries from MP §7 are installed and importable without errors
- [ ] Inter (Regular, SemiBold) and JetBrains Mono (Medium) are loaded and applied via CSS variables
- [ ] `.env.local` exists with all required placeholder variables and is gitignored
- [ ] Project compiles with `npm run build` with zero errors

---

## E1-02 — Supabase Project Setup

**Type:** Setup
**Depends on:** E1-01
**Master Plan:** MP §7 Technical Architecture → Database, Auth, File Storage
**Prompt Registry:** —

### Description

Create the Supabase project and connect it to the Next.js application. Set up the Supabase client for both client-side and server-side usage, and configure Supabase Storage for file uploads.

### Implementation Notes

- Create the Supabase project (or use an existing one) and capture the URL and keys
- Install `@supabase/supabase-js` and `@supabase/ssr`
- Create two Supabase client utilities:
  - `lib/supabase/client.ts` — browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `lib/supabase/server.ts` — server client using `SUPABASE_SERVICE_ROLE_KEY` for API routes
- Create the Supabase Storage bucket `waypointer-files` with the folder structure specified in MP §10: `uploads/{employee_id}/`, `generated/{employee_id}/`, `reports/{company_id}/`
- Configure storage policies: files are private by default, access via presigned URLs only
- Populate `.env.local` with real Supabase values
- Create a simple health check API route (`/api/health`) that queries Supabase and returns a 200

### Acceptance Criteria

- [ ] Supabase client connects successfully from both browser and server contexts
- [ ] `GET /api/health` returns `{ "status": "ok", "supabase": "connected" }` with a 200 status
- [ ] Supabase Storage bucket `waypointer-files` exists with the correct folder structure
- [ ] Storage policies block direct public access — files are only accessible via presigned URLs
- [ ] `.env.local` contains real Supabase credentials and the app connects without errors
- [ ] Server-side client uses the service role key (not the anon key)

---

## E1-03 — Project Structure and Shared Utilities

**Type:** Setup
**Depends on:** E1-02
**Master Plan:** MP §7 Technical Architecture → Frontend (State Management), MP §9 API Design → Shared Patterns
**Prompt Registry:** —

### Description

Set up the project folder structure, shared type definitions, Zustand stores, React Query configuration, Zod validation schemas, and API error handling utilities that all subsequent issues will use.

### Implementation Notes

- Create the folder structure:
  ```
  src/
    app/           — Next.js App Router pages and API routes
    components/    — Shared React components
    lib/
      supabase/    — Supabase clients (already created)
      ai/          — AI pipeline utilities (placeholder)
      api/         — API client utilities
      validators/  — Zod schemas
    stores/        — Zustand stores
    types/         — TypeScript type definitions
    hooks/         — Custom React hooks
  ```
- Create TypeScript types for all database enums from MP §8 (e.g., `SeniorityLevel`, `ManagementExperience`, `FitScore`, etc.)
- Create Zod schemas that mirror those types for runtime validation
- Set up Zustand with a base auth store (current user, loading state)
- Configure React Query provider with default stale time and retry settings
- Create a shared API error handler that parses the standard error format from MP §9 (`{ error: { code, message, details } }`)
- Create standard error codes as TypeScript constants matching MP §9 (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `SEAT_EXPIRED`, `SEATS_EXHAUSTED`, `AI_ERROR`, `AI_TIMEOUT`)
- Create a shared pagination type matching MP §9

### Acceptance Criteria

- [ ] All database enums from MP §8 have corresponding TypeScript types in `src/types/`
- [ ] Zod schemas exist for each enum and validate correctly (passing valid values, rejecting invalid ones)
- [ ] Zustand auth store is initialized and accessible from any component via `useAuthStore()`
- [ ] React Query provider wraps the application in the root layout
- [ ] API error handler correctly parses the standard error format and returns typed error objects
- [ ] All standard error codes from MP §9 are defined as constants
- [ ] Pagination type is defined and matches the MP §9 response format
- [ ] `npm run build` succeeds with zero TypeScript errors

---

# Epic 2 — Database & Auth

## E2-01 — Database Schema: Enums and Employer Tables

**Type:** Schema
**Depends on:** E1-03
**Master Plan:** MP §8 Database Schema → Enums, Employer Tables (companies, employer_admins, transition_programs)
**Prompt Registry:** —

### Description

Create all database enums and the employer-side tables (companies, employer admins, transition programs) in Supabase. These tables must exist before any employer or employee features can be built.

### Implementation Notes

- Create a Supabase migration file for all enums listed in MP §8 — there are 18 custom types. Create them in the exact order shown in the masterplan to avoid dependency issues.
- Create the `companies`, `employer_admins`, and `transition_programs` tables exactly as specified in MP §8, including all columns, defaults, constraints, and indexes.
- Create the `billing_records` table (lightweight billing tracking).
- Do NOT create RLS policies yet — those are in E2-03.

### Acceptance Criteria

- [ ] All 18 enums from MP §8 are created in the database and can be verified via `SELECT enum_range(NULL::seniority_level)` (and equivalent for each enum)
- [ ] `companies` table exists with all columns, types, and defaults matching MP §8 exactly
- [ ] `employer_admins` table exists with all columns, the `UNIQUE(company_id, email)` constraint, and both indexes
- [ ] `transition_programs` table exists with all columns, defaults, and the company index
- [ ] `billing_records` table exists with all columns and the company index
- [ ] Foreign key constraints are enforced (`employer_admins.company_id` → `companies.id`, etc.)
- [ ] Migration runs cleanly from scratch with no errors

---

## E2-02 — Database Schema: Employee and Feature Tables

**Type:** Schema
**Depends on:** E2-01
**Master Plan:** MP §8 Database Schema → All tables from seats through email_sends
**Prompt Registry:** —

### Description

Create all remaining database tables: seats, employee profiles, career snapshot tables (career_snapshots, work_history, skills, achievements, industries, tools_technologies), role paths, resumes, linkedin_content, job listings, job matches, application kits, applications, outreach messages, interview sessions, weekly plans, confidence check-ins, activity log, transition plans, outcome reports, prompt registry, and email sends.

### Implementation Notes

- Create tables in the exact order shown in MP §8 to respect foreign key dependencies
- Pay close attention to:
  - `seats` has `UNIQUE(program_id, employee_email)` — no duplicate invites within a program
  - `employee_profiles` has `auth_user_id UUID UNIQUE NOT NULL` — one profile per auth user
  - `resumes` has `UNIQUE(employee_id, role_path_id, version)` — versioned per path
  - `weekly_plans` has `UNIQUE(employee_id, week_number)`
  - `confidence_checkins` has `UNIQUE(employee_id, week_number)`
  - `prompt_registry` has `UNIQUE(prompt_id, version)`
- Create ALL indexes specified in MP §8
- The `prompt_registry` table is critical — it stores all AI prompts. Its schema must match MP §8 exactly.

### Acceptance Criteria

- [ ] All tables from MP §8 exist in the database (total: 24 tables including employer tables from E2-01)
- [ ] All unique constraints are enforced (test by attempting duplicate inserts — they should fail)
- [ ] All foreign key constraints cascade correctly (deleting a company cascades to programs, seats, etc.)
- [ ] All indexes from MP §8 are created (verify with `\di` in psql or Supabase SQL editor)
- [ ] The `prompt_registry` table has the correct schema including `prompt_id`, `version`, `system_prompt`, `user_prompt_template`, `output_format`, `model`, `max_tokens`, `temperature`, `is_active`
- [ ] Migration runs cleanly from scratch with no errors
- [ ] Can insert a test row into every table without constraint violations (using valid enum values and foreign keys)

---

## E2-03 — Row-Level Security Policies

**Type:** Schema
**Depends on:** E2-02
**Master Plan:** MP §8 Database Schema → Row-Level Security Policies
**Prompt Registry:** —

### Description

Enable RLS on all tables and create security policies that enforce data isolation between employees, between employer admins and employees, and between different companies.

### Implementation Notes

- Enable RLS on ALL tables
- Employee-owned tables (career_snapshots, work_history, skills, achievements, industries, tools_technologies, role_paths, resumes, linkedin_content, job_matches, application_kits, applications, outreach_messages, interview_sessions, weekly_plans, confidence_checkins, activity_log, transition_plans, outcome_reports) all use the same pattern: `FOR ALL USING (employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()))`
- `employee_profiles`: `FOR ALL USING (auth.uid() = auth_user_id)`
- `seats`: employer admins can access seats for their company's programs (see MP §8 for the exact policy)
- `companies`, `employer_admins`, `transition_programs`: employer admins access their own company's data
- `prompt_registry`: read-only for all authenticated users (prompts are fetched by API routes using the service role key, but adding a read policy ensures the anon key can read them if needed)
- `job_listings`: read-only for all authenticated users (shared data)
- `billing_records`: employer admins for their own company only
- `email_sends`: employer admins for seats in their company's programs
- Service role key bypasses RLS — used by API routes for cross-tenant operations

### Acceptance Criteria

- [ ] RLS is enabled on every table (verify with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)
- [ ] An employee can read/write their own profile but NOT another employee's profile
- [ ] An employee can read/write their own career snapshot, resumes, etc. but NOT another employee's data
- [ ] An employer admin can read seats and programs for their own company but NOT another company's
- [ ] An unauthenticated request returns zero rows from all tables
- [ ] The service role key bypasses all RLS policies (for API route usage)
- [ ] `prompt_registry` rows are readable by any authenticated user
- [ ] `job_listings` rows are readable by any authenticated employee

---

## E2-04 — Authentication Flow

**Type:** Backend + Frontend
**Depends on:** E2-03
**Master Plan:** MP §3 Core User Flows → Flow 2 (Day Zero), MP §7 Technical Architecture → Auth
**Prompt Registry:** —

### Description

Implement the full authentication flow: employee account creation (email/password and Google SSO), employer admin login, session management, and protected routes. Employees activate via a seat token from their invitation email.

### Implementation Notes

- Configure Supabase Auth with email/password and Google OAuth providers
- Create the employee activation endpoint `POST /api/v1/employee/activate` exactly as specified in MP §9:
  - Accepts a `seat_token` (JWT from invitation email), `email`, and `password` (or Google OAuth token)
  - Validates the seat token, checks the seat exists and is in `invited` status, verifies email matches
  - Creates a Supabase Auth user, creates the `employee_profiles` record linked to the seat
  - Updates seat status to `activated`, sets `activated_at` and calculates `expires_at`
  - Returns the employee_id, seat_id, program info, and auth token
- Create employer admin login (standard email/password via Supabase Auth)
- Create auth middleware that:
  - Extracts the JWT from `Authorization: Bearer` header
  - Validates the token with Supabase
  - Determines role (employee or employer_admin) by checking which table the auth_user_id exists in
  - Rejects expired seats for employees
- Create protected route wrappers for both employee and employer pages
- Create a sign-out endpoint that clears the session

### Acceptance Criteria

- [ ] Employee can activate with email/password using a valid seat token — account is created, seat status changes to `activated`, `expires_at` is set
- [ ] Employee can activate with Google SSO using a valid seat token
- [ ] Activation with an invalid or expired seat token returns `INVALID_TOKEN` or `SEAT_EXPIRED` error
- [ ] Activation with a mismatched email returns `EMAIL_MISMATCH` error
- [ ] Employer admin can log in with email/password and access employer routes
- [ ] Employee cannot access employer routes (returns 403)
- [ ] Employer admin cannot access employee routes (returns 403)
- [ ] Unauthenticated requests to protected routes return 401
- [ ] Employee with an expired seat (past `expires_at`) is rejected with `SEAT_EXPIRED`
- [ ] Sign-out clears the session and subsequent requests are rejected

---

# Epic 3 — AI Infrastructure

## E3-01 — Prompt Registry Seeding

**Type:** Backend
**Depends on:** E2-02
**Master Plan:** MP §6 AI Architecture → Prompt Registry Integration
**Prompt Registry:** PR — ALL prompts (1–15)

### Description

Seed the `prompt_registry` database table with all 15 prompts from the prompt registry document. This is the foundation of the AI system — every AI call fetches its prompt from this table.

### Implementation Notes

- Create a seed script (or Supabase migration) that inserts all 15 prompts from `waypointer_prompt_registry.md`
- For each prompt, insert: `prompt_id`, `version` (1), `system_prompt`, `user_prompt_template`, `output_format`, `model`, `max_tokens`, `temperature`, `is_active` (true)
- The prompt IDs are: `EXTRACT_STRUCTURAL`, `EXTRACT_SEMANTIC`, `EXTRACT_ACHIEVEMENTS`, `GENERATE_ROLE_PATHS`, `GENERATE_TRANSITION_PLAN`, `GENERATE_RESUME`, `SCORE_RESUME`, `GENERATE_LINKEDIN`, `SCORE_JOB_BATCH`, `GENERATE_APPLICATION_KIT`, `GENERATE_OUTREACH`, `INTERVIEW_PERSONA`, `ANALYZE_INTERVIEW`, `GENERATE_INTERVIEW_PREP`, `GENERATE_WEEKLY_PLAN`
- Copy the EXACT system prompt and user prompt template text from PR — do not paraphrase or abbreviate
- Copy the exact model, max_tokens, and temperature values from each prompt entry in PR
- Make the seed script idempotent — running it twice should not create duplicates (use `ON CONFLICT DO NOTHING` or check before insert)

### Acceptance Criteria

- [ ] All 15 prompts from PR exist in the `prompt_registry` table
- [ ] Each prompt has `is_active = true` and `version = 1`
- [ ] The `system_prompt` text for each prompt matches the PR document exactly (spot-check at least 3 prompts)
- [ ] The `user_prompt_template` text for each prompt matches the PR document exactly, including all `{{variable}}` placeholders
- [ ] The `model`, `max_tokens`, and `temperature` values match PR for each prompt
- [ ] Running the seed script a second time does not create duplicates
- [ ] Querying `SELECT * FROM prompt_registry WHERE prompt_id = 'EXTRACT_STRUCTURAL' AND is_active = true` returns exactly one row

---

## E3-02 — AI Pipeline Core

**Type:** Backend
**Depends on:** E3-01
**Master Plan:** MP §6 AI Architecture → AI Pipeline Architecture, AI Error Handling
**Prompt Registry:** PR — Overview (How It Works, Variable Injection)

### Description

Build the core AI pipeline that all AI features will use: prompt registry lookup, variable injection, Claude API call, structured output parsing, validation, and error handling.

### Implementation Notes

- Create `lib/ai/pipeline.ts` with the following functions:
  - `fetchPrompt(promptId: string)` — queries `prompt_registry` for the active prompt with the given ID. Returns the system prompt, user prompt template, model config, and output format.
  - `injectVariables(template: string, variables: Record<string, string>)` — replaces all `{{variable_name}}` placeholders in the template with the provided values. Throws if a required variable is missing.
  - `callClaude(systemPrompt: string, userPrompt: string, config: { model, maxTokens, temperature })` — calls the Anthropic API using `@anthropic-ai/sdk`. Returns the raw response text.
  - `parseStructuredOutput<T>(response: string, schema: ZodSchema<T>)` — attempts to parse the response as JSON and validate against the provided Zod schema. Returns the parsed object or throws a validation error.
  - `executeAIPipeline<T>(promptId: string, variables: Record<string, string>, outputSchema: ZodSchema<T>)` — orchestrates the full pipeline: fetch prompt → inject variables → call Claude → parse and validate output.
- Implement error handling per MP §6:
  - 30-second timeout per call
  - If structured output parsing fails, retry once with a correction nudge appended to the user prompt
  - Rate limiting: max 5 concurrent AI calls per user session (use a simple in-memory counter)
  - Log all AI calls with prompt_id, duration, success/failure, and token usage
- Create TypeScript types for all AI output shapes (CareerSnapshot, RolePath, ResumeContent, etc.) based on the output formats in PR

### Acceptance Criteria

- [ ] `fetchPrompt('EXTRACT_STRUCTURAL')` returns the correct prompt data from the database
- [ ] `injectVariables` correctly replaces `{{resume_text}}` with actual text and throws if a required variable is missing
- [ ] `callClaude` successfully calls the Anthropic API and returns a response (test with a simple prompt)
- [ ] `parseStructuredOutput` correctly parses valid JSON and rejects malformed JSON with a clear error
- [ ] `executeAIPipeline` chains all steps correctly: fetch → inject → call → parse → return typed output
- [ ] Retry logic works: if the first call returns malformed JSON, a second call is made with a correction nudge
- [ ] Calls that exceed 30 seconds are terminated with an `AI_TIMEOUT` error
- [ ] All AI calls are logged with prompt_id, duration, and success/failure status
- [ ] TypeScript types exist for all AI output shapes and are exported from `src/types/ai.ts`

---

## E3-03 — AI Pipeline Integration Test

**Type:** Integration
**Depends on:** E3-02
**Master Plan:** MP §6 AI Architecture → Module 1 (Career Snapshot Extraction)
**Prompt Registry:** PR — Prompt 1 (EXTRACT_STRUCTURAL)

### Description

Run an end-to-end integration test of the AI pipeline using the EXTRACT_STRUCTURAL prompt with a sample resume. This validates that the full chain works: prompt registry → variable injection → Claude API → structured output parsing.

### Implementation Notes

- Create a test API route `POST /api/v1/test/ai-pipeline` that:
  - Takes a sample resume text as input
  - Calls `executeAIPipeline('EXTRACT_STRUCTURAL', { resume_text: input }, extractStructuralSchema)`
  - Returns the parsed, validated output
- Use a realistic sample resume text (invent one matching Maya's profile from MP §2)
- Create the Zod schema for EXTRACT_STRUCTURAL output based on the output format in PR Prompt 1
- This test route can be removed before launch but must pass before proceeding

### Acceptance Criteria

- [ ] `POST /api/v1/test/ai-pipeline` with a sample resume returns a valid `ExtractStructural` JSON object
- [ ] The returned object contains `work_history`, `education`, `skills_technical`, `skills_domain`, `tools_technologies` arrays
- [ ] The Zod schema validates the output without errors
- [ ] The response time is under 30 seconds
- [ ] If the route is called with empty resume text, it returns an appropriate error
- [ ] The AI call is logged with prompt_id `EXTRACT_STRUCTURAL`, duration, and success status

---

# Epic 4 — Employee Onboarding

## E4-01 — Welcome Screen

**Type:** Frontend
**Depends on:** E2-04
**Master Plan:** MP §3 Core User Flows → Flow 2 (Day Zero, Steps 1–2), MP §4 Screen Architecture → Screen 1, MP §11 Design System → Emotional Design Notes (Welcome screen)
**Prompt Registry:** —

### Description

Build the Welcome screen (Screen 1) — the first thing an employee sees after clicking through from their invitation email and authenticating. This screen sets the emotional tone for the entire product experience. It must feel calm, reassuring, and action-oriented.

### Implementation Notes

- Route: `/welcome`
- Display the headline "Let's get you moving again." in Display size (36px Inter SemiBold) per MP §11
- If the employer has a custom welcome message (from `companies.welcome_message`), display it as a short note below the headline
- Show a brief summary of what the employee will accomplish in their first session (3–4 bullet points)
- Display the estimated time: "15–20 minutes"
- Single CTA button: "Start your transition plan" → navigates to `/onboarding/import`
- This is the most spacious layout in the product — extra whitespace, minimal UI per MP §11 Emotional Design Notes
- Fetch the employer's brand color and logo from the `companies` table via the seat → program → company relationship
- If `is_branded` is true on the transition program, apply the employer's `brand_color` as the primary accent

### Acceptance Criteria

- [ ] Screen renders at `/welcome` for an authenticated employee
- [ ] Headline "Let's get you moving again." displays in 36px Inter SemiBold
- [ ] Employer's custom welcome message appears if one exists in the database
- [ ] Employer's logo appears in the header if one exists
- [ ] If `is_branded` is true, the CTA button uses the employer's `brand_color` instead of Waypointer Blue
- [ ] Estimated time "15–20 minutes" is visible
- [ ] CTA button navigates to `/onboarding/import`
- [ ] Layout is spacious with generous whitespace — visually distinct from data-dense screens
- [ ] Screen is responsive: single column on mobile (< 768px), centered content on desktop

---

## E4-02 — Profile Intake and Resume Upload

**Type:** Frontend + Backend
**Depends on:** E4-01
**Master Plan:** MP §3 Core User Flows → Flow 3 (Steps 1–2), MP §4 Screen Architecture → Screen 2, MP §5 Feature Set → Onboarding and Profile
**Prompt Registry:** —

### Description

Build the Import Your Background screen (Screen 2) where the employee uploads their resume and provides identity-level inputs (seniority, management experience, level direction, location, work preference, compensation target, work authorization).

### Implementation Notes

- Route: `/onboarding/import`
- Resume upload zone using `react-dropzone`:
  - Accepts PDF and DOCX only, max 10MB
  - Shows file name and size after upload
  - Uploads to Supabase Storage at `uploads/{employee_id}/resume-original.{ext}`
  - Updates `employee_profiles.uploaded_resume_url` with the storage path
- LinkedIn import button (OAuth-based) — implement as a placeholder with "Coming soon" label for v1. The button exists but is disabled.
- Identity-level direct inputs (these are NEVER AI-inferred, per MP §3 and MP §6):
  - Seniority level: dropdown with all 8 values from `seniority_level` enum
  - Management experience: dropdown with all 4 values from `management_experience` enum
  - Level direction: radio buttons with all 3 values from `level_direction` enum
  - Location: city text input + state dropdown + remote toggle
  - Work preference: radio buttons (Remote / Hybrid / On-site)
  - Compensation target: dual-handle range slider ($30K–$300K+ in $10K increments)
  - Work authorization: dropdown with all 5 values from `work_authorization` enum
- Backend: `POST /api/v1/employee/profile` endpoint per MP §9
- Backend: `POST /api/v1/employee/resume/upload` endpoint per MP §9 — multipart form data, validates file type and size
- CTA: "Continue" — enabled only when resume is uploaded AND all required fields are filled

### Acceptance Criteria

- [ ] Screen renders at `/onboarding/import`
- [ ] Resume drag-and-drop zone accepts PDF and DOCX files, rejects other file types with an error message
- [ ] Files over 10MB are rejected with "File too large" error
- [ ] Uploaded file appears in Supabase Storage at the correct path
- [ ] `employee_profiles.uploaded_resume_url` is updated after successful upload
- [ ] All 8 seniority levels appear in the dropdown matching the enum exactly
- [ ] All 4 management experience options appear in the dropdown
- [ ] Level direction renders as radio buttons with all 3 options
- [ ] Compensation range slider works with $10K increments from $30K to $300K+
- [ ] Work authorization dropdown contains all 5 enum values
- [ ] "Continue" button is disabled until resume is uploaded and all required fields are complete
- [ ] `POST /api/v1/employee/profile` saves all fields to the database correctly
- [ ] `POST /api/v1/employee/resume/upload` returns the upload URL and file metadata

---

## E4-03 — Career Snapshot Extraction

**Type:** Backend
**Depends on:** E4-02, E3-03
**Master Plan:** MP §6 AI Architecture → Module 1 (Career Snapshot Extraction), MP §3 Core User Flows → Flow 3 (Step 2)
**Prompt Registry:** PR — Prompt 1 (EXTRACT_STRUCTURAL), Prompt 2 (EXTRACT_SEMANTIC), Prompt 3 (EXTRACT_ACHIEVEMENTS)

### Description

Implement the 3-pass AI extraction pipeline that processes an uploaded resume into a structured career snapshot. This is the first real AI interaction the user experiences.

### Implementation Notes

- Create `POST /api/v1/employee/snapshot/extract` per MP §9
- Pipeline:
  1. Extract raw text from the uploaded file (PDF → text via a PDF parsing library like `pdf-parse`; DOCX → text via `mammoth`)
  2. **Pass 1 — EXTRACT_STRUCTURAL:** Call the AI pipeline with the resume text. Variables: `{{resume_text}}`. Parse output against the structural extraction schema from PR Prompt 1.
  3. **Pass 2 — EXTRACT_SEMANTIC:** Call with the structural extraction JSON + user's identity inputs (seniority, management_exp, level_dir). Variables: `{{structural_extraction_json}}`, `{{seniority}}`, `{{management_exp}}`, `{{level_dir}}`. Parse against semantic schema from PR Prompt 2.
  4. **Pass 3 — EXTRACT_ACHIEVEMENTS:** Call with the resume text and structural data. Variables as specified in PR Prompt 3. Parse against achievements schema.
- After all 3 passes, create database records:
  - Insert `career_snapshots` row with `career_narrative` from semantic pass and `raw_extraction` storing the full raw output
  - Insert `work_history` rows from structural extraction
  - Insert `skills` rows (combining technical and domain skills from structural + semantic)
  - Insert `achievements` rows from achievements pass
  - Insert `industries` rows from semantic pass
  - Insert `tools_technologies` rows from structural extraction
- Handle edge cases from MP §3: scanned image PDFs (attempt OCR, show fallback message), very short resumes (extract what's available, prompt manual input)
- The endpoint should return the complete snapshot data for the review screen

### Acceptance Criteria

- [ ] `POST /api/v1/employee/snapshot/extract` triggers the 3-pass pipeline and returns the full snapshot
- [ ] Pass 1 (EXTRACT_STRUCTURAL) extracts work_history, education, skills, tools from the resume text
- [ ] Pass 2 (EXTRACT_SEMANTIC) adds industries, career trajectory, and primary function area with confidence scores
- [ ] Pass 3 (EXTRACT_ACHIEVEMENTS) extracts achievement statements with impact types and metric flags
- [ ] All extracted data is persisted to the correct database tables (career_snapshots, work_history, skills, achievements, industries, tools_technologies)
- [ ] The `raw_extraction` JSONB field stores the complete raw AI output for debugging
- [ ] Career narrative (2–3 sentences) is generated and stored
- [ ] If resume text extraction fails, a meaningful error is returned (not a generic 500)
- [ ] The endpoint completes within 30 seconds for a typical 2-page resume

---

## E4-04 — Career Snapshot Review Screen

**Type:** Frontend
**Depends on:** E4-03
**Master Plan:** MP §3 Core User Flows → Flow 3 (Steps 3–4), MP §4 Screen Architecture → Screen 3, MP §5 Feature Set → Onboarding and Profile, MP §11 Design System → Emotional Design Notes (Career Snapshot)
**Prompt Registry:** —

### Description

Build the Career Snapshot Review screen (Screen 3) where the employee reviews the AI-extracted profile and can edit any field. This screen must feel information-dense but manageable, with clear editing affordances.

### Implementation Notes

- Route: `/onboarding/snapshot`
- Display sections:
  - **Identity fields** (seniority, management experience, level direction) at the top as confirmed facts — displayed as editable dropdowns, NOT AI-extracted
  - **Career narrative:** 2–3 sentence AI-generated summary, editable as a text area
  - **Work history:** Timeline of roles with company, title, dates, duration. Each entry is individually editable.
  - **Key skills:** Displayed as editable chips grouped by category (technical, domain, soft skills). User can add/remove chips.
  - **Accomplishments:** Top 8–12 achievement statements, each tagged with impact type. Source text tooltip on hover showing the original resume bullet.
  - **Industries:** Editable chips
  - **Tools & tech stack:** Editable chips
- Editing operations:
  - Add/remove skill chips
  - Edit achievement statements inline
  - Edit work history entries (title, company, dates)
  - Edit career narrative
- Backend endpoints:
  - `PATCH /api/v1/employee/snapshot` — partial update per MP §9 (skills_add, skills_remove, achievements_update, work_history_update, career_narrative)
  - `POST /api/v1/employee/snapshot/confirm` — marks the snapshot as confirmed
- CTA: "Looks right" → calls confirm endpoint → navigates to `/onboarding/paths`
- Design: compact, information-dense, but with clear visual hierarchy per MP §11

### Acceptance Criteria

- [ ] Screen renders at `/onboarding/snapshot` with all extracted data displayed
- [ ] Identity fields (seniority, management experience, level direction) appear at the top as editable dropdowns
- [ ] Career narrative is editable as a text area and saves on blur/confirmation
- [ ] Work history shows all extracted roles in chronological order with company, title, dates
- [ ] Skills display as chips grouped by category; user can click × to remove or use an "Add skill" input to add new ones
- [ ] Achievements display with impact type tags; hovering shows the source resume text in a tooltip
- [ ] Industries and tools display as editable chips
- [ ] `PATCH /api/v1/employee/snapshot` successfully updates individual fields without affecting others
- [ ] "Looks right" button calls confirm endpoint and navigates to `/onboarding/paths`
- [ ] Screen is responsive: stacked layout on mobile, multi-column on desktop

---

## E4-05 — Onboarding Loading and Transition States

**Type:** Frontend
**Depends on:** E4-03, E4-04
**Master Plan:** MP §3 Core User Flows → Flow 3 (Step 2 loading state), MP §11 Design System → Interaction Principles (Loading states)
**Prompt Registry:** —

### Description

Build the loading and transition states for the onboarding flow — specifically the "Analyzing your background..." loading screen that appears while the 3-pass extraction pipeline runs, and any error states.

### Implementation Notes

- After the user clicks "Continue" on Screen 2, show a full-screen loading state:
  - Contextual message: "Analyzing your background..." (changes to "Extracting your skills...", "Identifying your achievements..." as passes complete if possible)
  - Skeleton loading pattern underneath (grey placeholder shapes per MP §11)
  - Estimated time: "This usually takes 10–15 seconds"
- If extraction takes longer than 15 seconds, show: "This is taking a bit longer than usual..."
- If extraction fails, show an error state with:
  - A clear message explaining what happened
  - For OCR-failed PDFs: "We had trouble reading your resume. You can try uploading a Word document version, or add your details manually."
  - A retry button
  - A "Add details manually" fallback link
- Ensure the loading state feels polished — this is the first AI interaction and sets expectations

### Acceptance Criteria

- [ ] After clicking "Continue" on Screen 2, a loading screen appears with "Analyzing your background..."
- [ ] The loading screen uses skeleton UI patterns, not a spinner
- [ ] After 15 seconds without completion, the message updates to indicate longer-than-usual processing
- [ ] On successful extraction, the loading screen transitions smoothly to the Snapshot Review screen
- [ ] On extraction failure, a clear error message is shown with a retry button
- [ ] For unreadable PDFs, the specific message from MP §3 is shown
- [ ] The "Add details manually" fallback link navigates to a version of Screen 3 with empty/manual fields

---

# Epic 5 — Role Targeting

## E5-01 — Role Path Generation

**Type:** Backend + Frontend
**Depends on:** E4-04
**Master Plan:** MP §3 Core User Flows → Flow 4, MP §4 Screen Architecture → Screen 4, MP §6 AI Architecture → Module 2 (Role Path Recommendation)
**Prompt Registry:** PR — Prompt 4 (GENERATE_ROLE_PATHS)

### Description

Build the Target Role Paths screen (Screen 4) and the backend endpoint that generates 3 AI-recommended role paths based on the user's career snapshot and preferences.

### Implementation Notes

- Route: `/onboarding/paths`
- Backend: `POST /api/v1/employee/paths/generate` per MP §9
  - Assembles context: career snapshot + seniority + management_exp + level_dir + location + comp target + work preference
  - Calls AI pipeline with `GENERATE_ROLE_PATHS` prompt from PR Prompt 4
  - Variables: as specified in PR Prompt 4 user prompt template
  - Parses output into 3 `RolePath` objects
  - Persists to `role_paths` table
- Frontend: Display 3 role path cards, each showing:
  - Title (e.g., "Customer Success Manager at B2B SaaS")
  - "Why it fits" narrative (2–3 sentences referencing specific experience)
  - Salary band range
  - Demand level (High / Medium / Low) with color coding
  - Confidence score (percentage)
  - Skills overlap (visual bar showing percentage)
  - Missing pieces / gap analysis
- Selection: user can select one as primary, others as secondary, or skip
- "Add custom path" link at the bottom per MP §3
- "Suggest different paths" link to regenerate per MP §3
- CTA: "Build my search plan" — enabled when at least one path is selected

### Acceptance Criteria

- [ ] `POST /api/v1/employee/paths/generate` returns exactly 3 role paths with all required fields
- [ ] Each role path includes: title, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis
- [ ] All 3 paths are persisted to the `role_paths` table linked to the employee
- [ ] Screen renders 3 role path cards at `/onboarding/paths` with all data visible
- [ ] User can select one path as primary (highlighted with blue border/background)
- [ ] User can select additional paths as secondary
- [ ] "Build my search plan" button is disabled until at least one path is selected
- [ ] Demand level is color-coded: High = green, Medium = amber, Low = red per MP §11 semantic colors
- [ ] Skills overlap displays as a visual progress bar

---

## E5-02 — Role Path Selection, Custom Paths, and Regeneration

**Type:** Backend + Frontend
**Depends on:** E5-01
**Master Plan:** MP §3 Core User Flows → Flow 4 (Steps 2–3, Edge cases), MP §9 API Design → Role Targeting endpoints
**Prompt Registry:** PR — Prompt 4 (GENERATE_ROLE_PATHS) for regeneration

### Description

Implement path selection persistence, custom path creation, and path regeneration. These are the interaction patterns that let the user refine their role targeting before moving to the transition plan.

### Implementation Notes

- Backend: `POST /api/v1/employee/paths/select` per MP §9 — accepts `primary_path_id` and `secondary_path_ids`
- Backend: `POST /api/v1/employee/paths/custom` per MP §9 — accepts a `title` string, calls AI pipeline to generate the same card structure for a user-defined role
- Backend: `POST /api/v1/employee/paths/regenerate` per MP §9 — accepts `rejected_path_ids` and optional `feedback` text, calls GENERATE_ROLE_PATHS with a "do not suggest these again" instruction and the feedback
- Frontend: Wire up all interactions on Screen 4:
  - Path selection updates the database and visual state
  - "Add custom path" opens a form for entering a custom role title, generates a card on submit
  - "Suggest different paths" triggers regeneration, replaces unselected cards
- After selection, CTA navigates to the transition plan generation

### Acceptance Criteria

- [ ] `POST /api/v1/employee/paths/select` persists the primary and secondary selections to `role_paths.is_primary` and `role_paths.is_selected`
- [ ] `POST /api/v1/employee/paths/custom` accepts a title, generates a full role path card via AI, and persists it with `is_custom = true`
- [ ] `POST /api/v1/employee/paths/regenerate` generates new paths that exclude previously rejected ones
- [ ] Regenerated paths include the user's feedback context in the AI call
- [ ] UI correctly reflects selection state (primary highlighted, secondaries checked)
- [ ] Custom path card appears in the UI with the same structure as AI-generated paths
- [ ] After selecting paths, clicking "Build my search plan" proceeds to transition plan generation
- [ ] Selecting 0 paths keeps the CTA disabled with a "Select at least one target path to continue" prompt

---

## E5-03 — Transition Plan Generation

**Type:** Backend + Frontend
**Depends on:** E5-02
**Master Plan:** MP §3 Core User Flows → Flow 5, MP §4 Screen Architecture → Screen 5, MP §6 AI Architecture → Module 10 (Transition Plan Summary)
**Prompt Registry:** PR — Prompt 5 (GENERATE_TRANSITION_PLAN)

### Description

Build the Transition Plan Dashboard (Screen 5) — the employee's command center for the rest of their time on the platform. Generate the initial transition plan using AI after role path selection.

### Implementation Notes

- Route: `/dashboard`
- Backend: `POST /api/v1/employee/plan/generate` per MP §9
  - Calls AI pipeline with `GENERATE_TRANSITION_PLAN` prompt from PR Prompt 5
  - Variables: career snapshot, selected role paths, preferences
  - Parses into `TransitionPlan` object
  - Persists to `transition_plans` table
- Frontend: Dashboard layout with:
  - **Header:** Selected target paths, recommended search strategy text, readiness score (percentage with breakdown)
  - **First 7-day plan:** Day-by-day task list
  - **Quick-action CTA buttons:** "Build my resumes", "Update my LinkedIn", "See recommended jobs", "Practice interviews"
  - **Timeline:** Visual timeline showing the 90-day access window with suggested milestones
- This screen also serves as the main navigation hub — the sidebar nav (per MP §4) should be visible here and on all subsequent screens
- Implement the sidebar navigation: Home, Resumes, Jobs, Outreach, Interviews, Progress

### Acceptance Criteria

- [ ] `POST /api/v1/employee/plan/generate` returns a valid transition plan with search_strategy, readiness_score, readiness_breakdown, first_week_plan, and suggested_timeline
- [ ] Transition plan is persisted to the `transition_plans` table
- [ ] Dashboard renders at `/dashboard` with all sections populated from the transition plan
- [ ] Readiness score displays as a percentage with a breakdown showing which areas are pulling it down
- [ ] First 7-day plan shows day-by-day tasks
- [ ] Quick-action buttons navigate to the correct routes: `/resumes`, `/linkedin`, `/jobs`, `/interviews`
- [ ] Sidebar navigation is visible and functional with all 6 employee nav items from MP §4
- [ ] 90-day timeline displays with milestone markers
- [ ] Screen is responsive: sidebar collapses to icons on mobile

---

# Epic 6 — Resume & LinkedIn

## E6-01 — Resume Generation

**Type:** Backend
**Depends on:** E5-03
**Master Plan:** MP §6 AI Architecture → Module 3 (Resume Generation)
**Prompt Registry:** PR — Prompt 6 (GENERATE_RESUME), Prompt 7 (SCORE_RESUME)

### Description

Implement the resume generation backend: generate a tailored resume for a specific role path, score it on three quality dimensions, and persist the results.

### Implementation Notes

- Backend: `POST /api/v1/employee/resume/generate` per MP §9
  - Assembles context: career snapshot + selected role path + user preferences
  - Calls AI pipeline with `GENERATE_RESUME` prompt from PR Prompt 6
  - Variables include: career snapshot JSON, role path title, why_it_fits, skills overlap, tone
  - Parses output into `ResumeContent` object
  - Then calls `SCORE_RESUME` prompt from PR Prompt 7 to evaluate the generated resume
  - Persists both the content and scores to the `resumes` table
- The `GENERATE_RESUME` prompt has a `{{tone}}` variable — default to `professional` for first generation
- `SCORE_RESUME` returns three scores (0–100): ats_score, clarity_score, specificity_score, plus detailed feedback (missing_metrics, weak_bullets, suggestions)
- Store the complete resume structure in `resumes.full_content` as JSONB for rendering

### Acceptance Criteria

- [ ] `POST /api/v1/employee/resume/generate` generates a complete resume for the specified role path
- [ ] Generated resume includes: summary_statement, skills_section, experience_section (with rewritten bullets), and keywords
- [ ] Resume is scored on 3 dimensions: ATS strength, clarity, specificity (each 0–100)
- [ ] Score feedback includes specific actionable items (missing metrics, weak bullets, suggestions)
- [ ] All data is persisted to the `resumes` table with correct foreign keys
- [ ] The `tone` parameter defaults to `professional` and is stored in the record
- [ ] `full_content` JSONB contains the complete resume structure for rendering

---

## E6-02 — Resume Workspace Screen

**Type:** Frontend
**Depends on:** E6-01
**Master Plan:** MP §3 Core User Flows → Flow 6 (Steps 1–4), MP §4 Screen Architecture → Screen 6, MP §11 Design System
**Prompt Registry:** —

### Description

Build the Resume Workspace screen (Screen 6) where the employee views, edits, and refines their generated resumes. This includes tabs for each path, the resume preview, editing panel, and regeneration capabilities.

### Implementation Notes

- Route: `/resumes`
- Display tabs for each selected path (e.g., "CSM at B2B SaaS", "Implementation Consultant")
- **Left pane — Resume preview:** Render the resume content in a styled preview matching the layout from MP §10 (name, summary, skills, experience, education, certifications)
- **Right pane — Editing panel:**
  - ATS strength score, clarity score, specificity score (each as a visual gauge/number)
  - Missing metrics warnings with suggested additions
  - Weak bullet warnings with suggested rewrites (click to apply)
  - Tone selector: Professional / Confident / Conversational (radio buttons)
- Inline editing: user can click any section in the resume preview to edit it directly
- Accept/reject individual suggestions from the scoring feedback
- Tone switching triggers `POST /api/v1/employee/resume/:id/regenerate` with the new tone
- Regeneration creates a new version (increments `resumes.version`)

### Acceptance Criteria

- [ ] Screen renders at `/resumes` with tabs for each selected role path
- [ ] Resume preview displays the full resume content: name, summary, skills, experience, education
- [ ] Editing panel shows all three quality scores as visual indicators
- [ ] Missing metrics warnings appear with specific, actionable suggestions
- [ ] Weak bullet warnings appear with "click to apply" suggested rewrites
- [ ] Clicking a suggestion applies it to the resume preview in real-time
- [ ] Tone selector regenerates the resume when switched (new version created)
- [ ] User can edit any section inline (summary, skills, bullets) and changes are saved
- [ ] Tabs switch between path-specific resume variants correctly

---

## E6-03 — Resume Download (PDF and DOCX)

**Type:** Backend
**Depends on:** E6-02
**Master Plan:** MP §10 Document Generation System → Resume Generation Pipeline, Resume Template
**Prompt Registry:** —

### Description

Implement resume download in both PDF and DOCX formats using the document generation pipeline specified in the masterplan.

### Implementation Notes

- Backend: `POST /api/v1/employee/resume/:id/download` per MP §9
  - Accepts `format: "pdf" | "docx"`
  - **PDF generation:** Use `@react-pdf/renderer` server-side. Create a React component that takes `ResumeContent` JSON as props and renders the layout from MP §10:
    - Page setup: US Letter, 0.75" margins
    - Typography: Inter Bold 18pt for name, Inter SemiBold 12pt uppercase for section headers, Inter Regular 10pt for body
    - Sections in order: Name/contact (centered), Summary, Key Skills (comma-separated), Experience (reverse chronological), Education, Certifications
  - **DOCX generation:** Use the `docx` npm package. Builder function constructs Word document with standard styles (Heading 1 for name, Heading 2 for sections, Normal for body). No tables, no text boxes — ATS-friendly per MP §10.
  - Upload generated file to Supabase Storage at `generated/{employee_id}/resume-{path_id}-v{version}.{format}`
  - Return a presigned URL with 1-hour expiry

### Acceptance Criteria

- [ ] `POST /api/v1/employee/resume/:id/download?format=pdf` returns a presigned URL to a valid PDF file
- [ ] `POST /api/v1/employee/resume/:id/download?format=docx` returns a presigned URL to a valid DOCX file
- [ ] PDF has correct layout: US Letter, 0.75" margins, centered name, sections in order per MP §10
- [ ] PDF typography matches MP §10: Inter Bold 18pt name, Inter SemiBold 12pt section headers, Inter Regular 10pt body
- [ ] DOCX uses standard Word styles (no tables, no text boxes) for ATS compatibility
- [ ] Files are stored in Supabase Storage at the correct path
- [ ] Presigned URLs expire after 1 hour
- [ ] Files are only accessible to the owning employee (RLS + presigned URL)

---

## E6-04 — LinkedIn Optimizer

**Type:** Backend + Frontend
**Depends on:** E5-03
**Master Plan:** MP §3 Core User Flows → Flow 6 (Steps 5–6), MP §4 Screen Architecture → Screen 7, MP §6 AI Architecture → Module 4
**Prompt Registry:** PR — Prompt 8 (GENERATE_LINKEDIN)

### Description

Build the LinkedIn Optimizer screen (Screen 7) and the backend that generates LinkedIn profile optimization content tailored to the user's primary target path.

### Implementation Notes

- Route: `/linkedin`
- Backend: `POST /api/v1/employee/linkedin/generate` per MP §9
  - Calls AI pipeline with `GENERATE_LINKEDIN` prompt from PR Prompt 8
  - Variables: career snapshot, primary role path
  - Parses into `LinkedInContent` object
  - Persists to `linkedin_content` table
- Frontend: Display each generated section with a copy button next to it:
  - Headline
  - About section
  - Experience bullet refresh (per role)
  - Featured section suggestions
  - Skill list recommendations
  - "Open to Work" guidance
  - Recruiter-facing profile tips
- Backend: `POST /api/v1/employee/linkedin/mark-updated` per MP §9
- "Mark profile updated" button → updates `linkedin_content.is_marked_updated` and logs activity → increases readiness score

### Acceptance Criteria

- [ ] `POST /api/v1/employee/linkedin/generate` returns all LinkedIn content fields per MP §9
- [ ] Content is persisted to `linkedin_content` table
- [ ] Screen renders at `/linkedin` with all sections displayed
- [ ] Each section has a "Copy" button that copies the text to clipboard with visual confirmation
- [ ] "Mark profile updated" button updates the database and shows a success state
- [ ] Activity is logged to `activity_log` with action `linkedin_updated`
- [ ] Screen is accessible from sidebar navigation under "Resumes" or a dedicated nav item

---

# Epic 7 — Job Discovery

## E7-01 — Job Data Provider Integration

**Type:** Backend
**Depends on:** E2-02
**Master Plan:** MP §7 Technical Architecture → Backend (Job Data)
**Prompt Registry:** —

### Description

Integrate with a third-party job data provider to fetch job listings. Abstract the provider behind a `JobDataProvider` interface so the source can be swapped without touching matching logic.

### Implementation Notes

- Create `lib/jobs/provider.ts` with a `JobDataProvider` interface:
  ```typescript
  interface JobDataProvider {
    searchJobs(params: { keywords: string[]; location: string; remote: boolean; page: number }): Promise<JobListing[]>;
    getJobDetail(externalId: string): Promise<JobListing | null>;
  }
  ```
- Implement the JSearch provider (https://www.openwebninja.com/api/jsearch). JSearch aggregates real-time job listings from Google for Jobs and public sources. It returns structured job data including titles, descriptions, requirements, salaries, locations, employer info, and application links. Use the Pro tier ($25/month, 10,000 requests, 5/second rate limit) for development and scale to Mega ($150/month, 200,000 requests) for production.
- Create a job ingestion function that:
  - Fetches listings from the provider
  - Normalizes them to the `job_listings` table schema
  - Upserts into the database (using `external_id` for deduplication)
  - Marks stale listings as `is_active = false`
- Add `JOB_DATA_API_KEY` to `.env.local`

### Acceptance Criteria

- [ ] `JobDataProvider` interface is defined and exported
- [ ] At least one concrete provider implementation exists and can fetch real job listings
- [ ] Fetched listings are normalized to the `job_listings` table schema
- [ ] Listings are upserted into the database without creating duplicates (verified by `external_id`)
- [ ] Stale listings (not returned in the latest fetch) are marked `is_active = false`
- [ ] The provider is swappable — changing the implementation class does not require changes in consuming code
- [ ] API key is stored in `.env.local` and not hardcoded

---

## E7-02 — Job Matching and Scoring

**Type:** Backend
**Depends on:** E7-01, E5-03
**Master Plan:** MP §6 AI Architecture → Module 5 (Job Matching and Scoring), MP §3 Core User Flows → Flow 7
**Prompt Registry:** PR — Prompt 9 (SCORE_JOB_BATCH)

### Description

Implement the job matching engine that scores job listings against the employee's profile and target paths using AI.

### Implementation Notes

- Create a job matching function that:
  1. Fetches active job listings that match basic criteria (location, remote preference)
  2. Batches them (up to 10 per call per PR Prompt 9 specification)
  3. Calls AI pipeline with `SCORE_JOB_BATCH` for each batch
  4. Variables: career snapshot, role paths, and the batch of job listing objects (title, company, description, requirements)
  5. Parses the output into `JobScore` objects
  6. Persists to `job_matches` table with: fit score, match explanation, competition level, recommended action
- Create `GET /api/v1/employee/jobs` per MP §9 — paginated, filterable by path_id and fit score
- Recommended actions are: `apply_now`, `reach_out_first`, `seek_referral`, `save_for_later`, `skip`

### Acceptance Criteria

- [ ] Job matching function scores listings against the employee's profile and paths
- [ ] AI scoring uses the `SCORE_JOB_BATCH` prompt with up to 10 listings per batch
- [ ] Each scored job has: fit (high_fit/stretch/low_fit), match_explanation, competition_level, recommended_action
- [ ] All scores are persisted to `job_matches` table
- [ ] `GET /api/v1/employee/jobs` returns paginated, scored job matches
- [ ] Filtering by `path_id` returns only matches for that specific role path
- [ ] Filtering by `fit` returns only matches with the specified score level
- [ ] Match explanations are specific and reference the user's actual experience (not generic text)

---

## E7-03 — Recommended Jobs Feed and Job Detail Screen

**Type:** Frontend
**Depends on:** E7-02
**Master Plan:** MP §3 Core User Flows → Flow 7 (Steps 1–4), MP §4 Screen Architecture → Screens 8 and 9, MP §11 Design System → Emotional Design Notes (Job Feed)
**Prompt Registry:** —

### Description

Build the Recommended Jobs Feed (Screen 8) and Job Detail + Application Kit screen (Screen 9).

### Implementation Notes

- Route: `/jobs` (feed) and `/jobs/:id` (detail)
- **Jobs Feed (Screen 8):**
  - Job cards showing: title, company name, location (with remote/hybrid/on-site tag), fit score badge (color-coded per MP §11), match explanation (1–2 sentences), competition level, recommended action
  - Filters: path, fit score, location, company size, recommended action
  - Sort: fit score, date posted, company
  - Empty state per MP §3: "We didn't find strong matches today. Try expanding your location radius or adding a secondary path."
  - Tight card layout similar to email clients per MP §11 design notes
- **Job Detail (Screen 9):**
  - Left pane: Job description summary (AI-condensed), match analysis (skills matched, missing, experience alignment, comp alignment), likely interview themes
  - Right pane: Application kit (generated on demand via `POST /api/v1/employee/jobs/:match_id/kit`)
  - CTAs: "Use this application kit", "Save", "Track as applied"

### Acceptance Criteria

- [ ] Jobs feed renders at `/jobs` with scored job cards
- [ ] Fit score badges are color-coded: High Fit = green, Stretch = amber, Low Fit = red
- [ ] Match explanations appear on each card and reference specific user experience
- [ ] Filters work: filtering by path, fit score, and recommended action produces correct results
- [ ] Empty state message appears when no jobs match the criteria
- [ ] Clicking a job card navigates to `/jobs/:id` with full detail view
- [ ] Job detail left pane shows match analysis with skills matched/missing
- [ ] Application kit generates on demand and displays in the right pane
- [ ] "Track as applied" creates an entry in `applications` table with status `applied`

---

## E7-04 — Application Kit Generation

**Type:** Backend
**Depends on:** E7-02
**Master Plan:** MP §6 AI Architecture → Module 6 (Application Kit Generation), MP §3 Core User Flows → Flow 7 (Step 3)
**Prompt Registry:** PR — Prompt 10 (GENERATE_APPLICATION_KIT)

### Description

Implement the application kit generation that creates a complete application package for a specific job listing.

### Implementation Notes

- Backend: `POST /api/v1/employee/jobs/:match_id/kit` per MP §9
  - Calls AI pipeline with `GENERATE_APPLICATION_KIT` prompt from PR Prompt 10
  - Variables: career snapshot, relevant role path, resume content, full job description
  - Parses into `ApplicationKit` object
  - Persists to `application_kits` table
- Application kit includes: intro_paragraph, recruiter_message, hiring_manager_message, referral_request, resume_edits (suggested tweaks), interview_themes (likely questions)
- If the user hasn't completed resume generation, the kit still generates but the resume recommendation section shows a prompt to build their resume first

### Acceptance Criteria

- [ ] `POST /api/v1/employee/jobs/:match_id/kit` generates a complete application kit
- [ ] Kit includes all fields: intro_paragraph, recruiter_message, hiring_manager_message, referral_request, resume_edits, interview_themes
- [ ] Kit is persisted to `application_kits` table linked to the job match
- [ ] Messages are personalized to the specific job and company (not generic templates)
- [ ] If the user has no resume generated yet, the response includes a `resume_recommendation` field prompting them to build their resume first
- [ ] Calling the endpoint a second time for the same match returns the existing kit (doesn't regenerate)

---

# Epic 8 — Outreach

## E8-01 — Outreach Message Generation

**Type:** Backend + Frontend
**Depends on:** E5-03
**Master Plan:** MP §3 Core User Flows → Flow 8, MP §4 Screen Architecture → Screen 10, MP §6 AI Architecture → Module 7
**Prompt Registry:** PR — Prompt 11 (GENERATE_OUTREACH)

### Description

Build the Outreach Builder screen (Screen 10) and the backend for generating context-aware outreach messages.

### Implementation Notes

- Route: `/outreach`
- Backend: `POST /api/v1/employee/outreach/generate` per MP §9
  - Calls AI pipeline with `GENERATE_OUTREACH` prompt from PR Prompt 11
  - Variables: career snapshot, target role, recipient type, relationship strength, personal context, tone
  - Parses into `OutreachKit` object
  - Persists to `outreach_messages` table
- Frontend form:
  - Step 1: Select recipient type (radio buttons): Recruiter, Hiring manager, Former colleague, Alumni, Referral request, Follow-up
  - Step 2: Context fields (conditional on recipient type): role pursuing (dropdown of paths), job or company, relationship strength (Cold/Warm/Close), personal context (optional text)
  - "Generate" button triggers the AI call
- Display generated messages:
  - LinkedIn message (< 300 characters)
  - Email version (3–4 sentences)
  - Follow-up version (for 5–7 days later)
  - Tone toggle: Warmer / More formal (regenerates)
  - Guidance box: when to use, follow-up timing, what not to say
- Copy buttons on each message variant

### Acceptance Criteria

- [ ] `POST /api/v1/employee/outreach/generate` returns linkedin_message, email_message, followup_message, and guidance
- [ ] LinkedIn message is under 300 characters
- [ ] Messages are personalized based on role, company, relationship strength, and personal context
- [ ] Outreach messages are persisted to `outreach_messages` table
- [ ] Screen renders at `/outreach` with the two-step form
- [ ] Conditional fields appear/disappear based on recipient type selection
- [ ] Generated messages display with copy buttons that work
- [ ] Tone toggle regenerates messages with the selected tone
- [ ] Guidance box shows timing, etiquette, and anti-pattern advice

---

## E8-02 — Outreach Tracking

**Type:** Backend + Frontend
**Depends on:** E8-01
**Master Plan:** MP §3 Core User Flows → Flow 8 (Step 4), MP §9 API Design → Outreach endpoints
**Prompt Registry:** —

### Description

Implement the ability to mark outreach messages as sent and track outreach activity in the progress system.

### Implementation Notes

- Backend: `POST /api/v1/employee/outreach/:id/mark-sent` per MP §9
  - Updates `outreach_messages.is_sent = true` and `sent_at = NOW()`
  - Logs to `activity_log` with action `outreach_sent`
- Frontend: Add "Mark as sent" button below generated messages
- Show sent/unsent status on previously generated outreach messages
- Add a list view of all generated outreach messages (sent and unsent) accessible from the outreach screen

### Acceptance Criteria

- [ ] `POST /api/v1/employee/outreach/:id/mark-sent` updates the record and logs the activity
- [ ] "Mark as sent" button appears on generated messages and shows confirmation when clicked
- [ ] Previously generated outreach messages are listable with sent/unsent status
- [ ] Activity log records `outreach_sent` events with metadata
- [ ] Sent count is accessible for the progress tracker

---

# Epic 9 — Interview System

## E9-01 — Interview Prep Hub

**Type:** Backend + Frontend
**Depends on:** E5-03
**Master Plan:** MP §3 Core User Flows → Flow 9 (Step 1), MP §4 Screen Architecture → Screen 11, MP §6 AI Architecture → Module 8 (pre-session)
**Prompt Registry:** PR — Prompt 14 (GENERATE_INTERVIEW_PREP)

### Description

Build the Interview Prep Hub screen (Screen 11) that shows role-specific preparation content and provides the entry point for mock interviews.

### Implementation Notes

- Route: `/interviews`
- Backend: `GET /api/v1/employee/interviews/prep` per MP §9
  - Can optionally accept `path_id` and `job_match_id` for company-specific prep
  - Calls AI pipeline with `GENERATE_INTERVIEW_PREP` prompt from PR Prompt 14
  - Returns: common questions, behavioral questions, company-specific prep, strengths to emphasize, weak spots, compensation prep
- Frontend: Organized by target paths with sections for each type of prep content
- CTA: "Start Mock Interview" button opens a configuration modal:
  - Interview type: General for role / Specific company (dropdown of saved jobs)
  - Format: Behavioral / Technical / Mixed
  - Duration: 10 / 15 / 20 minutes
  - Difficulty: Standard / Challenging

### Acceptance Criteria

- [ ] Screen renders at `/interviews` with prep content organized by role path
- [ ] Prep content includes: common questions, behavioral questions, strengths, weak spots, compensation prep
- [ ] Company-specific prep appears when the user has saved jobs
- [ ] "Start Mock Interview" button opens a configuration modal with all 4 settings
- [ ] Configuration options match the enums: interview_format (behavioral/technical/mixed), interview_difficulty (standard/challenging)
- [ ] Duration options are 10, 15, and 20 minutes

---

## E9-02 — Mock Interview Session (ElevenLabs Integration)

**Type:** Backend + Frontend
**Depends on:** E9-01
**Master Plan:** MP §3 Core User Flows → Flow 9 (Steps 2–4), MP §4 Screen Architecture → Screen 12, MP §6 AI Architecture → Module 8
**Prompt Registry:** PR — Prompt 12 (INTERVIEW_PERSONA)

### Description

Implement the voice-based mock interview session using ElevenLabs Conversational AI. This is the most technically complex feature — it involves real-time voice interaction.

### Implementation Notes

- Route: `/interviews/session`
- Backend: `POST /api/v1/employee/interviews/session/start` per MP §9
  - Assembles the interviewer persona prompt using `INTERVIEW_PERSONA` from PR Prompt 12
  - Variables: role path, company (if company-specific), format, difficulty, duration
  - Configures an ElevenLabs Conversational AI agent with the persona prompt
  - Returns the `elevenlabs_config` (agent_id, conversation_id, signed_url for WebSocket)
  - Creates an `interview_sessions` record in the database
- Frontend: Mock Interview Session screen (Screen 12):
  - Timer showing remaining time
  - Visual voice indicator (waveform or pulse animation)
  - "Pause" button and "End early" button
  - No text transcript during session (to maintain immersion per MP §3)
  - Microphone permission request with clear browser instructions if denied
- On session end: collect the transcript from ElevenLabs, call the complete endpoint
- Backend: `POST /api/v1/employee/interviews/session/:id/complete` per MP §9
  - Receives the transcript
  - Stores it in the database
  - Triggers feedback analysis (E9-03)

### Acceptance Criteria

- [ ] `POST /api/v1/employee/interviews/session/start` creates an ElevenLabs conversation agent with the correct persona prompt
- [ ] The endpoint returns valid WebSocket connection details
- [ ] Interview session record is created in the database with correct metadata
- [ ] Frontend establishes a WebSocket voice connection with ElevenLabs
- [ ] Timer counts down from the selected duration
- [ ] Voice indicator provides visual feedback when the system is listening/speaking
- [ ] "End early" button ends the session gracefully and proceeds to feedback
- [ ] If microphone permission is denied, clear instructions are shown per MP §3
- [ ] Sessions under 2 minutes show a "try again" prompt instead of generating feedback
- [ ] `POST /api/v1/employee/interviews/session/:id/complete` stores the transcript

---

## E9-03 — Interview Feedback Analysis

**Type:** Backend + Frontend
**Depends on:** E9-02
**Master Plan:** MP §3 Core User Flows → Flow 9 (Step 5), MP §4 Screen Architecture → Screen 13, MP §6 AI Architecture → Module 8 (post-session)
**Prompt Registry:** PR — Prompt 13 (ANALYZE_INTERVIEW)

### Description

Implement post-interview analysis using Claude to evaluate the transcript and build the feedback report screen.

### Implementation Notes

- Backend: The `complete` endpoint from E9-02 triggers the `ANALYZE_INTERVIEW` prompt from PR Prompt 13
  - Variables: transcript, role path, interview format, user's career snapshot
  - Parses into `InterviewFeedback` object per MP §6 and MP §9 response format
  - Persists all feedback fields to the `interview_sessions` record
  - Sets `feedback_generated = true`
- Route: `/interviews/feedback/:id`
- Frontend: Interview Feedback Report (Screen 13):
  - Overall performance score (percentage)
  - Answer quality: per-question assessment (strong/weak)
  - Clarity score (filler word count, conciseness)
  - Specificity score (concrete examples vs. generalizations)
  - Confidence assessment
  - Strongest stories surfaced (2–3 best anecdotes)
  - Weak answers to revisit (with suggested stronger rewrites)
  - Next practice recommendation
  - CTAs: "Practice again", "Add to weekly plan", "Review transcript"
- Use neutral language for improvement areas (coaching, not grading) per MP §11

### Acceptance Criteria

- [ ] `ANALYZE_INTERVIEW` call produces a complete feedback object with all fields from MP §9
- [ ] Feedback is persisted to the interview_sessions record
- [ ] Screen renders at `/interviews/feedback/:id` with all feedback sections
- [ ] Overall score, clarity score, specificity score, and confidence score display as visual metrics
- [ ] Strongest stories are highlighted for reuse
- [ ] Weak answers show specific suggested rewrites
- [ ] "Review transcript" expands to show the full annotated transcript
- [ ] "Practice again" navigates back to the interview configuration modal
- [ ] Filler word count is displayed as a concrete number
- [ ] Improvement areas use encouraging, coaching-oriented language (no red/negative colors)

---

# Epic 10 — Weekly Plan & Progress

## E10-01 — Weekly Plan Generation

**Type:** Backend + Frontend
**Depends on:** E5-03
**Master Plan:** MP §3 Core User Flows → Flow 10 (Step 1), MP §4 Screen Architecture → Screen 14, MP §6 AI Architecture → Module 9
**Prompt Registry:** PR — Prompt 15 (GENERATE_WEEKLY_PLAN)

### Description

Build the Weekly Action Plan generation and display, showing a personalized plan for the current week based on the user's progress and activity.

### Implementation Notes

- Backend: `POST /api/v1/employee/plan/weekly/generate` per MP §9
  - Calls AI pipeline with `GENERATE_WEEKLY_PLAN` from PR Prompt 15
  - Variables: progress data (completed actions, pending items), target paths, current week number
  - Generates 5–8 concrete action items per MP §6
  - Each item has: description, category, priority, estimated_minutes
  - Persists to `weekly_plans` table
- Backend: `GET /api/v1/employee/plan/weekly` — returns the current week's plan
- Backend: `PATCH /api/v1/employee/plan/weekly/:id/items` — update item completion/deferral
- Route: `/progress` (shared with progress tracker)
- Frontend: Weekly plan display with:
  - Checkbox for each action item
  - Progress inline (completed / total)
  - Defer button (moves to next week)
  - Regenerate button
  - Items scaled to user's pace per MP §3

### Acceptance Criteria

- [ ] `POST /api/v1/employee/plan/weekly/generate` generates 5–8 action items with description, category, priority, estimated_minutes
- [ ] Plan is persisted to `weekly_plans` table with correct employee_id and week_number
- [ ] `GET /api/v1/employee/plan/weekly` returns the current week's plan
- [ ] Items can be marked as completed via the PATCH endpoint
- [ ] Items can be deferred to next week
- [ ] Regenerating the plan replaces the current items with fresh ones
- [ ] Plans are calibrated to activity level (active users get more items, quiet users get fewer)

---

## E10-02 — Progress Tracker Dashboard

**Type:** Frontend
**Depends on:** E10-01
**Master Plan:** MP §3 Core User Flows → Flow 10 (Step 2), MP §4 Screen Architecture → Screen 15, MP §11 Design System → Emotional Design Notes (Progress Tracker)
**Prompt Registry:** —

### Description

Build the Progress Tracker screen (Screen 15) — the visual dashboard showing the user's momentum metrics, activity, and milestones.

### Implementation Notes

- Route: `/progress` (below the weekly plan section, or as a tab)
- Backend: `GET /api/v1/employee/progress` per MP §9 — aggregates all progress data
- Display metrics per MP §3:
  - Resumes completed (count with checkmark)
  - LinkedIn updated (yes/no)
  - Applications tracked (count)
  - Outreach messages sent (count)
  - Mock interviews completed (count)
  - Interviews landed (count)
  - Confidence check-in (weekly 1–5 score, plotted over time using `recharts`)
  - Streak counter ("Active N days in a row")
- Visual elements:
  - Progress bar showing overall transition readiness
  - Weekly activity bar chart (last 4 weeks, using `recharts`)
  - Milestone timeline: resume done → first application → first outreach → first interview → offer
- This screen should feel rewarding — subtle micro-animations for completions per MP §11

### Acceptance Criteria

- [ ] `GET /api/v1/employee/progress` returns all metrics specified in MP §9
- [ ] Screen renders at `/progress` with all metric cards
- [ ] Confidence history is plotted over time as a line chart using recharts
- [ ] Weekly activity bar chart shows the last 4 weeks of activity
- [ ] Milestone timeline visualizes the progression with completed/pending states
- [ ] Streak counter displays correctly based on consecutive login days
- [ ] Progress bar shows overall readiness percentage
- [ ] Completed milestones show checkmarks with achievement dates

---

## E10-03 — Confidence Check-ins

**Type:** Backend + Frontend
**Depends on:** E10-02
**Master Plan:** MP §3 Core User Flows → Flow 10 (confidence check-in), MP §9 API Design → Progress endpoints
**Prompt Registry:** —

### Description

Implement the weekly confidence check-in where users self-report their confidence level on a 1–5 scale, tracked over time.

### Implementation Notes

- Backend: `POST /api/v1/employee/progress/confidence` per MP §9 — accepts a score (1–5)
  - Inserts into `confidence_checkins` table
  - One check-in per week (enforced by unique constraint)
- Frontend: A check-in prompt that appears on the progress screen weekly
  - 5-point scale with labels (e.g., 1 = "Not great", 3 = "Okay", 5 = "Confident")
  - Simple, non-intrusive UI — not a mandatory blocker
- Historical scores plotted on the progress tracker

### Acceptance Criteria

- [ ] `POST /api/v1/employee/progress/confidence` accepts a score 1–5 and persists it
- [ ] Duplicate check-ins for the same week are rejected (unique constraint)
- [ ] Check-in prompt appears on the progress screen at most once per week
- [ ] 5-point scale is clear with descriptive labels
- [ ] Historical confidence scores appear in the progress tracker chart
- [ ] Check-in is not a blocker — user can dismiss or skip it

---

# Epic 11 — Employer Portal

## E11-01 — Company Setup

**Type:** Backend + Frontend
**Depends on:** E2-04
**Master Plan:** MP §3 Core User Flows → Flow 1 (Steps 2–3), MP §4 Screen Architecture → Screen E1
**Prompt Registry:** —

### Description

Build the Company Setup screen (Screen E1) where the employer admin configures their company profile, logo, brand color, and welcome message.

### Implementation Notes

- Route: `/employer/setup`
- Backend: `POST /api/v1/employer/company` per MP §9
  - Creates the company record with: name, logo, brand_color, support_email, welcome_message, default_program_duration_days
  - Logo is uploaded to Supabase Storage
  - Creates the employer_admin record linked to the authenticated user
- Frontend form fields per MP §3: company name, logo upload, brand color picker, welcome message text area, HR admin emails (up to 5), support contact email, default program duration
- After submission, navigate to Program Settings

### Acceptance Criteria

- [ ] Screen renders at `/employer/setup` with all form fields
- [ ] Logo upload stores the image in Supabase Storage and saves the URL
- [ ] Brand color picker allows hex color selection
- [ ] Welcome message text area allows free-form text
- [ ] `POST /api/v1/employer/company` creates the company and employer_admin records
- [ ] Up to 5 HR admin email addresses can be entered
- [ ] Form validates required fields before submission
- [ ] After successful creation, user is navigated to Program Settings

---

## E11-02 — Program Settings

**Type:** Backend + Frontend
**Depends on:** E11-01
**Master Plan:** MP §3 Core User Flows → Flow 1 (Step 3), MP §4 Screen Architecture → Screen E2
**Prompt Registry:** —

### Description

Build the Program Settings screen (Screen E2) where the employer configures their transition program: seats, duration, modules, and tier.

### Implementation Notes

- Route: `/employer/program`
- Backend: `POST /api/v1/employer/program` per MP §9
  - Creates a `transition_programs` record with: name, tier, total_seats, access_duration_days, is_branded, custom_intro_message, interview_coaching_enabled, outreach_builder_enabled
- Frontend: Display purchased seat count, access duration (editable), branded toggle, module toggles (interview coaching, outreach builder), custom intro message text area, package tier indicator

### Acceptance Criteria

- [ ] Screen renders at `/employer/program` with all configuration options
- [ ] Seat count displays and is editable
- [ ] Access duration can be changed from the default 90 days
- [ ] Branded toggle switches between branded and neutral experience
- [ ] Module toggles work for interview coaching and outreach builder
- [ ] Custom intro message is saved to the program record
- [ ] Tier indicator shows Standard / Plus / Premium correctly
- [ ] `POST /api/v1/employer/program` creates the program record with all fields

---

## E11-03 — Employee Invitations

**Type:** Backend + Frontend
**Depends on:** E11-02
**Master Plan:** MP §3 Core User Flows → Flow 1 (Steps 4–5), MP §4 Screen Architecture → Screen E3
**Prompt Registry:** —

### Description

Build the Invite Employees screen (Screen E3) with CSV upload, manual add, and invite sending capabilities.

### Implementation Notes

- Route: `/employer/invite`
- Three invite methods per MP §3:
  1. **CSV upload:** Downloadable template (GET `/api/v1/employer/invite/template`), upload with validation. Columns: employee_name, email, department (optional), role_family (optional), last_day (optional). Validate email formats, flag duplicates, show preview table.
  2. **Manual add:** Name + email form for individual additions
  3. **Bulk email invite:** Paste a list of emails
- Backend: `POST /api/v1/employer/invite` per MP §9 — creates seat records, sends invitation emails
- Backend: `POST /api/v1/employer/invite/csv` — parses CSV, validates, creates seats
- Preview table shows all employees with name, email, status "Ready to Invite"
- "Send Invites" button triggers email sending (email implementation in E12)
- Edge cases from MP §3: malformed emails (reject with error list), duplicates (flag and deduplicate), exceeding seat count (show "purchase additional seats" message)

### Acceptance Criteria

- [ ] Screen renders at `/employer/invite` with all three invite methods
- [ ] CSV template downloads with correct columns
- [ ] CSV upload validates email formats and flags invalid rows
- [ ] Duplicate emails within the upload are detected and deduplicated with a warning
- [ ] Preview table shows all employees with "Ready to Invite" status
- [ ] Manual add form creates a seat record
- [ ] "Send Invites" creates seat records with status `invited` and triggers email sending
- [ ] Attempting to invite more employees than available seats shows the correct error message
- [ ] `used_seats` on the transition program is incremented correctly
- [ ] Seats have the correct `expires_at` calculated from activation (not invitation)

---

## E11-04 — Employer Dashboard

**Type:** Backend + Frontend
**Depends on:** E11-03
**Master Plan:** MP §3 Core User Flows → Flow 11 (Step 1), MP §4 Screen Architecture → Screen E4
**Prompt Registry:** —

### Description

Build the Employer Dashboard (Screen E4) showing aggregated usage analytics. All data is aggregated — no individual employee data is visible.

### Implementation Notes

- Route: `/employer/dashboard`
- Backend: `GET /api/v1/employer/dashboard` per MP §9 — aggregates metrics across all seats/employees for the employer's programs
- Key metrics: seats purchased, seats activated, onboarding completion rate, resume completion rate, interview practice rate, weekly active usage, average satisfaction score
- Widgets per MP §3:
  - Activations over time (line chart using `recharts`)
  - Engagement by module (horizontal bar chart)
  - Inactive users count with "Send re-engagement email" button
  - Activity heatmap (by day of week)
- All data is aggregated — employer CANNOT see individual employee data per MP §3 and MP §8 (enforced at API layer)
- Backend: `POST /api/v1/employer/reengage` — triggers re-engagement emails for inactive users
- Employer sidebar navigation per MP §4: Overview, Employees, Program, Reporting, Billing

### Acceptance Criteria

- [ ] `GET /api/v1/employer/dashboard` returns all aggregated metrics per MP §9
- [ ] Dashboard renders at `/employer/dashboard` with all metric cards and charts
- [ ] Activations over time chart displays correctly using recharts
- [ ] Engagement by module bar chart shows usage counts per module
- [ ] Inactive user count is displayed with a "Send re-engagement email" button
- [ ] Re-engagement button calls the reengage endpoint and shows confirmation
- [ ] NO individual employee data is accessible through this endpoint or screen
- [ ] Employer sidebar navigation is visible with all 5 nav items from MP §4
- [ ] Metrics update in real-time or near-real-time (polling every 30 seconds is acceptable per MP §7)

---

## E11-05 — Transition Outcomes and Exports

**Type:** Backend + Frontend
**Depends on:** E11-04
**Master Plan:** MP §3 Core User Flows → Flow 11 (Step 2–3), MP §4 Screen Architecture → Screen E5, MP §10 Document Generation → Employer Report
**Prompt Registry:** —

### Description

Build the Transition Outcomes screen (Screen E5) with outcome metrics and export capabilities (PDF summary, CSV data).

### Implementation Notes

- Route: `/employer/outcomes`
- Backend: `GET /api/v1/employer/outcomes` per MP §9 — aggregates outcome data from opt-in employee reports
- Backend: `GET /api/v1/employer/outcomes/export?format=pdf` — generates a PDF summary report using `@react-pdf/renderer` with the template from MP §10:
  - Page 1: Cover (company logo, title, date)
  - Page 2: Key metrics (activation, engagement, interview readiness, satisfaction)
  - Page 3: Outcome data (placement rate, time to interview, confidence improvement)
  - Page 4: Module usage breakdown
- Backend: `GET /api/v1/employer/outcomes/export?format=csv` — raw data CSV export
- Frontend: Metrics display per MP §3 (pct engaged, pct interview ready, avg time to first interview, confidence lift, placement rate, time to placement, satisfaction)
- Export buttons for PDF and CSV
- Show sample size note when opt-in reporting is low per MP §3

### Acceptance Criteria

- [ ] `GET /api/v1/employer/outcomes` returns all outcome metrics per MP §9
- [ ] Screen renders at `/employer/outcomes` with all metrics displayed
- [ ] PDF export generates a valid 4-page report matching the template in MP §10
- [ ] PDF includes company logo on the cover page
- [ ] CSV export downloads a valid CSV with raw data
- [ ] Sample size note appears when opt-in count is low
- [ ] Export buttons trigger file downloads
- [ ] Generated reports are stored in Supabase Storage at `reports/{company_id}/`

---

# Epic 12 — Email System

## E12-01 — Email Templates and Sending

**Type:** Backend
**Depends on:** E11-03
**Master Plan:** MP §4 Screen Architecture → Day Zero Email Kit, MP §3 Core User Flows → Flow 1 (Step 5)
**Prompt Registry:** —

### Description

Implement the transactional email system for sending invitation emails, re-engagement emails, weekly nudges, and 30-day check-ins.

### Implementation Notes

- Choose an email provider: Resend, SendGrid, or AWS SES (Resend recommended for simplicity with Next.js)
- Create 4 email templates per MP §4:
  1. **Standard Invitation:** Subject: "[Company Name] has provided you with career transition support". Calm, respectful tone. Contains CTA button with seat activation link.
  2. **Re-engagement (72h):** Subject: "Your transition support is ready when you are". Gentle, no pressure.
  3. **Weekly Nudge:** Subject: "You have new job matches waiting". Action-oriented.
  4. **30-Day Check-in:** Subject: "How's your search going?". Warm, encouraging.
- All emails sent from "Waypointer" (not from the employer) per MP §4
- Include employer logo and custom message in email header if branded
- Include unsubscribe link
- Track email sends in `email_sends` table with sent_at, opened_at, clicked_at
- Add `EMAIL_PROVIDER_API_KEY` to `.env.local`

### Acceptance Criteria

- [ ] All 4 email templates exist and render correctly with dynamic content
- [ ] Invitation email includes a valid seat activation link (JWT token)
- [ ] Emails are sent from "Waypointer" (not the employer's email domain)
- [ ] Employer logo and custom message appear in the email header when branded
- [ ] Unsubscribe link is present in all emails
- [ ] Email sends are tracked in the `email_sends` table
- [ ] Tone matches MP §4 requirements: no mention of "layoff" or "termination" in invitation
- [ ] All emails are responsive and render correctly in major email clients

---

## E12-02 — Automated Email Triggers

**Type:** Backend
**Depends on:** E12-01
**Master Plan:** MP §4 Screen Architecture → Day Zero Email Kit (re-engagement, weekly nudge, 30-day check-in)
**Prompt Registry:** —

### Description

Implement the automated email trigger logic: re-engagement after 72 hours of inactivity, weekly nudges, and 30-day check-ins.

### Implementation Notes

- Create a scheduled job (Next.js cron via Vercel or a simple API route triggered externally) that:
  1. Sends re-engagement emails to employees who were invited 72+ hours ago and haven't activated
  2. Sends weekly nudge emails to active employees on Monday mornings
  3. Sends 30-day check-in emails to employees who activated 30 days ago
- Respect employer's `POST /api/v1/employer/reengage` endpoint for manual re-engagement triggers
- Do not send duplicate emails (check `email_sends` table before sending)
- Include error handling for email delivery failures

### Acceptance Criteria

- [ ] Re-engagement emails are sent 72 hours after invitation to employees who haven't activated
- [ ] Weekly nudge emails are sent to active employees (not expired, not inactive)
- [ ] 30-day check-in emails are sent at the correct time after activation
- [ ] No duplicate emails are sent (unique check on seat_id + template_type within a time window)
- [ ] Manual re-engagement via employer dashboard triggers the correct emails
- [ ] Email failures are logged and do not crash the scheduled job
- [ ] Expired seats do not receive any further emails

---

# Epic 13 — Design System & Polish

## E13-01 — Component Library

**Type:** Frontend
**Depends on:** E1-01
**Master Plan:** MP §11 Design System → Key Components
**Prompt Registry:** —

### Description

Build the shared component library implementing all key components from the design system with exact values from the masterplan.

### Implementation Notes

- Build on top of shadcn/ui, customizing to match MP §11 exactly:
- **Primary Button:** Background `#2563EB`, white text, 6px radius, 40px height, 16px horizontal padding. Hover: `#1D4ED8`. Disabled: `#9CA3AF`. Full-width on mobile, auto-width on desktop.
- **Secondary Button:** White bg, `#2563EB` text, 1px `#E5E7EB` border. Hover: `#DBEAFE` bg.
- **Card:** White bg, 1px `#E5E7EB` border, 8px radius, `shadow-sm`, 16px padding. Hover (clickable): `shadow-md`, border `#2563EB`.
- **Score Badge:** Rounded pill. High Fit: `#059669` bg / white text. Stretch: `#D97706` bg / white text. Low Fit: `#DC2626` bg / white text.
- **Skill Chip:** `#DBEAFE` bg, `#2563EB` text, 9999px radius. Removable variant with × on hover.
- **Progress Bar:** 4px height, `#E5E7EB` track, `#2563EB` fill, 200ms ease-out animation.
- **Input Fields:** White bg, 1px `#E5E7EB` border, 6px radius, 40px height. Focus: 2px `#2563EB` border. Error: `#DC2626` border + error text.
- **Sidebar Navigation:** 240px width, `#FAFAFA` hover. Active: `#DBEAFE` bg, `#2563EB` text, 2px left border. Collapsed to icons on mobile.
- **Toast notifications:** Top-right, auto-dismiss 5s.

### Acceptance Criteria

- [ ] Primary Button matches MP §11 exactly: correct colors, radius, height, hover states, disabled state
- [ ] Secondary Button matches MP §11 exactly
- [ ] Card component has correct border, radius, shadow, padding, and clickable hover state
- [ ] Score Badge renders correctly for all three fit levels with correct colors
- [ ] Skill Chip renders with correct colors, radius, and removable variant
- [ ] Progress Bar animates fill with 200ms ease-out
- [ ] Input Fields have correct border, radius, height, focus state, and error state
- [ ] Sidebar Navigation matches MP §11: correct width, hover, active state, and mobile collapse
- [ ] All components are responsive and work at all breakpoints from MP §11

---

## E13-02 — Responsive Layouts

**Type:** Frontend
**Depends on:** E13-01
**Master Plan:** MP §11 Design System → Responsive breakpoints
**Prompt Registry:** —

### Description

Audit and fix all screens for responsive behavior at the three breakpoints: mobile (< 768px), tablet (768px–1024px), and desktop (> 1024px).

### Implementation Notes

- Mobile (< 768px): Single column, collapsed sidebar to icon-only, full-width buttons
- Tablet (768px–1024px): Condensed sidebar, adjusted grid layouts
- Desktop (> 1024px): Full sidebar, multi-column layouts (e.g., resume workspace left/right panes)
- Test every screen at all three breakpoints
- Ensure the resume workspace side-by-side panes stack vertically on mobile
- Ensure job cards are scannable on mobile (no horizontal scrolling)
- Ensure the employer dashboard charts resize gracefully

### Acceptance Criteria

- [ ] Every employee screen renders correctly at 375px (mobile), 768px (tablet), and 1280px (desktop)
- [ ] Every employer screen renders correctly at all three breakpoints
- [ ] Sidebar collapses to icons on mobile and restores on desktop
- [ ] Resume workspace panes stack vertically on mobile
- [ ] Job feed cards are fully visible without horizontal scrolling on mobile
- [ ] Charts in employer dashboard and progress tracker resize without overflow
- [ ] No text truncation that hides critical information at any breakpoint

---

## E13-03 — Empty, Loading, and Error States

**Type:** Frontend
**Depends on:** E13-02
**Master Plan:** MP §11 Design System → Interaction Principles (Loading states, Empty states, Error states)
**Prompt Registry:** —

### Description

Audit all screens and add proper empty states, loading states (skeleton screens), and error states where missing.

### Implementation Notes

- **Loading states:** Skeleton screens (grey placeholder shapes with shimmer animation) for all content areas that load asynchronously. For AI generation specifically: contextual message above the skeleton ("Building your tailored resume...", "Scoring your job matches...").
- **Empty states:** Every list/feed must have a specific empty state with a clear CTA:
  - Jobs feed: "No matches yet. Complete your role targeting to see recommended jobs."
  - Outreach: "Generate your first outreach message to get started."
  - Interviews: "Start your first mock interview to practice."
  - Progress: "Complete your first action to see progress."
- **Error states:** Inline error messages below relevant fields. Toast notifications for background errors. Never a full-page error for recoverable issues.
- **Transitions:** 200ms ease-out for hover, color, layout shifts. Page transitions: 150ms fade-in.

### Acceptance Criteria

- [ ] Every screen that loads data asynchronously shows a skeleton loading state (not a spinner)
- [ ] AI generation screens show a contextual loading message (not just a skeleton)
- [ ] Jobs feed shows the specific empty state with CTA when no matches exist
- [ ] Outreach screen shows an empty state with CTA when no messages exist
- [ ] Interview screen shows an empty state with CTA when no sessions exist
- [ ] Progress screen shows an empty state with appropriate messaging
- [ ] Error messages appear inline below the relevant field/section
- [ ] Toast notifications appear top-right and auto-dismiss after 5 seconds
- [ ] All hover transitions are 200ms ease-out
- [ ] Page transitions use 150ms fade-in

---

# Epic 14 — Integration & Launch Prep

## E14-01 — End-to-End Flow Testing

**Type:** Integration
**Depends on:** E13-03
**Master Plan:** MP §3 Core User Flows (all flows)
**Prompt Registry:** —

### Description

Test the complete product flow end-to-end: from employer setup through employee onboarding, all features, to the employer dashboard showing real activity data.

### Implementation Notes

- Test Flow 1: Employer creates company → configures program → invites employees via CSV
- Test Flow 2: Employee receives invite → activates → enters welcome screen
- Test Flow 3: Employee uploads resume → reviews career snapshot → confirms
- Test Flow 4: Employee views role paths → selects primary and secondary
- Test Flow 5: Employee views transition plan dashboard
- Test Flow 6: Employee generates resumes → edits → downloads PDF and DOCX
- Test Flow 7: Employee views job matches → views detail → uses application kit
- Test Flow 8: Employee generates outreach messages → marks as sent
- Test Flow 9: Employee starts mock interview → completes → views feedback
- Test Flow 10: Employee views weekly plan → marks items complete → views progress
- Test Flow 11: Employer views dashboard → exports outcomes report
- Verify edge cases from each flow in MP §3

### Acceptance Criteria

- [ ] Complete employer flow works end-to-end without errors
- [ ] Complete employee flow works end-to-end without errors
- [ ] Resume PDF and DOCX download and open correctly
- [ ] Employer dashboard shows accurate aggregated metrics after employee activity
- [ ] Employer outcome export generates a valid PDF report
- [ ] At least 3 edge cases from MP §3 are tested and handled correctly (CSV with malformed emails, expired seat activation, empty job feed)
- [ ] No console errors or unhandled promise rejections during the full flow
- [ ] All loading states and transitions appear correctly during real usage

---

## E14-02 — Performance Optimization

**Type:** Polish
**Depends on:** E14-01
**Master Plan:** MP §7 Technical Architecture → Key Architectural Decisions (Edge Runtime)
**Prompt Registry:** —

### Description

Optimize the application for production performance: Edge Runtime for AI proxy calls, caching, bundle size, and initial load speed.

### Implementation Notes

- Move AI proxy API routes to Edge Runtime for lower cold-start latency per MP §7
- Document generation routes (PDF, DOCX) stay on Node.js Runtime per MP §7
- Implement React Query caching for frequently-accessed data (career snapshot, role paths, progress)
- Lazy-load heavy components (recharts, PDF preview) via `next/dynamic`
- Optimize images (employer logos) with `next/image`
- Ensure the Welcome screen loads fast — this is the Day 0 emotional moment per MP §7
- Run `next build` and check bundle size — flag any route over 200KB

### Acceptance Criteria

- [ ] AI proxy routes use Edge Runtime (verified in build output)
- [ ] Document generation routes use Node.js Runtime
- [ ] Welcome screen loads in under 2 seconds on a 3G connection (Lighthouse check)
- [ ] React Query caching reduces redundant API calls for profile and snapshot data
- [ ] Heavy components (charts, PDF preview) are lazy-loaded
- [ ] No route bundle exceeds 200KB (verified in build output)
- [ ] `next build` completes without warnings

---

## E14-03 — Deployment Configuration

**Type:** Setup
**Depends on:** E14-02
**Master Plan:** MP §7 Technical Architecture → Hosting (Vercel)
**Prompt Registry:** —

### Description

Configure the application for production deployment on Vercel with all environment variables, domain setup, and monitoring.

### Implementation Notes

- Configure Vercel project with all required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `JOB_DATA_API_KEY`
  - `EMAIL_PROVIDER_API_KEY`
- Set up preview deployments for branches
- Configure error monitoring (Vercel's built-in or Sentry)
- Set up the Supabase production project (separate from development)
- Run database migrations on the production Supabase instance
- Seed the prompt registry on production
- Test the full flow on the production deployment

### Acceptance Criteria

- [ ] Application deploys successfully to Vercel
- [ ] All environment variables are set in the Vercel project settings
- [ ] Preview deployments work for branches
- [ ] Production Supabase instance is separate from development
- [ ] Database migrations run successfully on production
- [ ] Prompt registry is seeded on production with all 15 prompts
- [ ] Full employee flow works on the production deployment
- [ ] Full employer flow works on the production deployment
- [ ] Error monitoring is configured and captures errors
- [ ] No environment variables are exposed to the client that shouldn't be (only `NEXT_PUBLIC_*` prefixed ones)

---

## End of Build Plan

This document covers 47 issues across 14 epics. Every feature described in the Waypointer masterplan has a corresponding issue. All acceptance criteria are objectively verifiable. The dependency chain has been verified from E1-01 through E14-03.
