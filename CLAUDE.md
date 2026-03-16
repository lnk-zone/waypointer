# Waypointer — Claude Code Session Rules

These rules apply to every session, every issue, without exception.
Do not deviate from them unless explicitly told to in the chat.

---

## Reference Documents

| Shorthand | Full Name | File |
|-----------|-----------|------|
| MP | Master Plan | `waypointer_masterplan.md` |
| BP | Build Plan | `waypointer_buildplan.md` |
| PR | Prompt Registry | `waypointer_prompt_registry.md` |

When an issue says "MP §11" — open `waypointer_masterplan.md` and find Section 11. When it says "PR — Prompt 6" — open `waypointer_prompt_registry.md` and find Prompt 6 (GENERATE_RESUME). Never assume you know what a document says. Read it.

---

## Rule 1 — Read Before You Code

Every issue in the build plan lists master plan section refs and prompt registry refs.
Read those sections BEFORE writing a single line of code.

The documents contain exact field names, enum values, component structures,
API response shapes, prompt templates, and constraints that are NOT repeated
in the issue description. Skipping them causes drift and rework.

If an issue references PR, read the full prompt entry: system prompt, user prompt
template, variables, output format, model config. All of it.

---

## Rule 2 — Stack: Next.js 14 + Supabase + Vercel. No Substitutions.

**Frontend:** Next.js 14 (App Router) with React 18 and TypeScript. Not Remix. Not Vite. Not Pages Router.

**State:** Zustand for client state. TanStack Query (React Query) for server state. Not Redux. Not SWR. Not Context API for global state.

**Styling:** Tailwind CSS + shadcn/ui. Not Material UI. Not Chakra. Not styled-components. Not CSS Modules.

**Database:** PostgreSQL via Supabase. Not Firebase. Not PlanetScale. Not Prisma (use Supabase client directly).

**Auth:** Supabase Auth. Not NextAuth. Not Clerk. Not Auth0.

**Storage:** Supabase Storage. Not S3 directly. Not Cloudinary.

**AI:** Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls. Not OpenAI. Not LangChain. Not Vercel AI SDK.

**Job Data:** JSearch API (https://www.openwebninja.com/api/jsearch). Not Adzuna. Not The Muse. Not LinkedIn Jobs API.

**Voice Interviews:** ElevenLabs Conversational AI. Not Deepgram. Not AssemblyAI. Not a custom WebSocket pipeline.

**Document Generation:** `@react-pdf/renderer` for PDF. `docx` npm package for DOCX. Not puppeteer. Not jsPDF. Not html-pdf.

**Charts:** `recharts`. Not Chart.js. Not D3 directly. Not Nivo.

**Validation:** `zod` for runtime schema validation, shared between client and server. Not Yup. Not Joi.

**Hosting:** Vercel. Not AWS. Not Railway. Not Fly.io.

Environment variables live in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, bypasses RLS)
- `ANTHROPIC_API_KEY` — Claude API key (server-only)
- `ELEVENLABS_API_KEY` — ElevenLabs API key (server-only)
- `JOB_DATA_API_KEY` — Job listing provider API key (server-only)
- `EMAIL_PROVIDER_API_KEY` — Email provider API key (server-only)

Never hardcode credentials. Never expose server-only keys to the client. Only `NEXT_PUBLIC_*` prefixed variables reach the browser.

---

## Rule 3 — One Issue at a Time

Do not start the next issue until the current one is complete and every
acceptance criteria item is confirmed through the Three-Gate Review (Rule 4).

Critical path:
```
E1-01 → E1-02 → E1-03 → E2-01 → E2-02 → E2-03 → E2-04 → E3-01 → E3-02 → E3-03
→ E4-01 → E4-02 → E4-03 → E4-04 → E4-05 → E5-01 → E5-02 → E5-03
→ E6-01 → E6-02 → E6-03 → E6-04 → E7-01 → E7-02 → E7-03 → E7-04
→ E8-01 → E8-02 → E9-01 → E9-02 → E9-03 → E10-01 → E10-02 → E10-03
→ E11-01 → E11-02 → E11-03 → E11-04 → E11-05 → E12-01 → E12-02
→ E13-01 → E13-02 → E13-03 → E14-01 → E14-02 → E14-03
```

If you think you should jump ahead, you are wrong. Follow the sequence.

---

## Rule 4 — Three-Gate Autonomous Review

After finishing an issue, run all three gates in order before advancing. If any gate fails, fix the issue and re-run that gate. Only advance when all three pass.

### Gate 1 — Acceptance Criteria Verification (self)

Go through each AC item one by one. For each, provide concrete evidence (test output, file path, command run, etc.).

```
[PASS] [criteria text] — [how you verified it]
[FAIL] [criteria text] — [what is failing and why]
```

All items must PASS before proceeding to Gate 2.

### Gate 2 — Masterplan Cross-Reference Audit (agent)

Dispatch an agent to re-read every Masterplan section referenced by the issue. The agent's sole job: compare what Masterplan specifies against what was actually implemented. It looks for missed columns, behaviors, constraints, tables, edge cases — anything in Masterplan not reflected in code.

Report format:

```
[CLEAN] — no gaps found between Masterplan and implementation
[GAP] [what Masterplan says] → [what is missing or wrong in code]
```

All gaps must be fixed before proceeding to Gate 3.

### Gate 3 — Code Review (agent)

Dispatch the code-reviewer agent to review all code changes for the issue against:
- The acceptance criteria
- CLAUDE.md rules (stack, production quality, technical constraints)
- General code quality (error handling, types, no TODOs, no hardcoded values, no console.log)

Report format:

```
[APPROVED] — no issues found
[ISSUE] [severity] [description] → [suggested fix]
```

All issues must be resolved before the issue is considered complete.

---

## Rule 5 — Production Quality. No Exceptions.

This is a launch-grade product, not a prototype. Every issue is built to
production standard — full stop.

- Handle all edge cases and errors gracefully — every edge case listed in the masterplan flows must be implemented
- All AI calls follow the pipeline: prompt registry lookup → variable injection → Claude call → structured output parsing → Zod validation → error handling with retry
- Loading states use skeleton screens, never spinners. AI generation shows contextual messages ("Building your tailored resume...")
- Empty states have specific CTAs, not blank space
- Toast notifications for background errors, inline messages for field-level errors
- All forms validate inputs before submission using Zod schemas
- All API responses follow the standard format from MP §9 (data + pagination for lists, error object for errors)
- All transitions are 200ms ease-out. Page transitions 150ms fade-in.
- Add the finishing touches: empty states, loading skeletons, helpful microcopy
- Zero hackathon shortcuts, zero TODOs left in code, zero hardcoded values, zero console.log statements
- Match the design system exactly: Waypointer Blue `#2563EB`, Background `#FAFAFA`, Inter font family, 4px spacing base unit, component specs from MP §11

You are the technical co-founder on this project. Own it.

---

## Rule 6 — Standing Technical Constraints

These apply to every issue without needing to be restated:

- **Primary keys:** UUID via `gen_random_uuid()`. Every table. No exceptions.
- **Timestamps:** `TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Both `created_at` and `updated_at` on every table.
- **Row-Level Security:** RLS is enabled on every table. Employee data is isolated by `auth_user_id`. Employer data is isolated by `company_id`. The service role key bypasses RLS for API routes that need cross-tenant access.
- **Prompt registry:** All AI prompts come from the `prompt_registry` database table. Never hardcode a prompt string in application code. Always fetch by `prompt_id`, inject variables, and call Claude through the pipeline.
- **Identity fields are never AI-inferred:** Seniority level, management experience, and level direction are ALWAYS direct user inputs (dropdowns/radio buttons). The AI extraction pipeline handles skills, achievements, tools, and industries — never identity-level fields.
- **Employer data isolation:** Employer dashboard endpoints return aggregated metrics only. No individual employee data is ever exposed to the employer. This is enforced at the API layer.
- **File access:** All files in Supabase Storage are private. Access is via presigned URLs with 1-hour expiry. The API generates presigned URLs only after verifying ownership.
- **AI error handling:** 30-second timeout. Retry once on malformed output with correction nudge. Max 5 concurrent AI calls per user session. Log all calls.
- **API error format:** All errors follow `{ error: { code, message, details } }` with standard codes from MP §9.
- **Edge Runtime:** AI proxy routes use Edge Runtime for lower cold start. Document generation routes use Node.js Runtime (they need Node libraries).
- **No streaming AI responses:** All AI calls return complete JSON. Streaming creates parsing complexity for zero UX benefit per MP §7.
- **Email sender:** All emails sent from "Waypointer", never from the employer's domain. Invitation emails never use the word "layoff" or "termination" — use "career transition" and "next step".

---

## Rule 7 — Update Current Status When an Issue Closes

When all three gates pass for an issue, before advancing you must:

1. Open `CLAUDE.md`
2. Update the `## Current Status` section:
   - Move the completed issue to "Last completed"
   - Set "Currently working" to the next issue in the critical path
   - Set "Next up" to the issue after that
3. Save the file
4. Commit all changes and push to the `origin` remote
5. Proceed to the next issue

---

## Current Status

Last completed: E9-01 (Interview Prep Hub)
Currently working: E9-02 (Mock Interview Session)
Next up: E9-03
