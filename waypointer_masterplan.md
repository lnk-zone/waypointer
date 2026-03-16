# Waypointer — Masterplan

Version: 1.0
Date: March 15, 2026
Status: Pre-build specification
Author: John (Founder)

---

## Table of Contents

1. Product Vision
2. User Personas
3. Core User Flows
4. Screen Architecture
5. Feature Set
6. AI Architecture
7. Technical Architecture
8. Database Schema
9. API Design
10. Document Generation System
11. Design System
12. Revenue Model
13. GTM Strategy

---

## 1. Product Vision

### The Problem

On a Tuesday morning, a mid-level product manager at a 400-person SaaS company opens Slack to a message from HR. There's been a restructuring. Her role is eliminated. She gets a 30-minute call, a month of severance, and a link to LinkedIn Learning. That's it.

Down the hall, a VP of Engineering gets the same news — but his package includes a $5,000 outplacement service with a dedicated career coach, resume rewriting, interview prep, and a 6-month support window. He'll land somewhere in 8 weeks. She'll spend 4 months sending the same resume to 200 job postings, hearing nothing, and slowly losing confidence.

This is the standard pattern. Companies routinely spend $3,000–$10,000 per head on outplacement services for executives and senior leaders, representing roughly 5% of laid-off employees. The other 95% get a goodbye email and, if they're lucky, a month of COBRA. In 2025 alone, 783 tech companies conducted layoffs affecting nearly 246,000 people. The outplacement market sits at $5.21B and is growing to $7.39B by 2030 — but almost all of that spend is concentrated at the top.

### The Insight

The reason companies don't provide outplacement to every departing employee isn't that they don't care. It's that the existing solutions are structurally priced for executives. LHH charges $2,000–$5,000 per employee. RiseSmart charges $1,000–$3,000. Careerminds charges $1,000–$5,000. These are human-led, coaching-heavy services that cannot compress to mass-market pricing without gutting their margins. No one has built an AI-native platform that delivers the core value of outplacement — orientation, materials, job targeting, interview prep, momentum — at a price point where a company can cover every departing employee.

### What Waypointer Is

Waypointer is an employer-paid AI outplacement platform for non-executive employees. It helps laid-off workers get job-search-ready fast, run a focused search, and land sooner. The employer buys seats as part of the severance package. The employee gets immediate access to a structured transition experience: role targeting, tailored resumes, curated job matches, outreach preparation, voice-based interview practice, and weekly accountability.

The core promise to the employer: "When someone leaves your company, they don't leave empty-handed."
The core promise to the employee: "You don't have to figure this out alone."

### Category Definition

Waypointer is mass-market outplacement, rebuilt for the AI era.

Use: "outplacement platform," "transition support," "career transition benefit," "offboarding support"
Avoid: "job board," "auto-apply tool," "career coaching," "recruiting software," "HR tech"

### What Success Looks Like

**6 months:** 10–15 paying employer accounts, 200+ employees onboarded, seat activation rate above 70%, measurable engagement data showing weekly active usage above 50% of activated users.

**1 year:** 50+ employer accounts, first annual renewals closed, Option B pricing (platform fee + per-activation) adopted by at least 30% of accounts. Placement data from opt-in reporting showing materially faster time-to-interview than industry baseline.

**3 years:** Default offboarding vendor for mid-market tech and PE-backed operators. Channel partnerships with at least two HR platform ecosystems (Rippling, Deel, Gusto). Role-path libraries and layoff-to-placement benchmarks as proprietary data assets. Revenue north of $3M ARR.

---

## 2. User Personas

### Persona 1: Maya — The Laid-Off IC (Primary)

Maya Chen, 31, was a Customer Success Manager at a 300-person B2B SaaS company for three years. She found out her role was eliminated during a 15-minute Zoom call on a Wednesday. She received one month of severance, a vague offer of "support," and a LinkedIn Learning subscription. She hasn't updated her resume in three years. She doesn't know whether to look for another CSM role, pivot to Account Management, or try Product. She's scared, slightly embarrassed, and doesn't know where to start. Without Waypointer, she spends the first two weeks in shock, the next two weeks sending the same generic resume to 50 postings, and then enters a slow spiral of silence and self-doubt. With Waypointer, she uploads her resume on Day 0, gets three targeted role paths within 30 minutes, has polished resumes and a rewritten LinkedIn profile by end of Day 1, and is reviewing curated job matches and practicing interviews by the end of Week 1. She feels oriented, not lost.

### Persona 2: Marcus — The People Ops Buyer (Key Buyer)

Marcus Williams, 38, is VP of People at a 600-person fintech company that just went through a 15% reduction in force. He's responsible for the offboarding experience for 90 people. Leadership wants this handled with dignity — the CEO said so in the all-hands — but the budget doesn't stretch to $3,000/head for traditional outplacement across 90 people. That's $270,000 he doesn't have. He's been given $20,000–$40,000 total for "transition support." Without Waypointer, he sends a templated goodbye email with links to a few free resources, feels terrible about it, and fields angry Glassdoor reviews for the next six months. With Waypointer, he buys 90 seats at $149 each ($13,410), deploys invites via CSV upload the same afternoon, and within a week has a dashboard showing 78% activation, 65% resume completion, and clear engagement metrics he can show the CEO. He sleeps better. The Glassdoor reviews are softer.

### Persona 3: Diana — The PE Operating Partner (High-Value Buyer)

Diana Park, 44, is an Operating Partner at a mid-market PE firm with 12 portfolio companies. Three of them are going through workforce restructurings this quarter as part of post-acquisition integration. She needs a repeatable, scalable offboarding benefit she can deploy across all three companies — and potentially the rest of the portfolio. She doesn't want to negotiate with three different outplacement vendors. Without Waypointer, she cobbles together different solutions for each portco, spends weeks on vendor selection, and gets inconsistent outcomes. With Waypointer, she signs one platform agreement, gets white-label deployment across all three companies, and sees unified reporting on transition outcomes. One relationship, one vendor, portfolio-wide coverage.

### Persona 4: Tom — The HR Consultant (Channel Partner)

Tom Reeves, 52, runs a boutique HR consulting firm that advises mid-market companies on workforce transitions. His clients regularly ask for outplacement recommendations, and he's tired of sending them to LHH or RiseSmart knowing the cost will kill the engagement for anyone below VP. He wants a modern, affordable tool he can recommend (or white-label) that makes him look good. Without Waypointer, he gives clients a list of expensive vendors and watches them do nothing. With Waypointer, he becomes a channel partner, earns a referral margin, and delivers better outcomes to his clients at a fraction of the cost.

---

## 3. Core User Flows

### Flow 1: Employer Onboarding and Employee Invitation

**Trigger:** Marcus (HR buyer) has purchased Waypointer seats and needs to set up the company account and invite departing employees.

1. Marcus receives a welcome email with a link to the employer admin portal.
2. He clicks through to the Company Setup screen (Screen E1). He sees fields for company name, logo upload, brand color picker, and a text area for a custom welcome message that departing employees will see when they first log in. He fills these in. There are also fields for HR admin email addresses (up to 5 for launch) and a support contact email. He sets the default program duration to 90 days.
3. He clicks "Create Transition Program" and is taken to the Program Settings screen (Screen E2). He sees his purchased seat count, the access duration (90 days, editable), a toggle for branded vs. neutral experience, and module toggles for interview coaching and outreach builder (both on by default). There's a text area for a custom intro message and package tier indicator (Standard or Plus).
4. He clicks "Save Program" and is taken to the Invite Employees screen (Screen E3). He sees three invite methods: CSV upload (with a downloadable template), manual add (name + email form), and bulk email invite. The CSV template has columns: employee_name, email, department (optional), role_family (optional), last_day (optional). He uploads a CSV with 90 rows. The system validates email formats and flags duplicates. He sees a preview table with all 90 employees, each showing name, email, and status "Ready to Invite."
5. He clicks "Send Invites." Each employee receives a Day Zero invitation email (see Day Zero Kit, Section 4). The employer dashboard (Screen E4) now shows 90 seats purchased, 0 activated, and an activations-over-time chart that will populate as employees sign up.
6. Over the following days, Marcus checks the dashboard. He sees activation rate climbing, engagement by cohort, most-used modules, and can identify inactive users. He can trigger a batch re-engagement email through the platform (sent from Waypointer, not from the employer) to employees who haven't activated after 72 hours.

**Edge cases:**
- CSV with malformed emails: system rejects those rows, shows error list, allows correction and re-upload.
- Duplicate email addresses: system flags and deduplicates, shows warning.
- Employee already has a Waypointer account from a previous employer: system creates a new transition program linked to the new employer, preserving nothing from the prior engagement (clean slate).
- HR admin tries to invite more employees than purchased seats: system shows "You have N seats remaining. Purchase additional seats to continue." with a link to billing.

### Flow 2: Day Zero — Employee Receives Invitation

**Trigger:** Maya (laid-off employee) receives the Day Zero email from Waypointer.

1. Maya opens her email and sees a message with the subject line: "[Company Name] has provided you with career transition support." The email body is warm, respectful, and practical. It says her former employer has arranged access to Waypointer, a career transition platform. It explains what she'll be able to do (get clarity on roles, build tailored resumes, find matching jobs, practice interviews). It includes an estimated time for the first session (15–20 minutes) and a single CTA button: "Start Your Transition Plan."
2. She clicks through and lands on the Welcome screen (Screen 1). She sees a calm, branded page with the headline "Let's get you moving again." If her employer wrote a custom message, it appears here as a short note. Below that: a brief summary of what she'll accomplish in her first session, the estimated time (15–20 minutes), and a CTA: "Start your transition plan."
3. She clicks Start and is taken to authentication. She creates an account with email + password or Google SSO. The account is linked to her employer's transition program and the seat allocated to her email. Her 90-day access window begins.

**Edge cases:**
- Employee clicks the link after the program duration has expired: they see a message explaining the access window has closed, with a link to contact their former employer's HR team.
- Employee never received the email (spam filter): employer dashboard shows "Invited, Not Activated" status; HR can re-send the invite.
- Employee tries to sign up with a different email than the one invited: system prompts them to use the invited email, or allows them to contact support to update it.

### Flow 3: Employee Onboarding — Profile Intake and Career Snapshot

**Trigger:** Maya has created her account and clicked through the Welcome screen.

1. She arrives at the Import Your Background screen (Screen 2). She sees two primary options: "Upload Resume" (drag-and-drop zone accepting PDF and DOCX) and "Import from LinkedIn" (OAuth-based import). Below that, manual input fields for information the system needs regardless of import method:
   - Current location (city/state dropdown + remote toggle)
   - Work preference: Remote / Hybrid / On-site (radio buttons)
   - Compensation target: salary range slider ($30K–$300K+ in $10K increments)
   - Visa / work authorization: US Citizen, Green Card, H-1B, OPT, Other (dropdown)
   - Seniority level: Entry-Level, Mid-Level, Senior, Staff/Principal, Manager, Senior Manager, Director, VP+ (dropdown) — **this is a direct user input, not AI-inferred**
   - Management experience: No direct reports, 1–3 direct reports, 4–10 direct reports, 10+ direct reports (dropdown) — **direct user input**
   - Level direction: I want to stay at my current level, I'm open to a step up, I'm open to a step down for the right role (radio buttons) — **direct user input**

2. She uploads her resume (PDF). The system shows a progress indicator: "Analyzing your background..." (3–8 seconds). The AI extraction pipeline runs (see Section 6: AI Architecture).

3. She is taken to the Career Snapshot Review screen (Screen 3). The AI has extracted and structured:
   - Work history: a timeline of roles with company, title, dates, and duration
   - Key skills: displayed as editable chips, grouped by category (technical, domain, soft skills)
   - Accomplishments: top 8–12 achievement statements extracted from the resume, each tagged with impact type (revenue, efficiency, scale, quality, leadership)
   - Industries: identified industries as chips
   - Tools / tech stack: extracted tools and technologies as chips
   - Career narrative: a 2–3 sentence AI-generated summary of her career arc

   Each section is individually editable. She can add, remove, or modify any chip or statement. Achievement statements show the source evidence (the original resume bullet they were extracted from) in a tooltip on hover.

   The identity-level fields she entered in Step 1 (seniority, management experience, level direction) appear at the top as confirmed facts — not AI guesses. They're displayed as editable dropdowns in case she wants to change them.

4. She reviews, makes two corrections (adds a missing skill, fixes a job title), and clicks "Looks right."

**Edge cases:**
- Resume is a scanned image PDF with no extractable text: system runs OCR first, then extraction. If OCR quality is too low, shows a message: "We had trouble reading your resume. You can try uploading a Word document version, or add your details manually."
- LinkedIn import fails (OAuth error): system shows an error message and suggests uploading a resume instead.
- Resume is in a non-English language: v1 supports English only. System shows: "Waypointer currently supports English-language resumes. We're working on additional languages."
- Very short resume (< 3 roles): system extracts what it can and prompts the user to add any missing roles manually.

### Flow 4: Role Targeting

**Trigger:** Maya has confirmed her career snapshot.

1. She arrives at the Target Role Paths screen (Screen 4). The AI has generated 3 recommended role paths based on her career snapshot, seniority level, management experience, level direction, location, compensation target, and work preference.

   Each path is displayed as a card. Example for Maya (former CSM at B2B SaaS):
   - **Path A: Customer Success Manager at B2B SaaS** — "Direct continuation of your experience. High demand, strong skills overlap."
   - **Path B: Implementation Consultant** — "Leverages your technical onboarding expertise. Higher compensation ceiling."
   - **Path C: Revenue Operations Analyst** — "Pivot into a growing function. Your CRM and data skills transfer well."

   Each card shows:
   - Why it fits: 2–3 sentence explanation referencing her specific experience
   - Likely salary band: range based on location and seniority
   - Demand level: High / Medium / Low (based on current market data)
   - Confidence score: percentage indicating how strong the match is
   - Skills overlap: visual bar showing percentage of her skills that apply
   - Missing pieces: any skills or experience gaps to be aware of

2. Maya selects Path A as her primary and Path B as a secondary. She skips Path C. She can also type in a custom path if none of the suggestions fit.

3. She clicks "Build my search plan."

**Edge cases:**
- User selects 0 paths: CTA is disabled. A subtle prompt says "Select at least one target path to continue."
- User wants a path not suggested: "Add custom path" link opens a form where they enter a target role title. The AI generates the same card structure for the custom path.
- AI generates paths that feel wrong (e.g., too junior): the user can click "Suggest different paths" to regenerate. The system uses their feedback (which paths they rejected) to improve the next set.

### Flow 5: Transition Plan Generation

**Trigger:** Maya has selected her target role paths.

1. She arrives at the Transition Plan Dashboard screen (Screen 5). This is her command center for the rest of her time on the platform. It shows:

   **Header section:**
   - Selected target paths (Path A: CSM, Path B: Implementation Consultant)
   - Recommended search strategy: "Focus 70% of effort on Path A, 30% on Path B. Your CSM experience is strongest for immediate traction."
   - Readiness score: a percentage (e.g., 42%) with a breakdown of what's pulling it down (no tailored resume yet, LinkedIn not updated, no mock interviews completed)

   **First 7-day plan:**
   - Day 1–2: Build tailored resumes for both paths
   - Day 2–3: Update LinkedIn profile
   - Day 3–5: Review first batch of matched jobs
   - Day 5–7: Send 3 outreach messages, complete 1 mock interview

   **Quick-action CTA buttons:**
   - Build my resumes
   - Update my LinkedIn
   - See recommended jobs
   - Practice interviews

   **Timeline:** A visual timeline showing the 90-day access window with suggested milestones.

2. Maya clicks "Build my resumes" and enters the Resume workflow.

### Flow 6: Resume and LinkedIn Generation

**Trigger:** Maya clicks "Build my resumes" from the Transition Plan Dashboard.

1. She arrives at the Resume Workspace screen (Screen 6). She sees tabs for each selected path:
   - Tab 1: "CSM at B2B SaaS" (primary)
   - Tab 2: "Implementation Consultant" (secondary)

2. She's on Tab 1. The AI has generated a tailored resume for the CSM path. The resume is displayed in a rich preview pane on the left, with an editing/feedback panel on the right.

   **Resume content (left pane):**
   - Summary statement: tailored to CSM roles, referencing her specific experience
   - Key skills section: reordered and filtered for CSM relevance
   - Achievement bullets: rewritten to emphasize CSM-relevant impact (retention rates, expansion revenue, NPS improvements)
   - Experience section: reordered to lead with the most CSM-relevant roles
   - Suggested keywords: ATS-optimized terms highlighted in the resume

   **Editing panel (right pane):**
   - ATS strength score: percentage
   - Clarity score: percentage
   - Specificity score: percentage
   - Missing metrics: "Your second bullet doesn't include a number. Can you add one?"
   - Weak bullet warnings: specific bullets flagged with suggested rewrites
   - Tone selector: Professional / Confident / Conversational

   She can:
   - Accept individual suggestions (click to apply)
   - Rewrite any section manually (inline editing)
   - Swap tone (regenerates with different voice)
   - Add missing metrics (prompted with suggestions)

3. She reviews and accepts most suggestions, manually edits two bullets, and switches to Tab 2 to review the Implementation Consultant version.

4. When satisfied, she clicks "Download" and selects PDF or DOCX. The system generates the file using the document generation pipeline (see Section 10: Document Generation System) and downloads it.

5. She navigates to the LinkedIn Optimizer screen (Screen 7). The AI has generated:
   - Headline: tailored to her primary path
   - About section: rewritten to emphasize her transition narrative
   - Experience bullet refresh: suggested updates for her most recent roles
   - Featured section suggestions: what to pin
   - Skill list recommendations: which LinkedIn skills to add/reorder
   - "Open to Work" guidance: whether to enable it and what settings to use
   - Recruiter-facing profile tips: what recruiters search for in her target roles

6. She copies each section individually (copy buttons next to each) and updates her LinkedIn profile in a separate tab. When done, she clicks "Mark profile updated." The readiness score on her dashboard increases.

**Edge cases:**
- Resume generation takes too long (>15 seconds): show a progress message: "Building your tailored resume..." with a progress bar. If it exceeds 30 seconds, show "This is taking longer than usual. We'll email you when it's ready."
- User wants more than the 2–3 path-based resumes: v1 supports up to 3 resume variants tied to selected paths. A "request additional variant" option is post-launch.
- Download fails: retry button + option to receive the file by email.

### Flow 7: Job Discovery and Triage

**Trigger:** Maya navigates to the Jobs section from the main nav.

1. She arrives at the Recommended Jobs Feed screen (Screen 8). The feed is not a generic job board. Every listing is filtered through her selected target paths, location, compensation range, and work preference.

   Each job card shows:
   - Job title
   - Company name and logo
   - Location (with remote/hybrid/on-site tag)
   - Fit score: High Fit / Stretch / Low Fit (color-coded)
   - Why it matches: a 1–2 sentence AI-generated explanation. Examples: "Strong match on Salesforce admin + stakeholder enablement." "Stretch role but good industry fit." "Compensation likely below your target."
   - Likely competition level: Low / Medium / High
   - Recommended action: Apply Now / Reach Out First / Seek Referral / Save for Later / Skip

2. She scrolls through the feed. She can filter by: path (CSM or Implementation Consultant), fit score, location, company size, and recommended action. She can sort by: fit score, date posted, or company.

3. She clicks on a high-fit CSM role at a mid-market SaaS company. She's taken to the Job Detail + Application Kit screen (Screen 9).

   **Left pane — Job details:**
   - Job description summary (AI-condensed, not the full JD)
   - Match analysis: skills matched, skills missing, experience alignment, compensation alignment
   - Likely interview themes based on the JD

   **Right pane — Application kit:**
   - Resume recommendation: "Use your CSM resume (Resume A)" with a link to view/download
   - Suggested edits for this specific role: 1–2 bullet tweaks to better match the JD
   - Tailored intro paragraph: a short cover note personalized to this company and role
   - Recruiter outreach message draft
   - Hiring manager outreach message draft
   - Referral request draft (for if she has a connection at the company)
   - Interview prep starter pack: 3–5 likely interview questions based on the JD

   **CTA options:**
   - "Use this application kit" (saves to her tracker)
   - "Save"
   - "Track as applied" (marks it in her progress tracker)

4. She uses the application kit, copies the tailored intro paragraph, and applies directly on the company's careers page (external — Waypointer does not submit applications). She comes back and marks it as "Applied."

**Edge cases:**
- No jobs match the user's criteria: show an empty state with suggestions: "We didn't find strong matches today. Try expanding your location radius or adding a secondary path."
- Job listing has been taken down: show "This listing may no longer be active" with a suggestion to check directly on the company site.
- User hasn't completed resume generation yet: the application kit still generates, but the "Resume recommendation" section shows a prompt: "Build your tailored resume first for the best results" with a link to the Resume Workspace.

### Flow 8: Outreach Preparation

**Trigger:** Maya navigates to the Outreach section, or clicks an outreach draft from a Job Detail screen.

1. She arrives at the Outreach Builder screen (Screen 10). She sees a clean form:

   **Step 1: Select recipient type** (radio buttons)
   - Recruiter
   - Hiring manager
   - Former colleague
   - Alumni network contact
   - Referral request
   - Follow-up after application

   **Step 2: Context** (conditional fields based on recipient type)
   - Role pursuing: dropdown of her target paths
   - Job or company: text field or select from saved jobs
   - Relationship strength: Cold / Warm / Close (radio buttons)
   - Any personal context: optional text field ("We met at SaaStr 2024")

2. She selects "Hiring manager," picks the CSM role she just applied to, marks the relationship as "Cold," and clicks "Generate."

3. The AI generates:
   - Short LinkedIn message (under 300 characters for InMail limits)
   - Email version (3–4 sentences)
   - Follow-up version (for 5–7 days later)
   - Tone options: Warmer / More formal (toggle to regenerate)

   Below the drafts, a guidance box shows:
   - When to use this: "Send within 24 hours of applying"
   - How soon to follow up: "If no response, follow up in 5–7 business days"
   - What not to say: "Don't mention being laid off in the first message. Lead with value."

4. She copies the LinkedIn message, opens LinkedIn in another tab, and sends it. She returns to Waypointer and logs it in her progress tracker.

**Edge cases:**
- User tries to generate outreach without selecting a role: prompt says "Select a role you're pursuing so we can personalize the message."
- User wants to generate outreach for a company not in their saved jobs: they can type in a company name and role manually.

### Flow 9: Voice Interview Practice

**Trigger:** Maya navigates to the Interviews section.

1. She arrives at the Interview Prep Hub screen (Screen 11). She sees sections organized by her target paths:

   **For each path:**
   - Common questions for this role type (5–8 questions listed)
   - Behavioral questions relevant to her experience level
   - Company-specific prep (if she has saved jobs, the system generates prep for those specific companies)
   - Strengths to emphasize (drawn from her career snapshot)
   - Weak spots to prepare for (skill gaps identified in role targeting)
   - Compensation conversation prep

   **CTA:** "Start Mock Interview"

2. She clicks "Start Mock Interview." A modal appears asking:
   - Interview type: General for role / Specific company (dropdown of saved jobs)
   - Interview format: Behavioral / Technical / Mixed
   - Duration: 10 minutes / 15 minutes / 20 minutes
   - Difficulty: Standard / Challenging

3. She selects "General CSM interview," "Behavioral," "15 minutes," and "Standard." She clicks "Begin."

4. She enters the Mock Interview Session screen (Screen 12). The session is voice-based, powered by ElevenLabs Conversational AI.

   **Session flow:**
   - The AI interviewer introduces itself with a brief, natural greeting and explains the format.
   - It asks questions one at a time, following up naturally based on her answers (not a rigid script).
   - The conversation feels like a real interview — follow-up probes, "tell me more about that," requests for specific examples.
   - The session lasts the selected duration.
   - At the end, the AI wraps up naturally: "That's all the time we have. Thanks for walking me through your experience."

   **During the session, the UI shows:**
   - A timer
   - A visual voice indicator (so she knows the system is listening)
   - A "Pause" button and "End early" button
   - No text transcript during the session (to maintain immersion)

5. After the session ends, the audio is processed and she's taken to the Interview Feedback Report screen (Screen 13). The system has transcribed the session and analyzed it.

   **Feedback sections:**
   - Overall performance score: percentage
   - Answer quality: which answers were strong (specific, evidence-backed) and which were vague
   - Clarity score: filler word count, average answer length, conciseness assessment
   - Specificity score: how often she used concrete examples vs. generalizations
   - Confidence assessment: pacing, hedging language, assertiveness
   - Strongest stories surfaced: the 2–3 best anecdotes she told, highlighted for reuse
   - Weak answers to revisit: specific questions where her answer could improve, with a suggested stronger answer rewrite
   - Next practice recommendation: what to focus on in her next session

   **CTAs:**
   - "Practice again"
   - "Add to weekly plan"
   - "Review transcript" (full text transcript with annotations)

**Edge cases:**
- Microphone permission denied: clear instructions for enabling mic access in browser settings.
- Audio quality too poor to transcribe: system shows "We had trouble processing the audio. Try again in a quieter environment or check your microphone."
- User ends session very early (< 2 minutes): system asks if everything is okay and offers to restart. Doesn't generate a feedback report for sessions under 2 minutes.
- ElevenLabs API is down: show "Interview practice is temporarily unavailable. We'll notify you when it's back." Don't let the user start a session that will fail.

### Flow 10: Weekly Plan and Progress Tracking

**Trigger:** Maya returns to the platform on a subsequent day, or navigates to the Progress section.

1. She sees the Weekly Action Plan screen (Screen 14). The system has generated a concrete, personalized plan for the week based on her activity so far and where she is in her transition.

   Example (Week 2):
   - Review 12 high-fit roles (6 remaining)
   - Pursue 5 jobs (2 completed)
   - Send 3 outreach messages (1 sent)
   - Complete 2 mock interviews (0 done)
   - Update 1 resume bullet with a metric (not started)

   Each item has a checkbox, and the plan shows progress inline. She can:
   - Mark items complete
   - Defer items to next week
   - Regenerate the plan (if it feels off)
   - Set reminders (email nudge for specific items)

   The plan is calibrated to not be overwhelming — it suggests 5–8 actions per week, scaled to the user's pace. If she's been very active, it suggests more. If she's been quiet, it gently suggests fewer, focused actions.

2. She clicks through to the Progress Tracker screen (Screen 15). This is a visual dashboard:

   **Metrics displayed:**
   - Resumes completed: 2/2 (checkmark)
   - LinkedIn updated: Yes (checkmark)
   - Applications tracked: 7
   - Outreach messages sent: 4
   - Mock interviews completed: 3
   - Interviews landed: 1
   - Confidence check-in: a weekly self-reported score (1–5 scale, plotted over time)
   - Streak: "Active 12 days in a row"

   **Visual elements:**
   - A progress bar showing overall transition readiness
   - A weekly activity chart (bar chart, last 4 weeks)
   - A milestone timeline (resume done → first application → first outreach → first interview → offer)

   This screen exists to give the user evidence of momentum, even before an offer arrives. The emotional effect of seeing forward movement matters enormously during a job search.

### Flow 11: Employer Dashboard and Reporting

**Trigger:** Marcus (HR buyer) logs into the employer admin portal.

1. He arrives at the Employer Dashboard screen (Screen E4). The top of the screen shows key metrics:
   - Seats purchased: 90
   - Seats activated: 71 (78.9%)
   - Onboarding completion rate: 65 (91.5% of activated)
   - Resume completion rate: 58 (81.7% of activated)
   - Interview practice rate: 34 (47.9% of activated)
   - Weekly active usage: 52 (73.2% of activated)
   - Average satisfaction score: 4.2/5

   **Widgets below:**
   - Activations over time: line chart showing daily activations since launch
   - Engagement by module: horizontal bar chart showing which modules are most used
   - Inactive users: count of users who haven't logged in for 7+ days, with a "Send re-engagement email" button (email is sent from Waypointer, not from the employer, with supportive framing)
   - Activity heatmap: which days of the week employees are most active

   All data is aggregated. No individual employee data is visible. Marcus cannot see which specific employees have or haven't done mock interviews — only the aggregate percentage.

2. He navigates to the Transition Outcomes screen (Screen E5) via the Reporting nav item. This screen shows:
   - Percentage engaged (logged in at least 3 times): 85%
   - Percentage interview-ready (completed resume + mock interview): 62%
   - Average time to first interview (opt-in reporting): 18 days
   - Self-reported confidence lift: +2.1 points average (on 1–5 scale)
   - Opt-in placement rate: 34% (of those who reported)
   - Average time to placement: 47 days (of those who reported)
   - Satisfaction with support received: 4.3/5

   **Export options:**
   - PDF summary report: a formatted, board-ready document showing key outcomes
   - CSV usage export: raw data for internal analysis
   - Employer brand support summary: a narrative document HR can use in internal communications or Glassdoor responses

3. Marcus downloads the PDF summary and forwards it to the CEO. This is the data that drives renewal.

**Edge cases:**
- Very few employees have opted into placement reporting: show the metric with a note: "Based on N self-reports. Encourage employees to share their outcomes to improve this data."
- No employees have activated: dashboard shows an alert: "No employees have activated yet. Consider resending invites or checking spam filters."

---

## 4. Screen Architecture

### Employee Screens (14 total)

| # | Screen Name | Route | Purpose |
|---|-------------|-------|---------|
| 1 | Welcome | `/welcome` | Reassure, explain, get started |
| 2 | Import Your Background | `/onboarding/import` | Resume upload, LinkedIn import, identity-level inputs |
| 3 | Career Snapshot Review | `/onboarding/snapshot` | AI extraction review and correction |
| 4 | Target Role Paths | `/onboarding/paths` | Role targeting — the first "aha" |
| 5 | Transition Plan Dashboard | `/dashboard` | Command center, weekly plan, readiness score |
| 6 | Resume Workspace | `/resumes` | Tailored resume generation and editing per path |
| 7 | LinkedIn Optimizer | `/linkedin` | LinkedIn profile rewrite and copy |
| 8 | Recommended Jobs Feed | `/jobs` | Curated, scored job matches |
| 9 | Job Detail + Application Kit | `/jobs/:id` | Per-job match analysis and outreach materials |
| 10 | Outreach Builder | `/outreach` | Networking and outreach message generation |
| 11 | Interview Prep Hub | `/interviews` | Role-specific question prep |
| 12 | Mock Interview Session | `/interviews/session` | Voice-based mock interview (ElevenLabs) |
| 13 | Interview Feedback Report | `/interviews/feedback/:id` | Post-session analysis and coaching |
| 14 | Weekly Plan & Progress | `/progress` | Action plan, tracker, momentum visualization |

### Employer Screens (5 total)

| # | Screen Name | Route | Purpose |
|---|-------------|-------|---------|
| E1 | Company Setup | `/employer/setup` | Brand, admin users, program config |
| E2 | Program Settings | `/employer/program` | Seats, duration, modules, tiers |
| E3 | Invite Employees | `/employer/invite` | CSV upload, manual add, send invites |
| E4 | Employer Dashboard | `/employer/dashboard` | Aggregated usage analytics |
| E5 | Transition Outcomes | `/employer/outcomes` | Placement metrics, exports, renewal data |

### Navigation Structure

**Employee nav (sidebar):**
- Home (dashboard)
- Resumes
- Jobs
- Outreach
- Interviews
- Progress

**Employer nav (sidebar):**
- Overview (dashboard)
- Employees (invite + status)
- Program (settings)
- Reporting (outcomes)
- Billing

### Day Zero Email Kit

The Day Zero Kit is a set of pre-built, tone-calibrated email templates provided to the employer during onboarding (Screen E1). These are not screens — they are email templates the platform sends on behalf of the employer when invites are triggered.

**Template 1: Standard Invitation**
- Subject: "[Company Name] has provided you with career transition support"
- Tone: Calm, respectful, practical
- Content: explains what Waypointer is, what the employee can do with it, estimated time for first session, single CTA button
- Does NOT mention the word "layoff" or "termination" — uses "career transition" and "next step"

**Template 2: Re-engagement (72 hours)**
- Subject: "Your transition support is ready when you are"
- Tone: Gentle, no pressure
- Content: reminds them access is available, mentions what they could accomplish in 20 minutes, single CTA

**Template 3: Weekly Nudge**
- Subject: "You have new job matches waiting"
- Tone: Supportive, action-oriented
- Content: highlights new matched jobs or reminds them of pending action items, CTA to log in

**Template 4: 30-Day Check-in**
- Subject: "How's your search going?"
- Tone: Warm, encouraging
- Content: confidence check-in prompt, highlights their progress metrics, encourages mock interview if not yet completed

All emails are sent from "Waypointer" (not from the employer) and include an unsubscribe link. The employer can preview but not edit the email content (to protect tone consistency). The employer's logo and custom message appear in the email header.

---

## 5. Feature Set

### Launch Features — Employee

**Onboarding and Profile**
- Resume upload (PDF, DOCX) and LinkedIn import (OAuth) with AI extraction of work history, skills, accomplishments, industries, and tools. This is the foundation — everything downstream depends on understanding the user's background accurately.
- Identity-level direct inputs: seniority dropdown, management experience dropdown, level direction radio buttons. These are never inferred — they're asked because getting them wrong would feel insulting.
- Career Snapshot Review with per-field editing, source evidence tooltips on extracted achievements, and the ability to add/remove/modify any extracted data point.

**Role Targeting**
- AI-generated role path recommendations (3 paths) based on career snapshot, seniority, management experience, level direction, location, comp target, and work preference. Each path includes a "why you fit" narrative, salary band, demand level, confidence score, skills overlap, and gap analysis.
- Custom path addition: users can define their own target role if the AI suggestions don't fit.
- Path regeneration: users can request new suggestions, and the system learns from rejected paths.

**Resume and LinkedIn**
- Tailored resume generation per selected path, with summary statement, reordered skills, rewritten achievement bullets, ATS keyword alignment, and quality scoring (ATS strength, clarity, specificity).
- Inline editing of all resume content with AI-suggested rewrites.
- Tone selection (Professional / Confident / Conversational) that regenerates the resume voice.
- Download as PDF or DOCX via the document generation pipeline.
- LinkedIn profile optimization: headline, About section, experience bullets, featured section suggestions, skill recommendations, Open to Work guidance, and recruiter-facing tips.

**Job Discovery**
- Curated job matches feed filtered by target paths, location, compensation, and work preference. Each listing includes a fit score, match explanation, competition level, and recommended action.
- Job detail view with match analysis, resume recommendation, suggested role-specific edits, and a full application kit (intro paragraph, recruiter message, hiring manager message, referral request, interview prep starter).
- Application tracker: mark jobs as saved, applied, interviewing, or closed.

**Outreach**
- Outreach message generator by recipient type (recruiter, hiring manager, colleague, alumni, referral, follow-up), with context inputs for role, company, relationship strength, and personal notes.
- Multiple output formats per generation: LinkedIn message (character-limited), email, and follow-up version.
- Tone toggle (warmer / more formal).
- Contextual guidance box with timing, etiquette, and anti-patterns.

**Interviews**
- Interview Prep Hub with role-specific questions, behavioral questions, company-specific prep (for saved jobs), strengths/weaknesses to prepare for, and compensation conversation prep.
- Voice-based mock interviews via ElevenLabs Conversational AI, with configurable type (general/company-specific), format (behavioral/technical/mixed), duration (10/15/20 min), and difficulty (standard/challenging).
- Post-session feedback report: performance score, answer quality analysis, clarity score (filler words, conciseness), specificity score, confidence assessment, strongest stories, weak answers with suggested rewrites, and next practice recommendation.
- Full session transcript with annotations.

**Accountability**
- AI-generated weekly action plan with 5–8 concrete tasks, progress tracking, defer/regenerate options, and email reminders.
- Progress tracker dashboard: resumes completed, LinkedIn updated, applications tracked, outreach sent, interviews practiced, interviews landed, confidence check-ins, streak counter, activity chart, and milestone timeline.

### Launch Features — Employer

**Setup and Configuration**
- Company setup: name, logo, brand color, admin users (up to 5), support contact, default program duration, custom welcome message.
- Program settings: seat count, access duration, module toggles, package tier, custom intro message.
- Day Zero Email Kit: 4 pre-built, tone-calibrated email templates (invitation, re-engagement, weekly nudge, 30-day check-in) sent from Waypointer with employer branding.

**Employee Management**
- Invite via CSV upload, manual add, or bulk email. CSV template with validation and duplicate detection.
- Seat status tracking: Invited / Activated / Active / Inactive / Expired.
- Batch re-engagement email trigger for inactive users (sent from Waypointer, not employer).

**Analytics and Reporting**
- Aggregated usage dashboard: activation rate, onboarding completion, resume completion, interview practice rate, weekly active usage, satisfaction score.
- Engagement widgets: activations over time, engagement by module, inactive user count, activity heatmap.
- Transition outcomes: engagement rate, interview-readiness rate, time to first interview, confidence lift, opt-in placement rate, time to placement, satisfaction.
- Export: PDF summary report, CSV usage data, employer brand support narrative.

### What the Product Does NOT Do at Launch

- **No autonomous job applications.** The product prepares everything; the user submits.
- **No automated message sending.** The product drafts messages; the user copies and sends.
- **No ATS integrations.** Job matches come from aggregated job data, not direct ATS feeds.
- **No human coaching as a default.** The Plus tier's human kickoff session is the only human touchpoint.
- **No LinkedIn automation or scraping.** LinkedIn import is OAuth-based. No automated posting, messaging, or connection requests.
- **No mobile app.** Web-responsive only at launch.
- **No international support.** English-language only, US-focused job matching.
- **No community or forum.** No peer-to-peer features.
- **No salary negotiation simulator.** Compensation conversation prep is text-based guidance, not interactive.
- **No mental health support layer.** The product maintains a supportive tone but does not provide counseling or crisis resources.

### Post-Launch Roadmap (Brief)

- Human coaching marketplace (Phase 2)
- ATS integrations for job matching enrichment
- International expansion (UK, Canada, Australia first)
- Mobile app
- PE portfolio multi-company management view
- White-label offering for HR consultancies
- Role-path libraries and profession-specific transition playbooks
- Salary negotiation simulator
- Alumni network features
- Channel partnerships (Rippling, Deel, Gusto integration)

---

## 6. AI Architecture

### Overview

Waypointer is an AI-native product. AI is not a feature — it is the product's core delivery mechanism. Every module except basic CRUD operations (auth, seat management, billing) relies on AI generation.

All prompts are stored in a **Prompt Registry** — a separate configuration layer (documented in `waypointer_prompt_registry.md`). No prompts are hardcoded in application code. The codebase references prompts by ID (e.g., `EXTRACT_CAREER_SNAPSHOT`), and the registry returns the current prompt template. This allows prompt iteration without code redeployment.

### AI Provider

**Primary model:** Anthropic Claude (claude-sonnet-4-20250514) for all text generation tasks.
**Voice interview model:** ElevenLabs Conversational AI for real-time voice mock interviews.

**Why Claude Sonnet:**
- Strong at structured extraction from unstructured documents (resume parsing)
- Excellent at maintaining persona consistency (interview simulation system prompts)
- Good at following complex output format instructions (JSON-structured responses)
- Cost-effective for high-volume generation (resume variants, outreach drafts, job analysis)
- Sufficient quality for all non-voice tasks without requiring Opus-tier pricing

**Why ElevenLabs Conversational AI:**
- Low-latency voice interaction (sub-second response times)
- Natural turn-taking behavior
- Configurable persona and conversation style
- Built-in conversation management (no custom real-time audio pipeline needed)
- API-based, no infrastructure to manage

### AI Pipeline Architecture

All AI calls follow a consistent pattern:

```
Client Request
    → API Route (Next.js edge function or server action)
    → Prompt Registry Lookup (fetch prompt template by ID)
    → Variable Injection (insert user-specific data into template)
    → Claude API Call (with structured output instructions)
    → Response Parsing (extract structured JSON from response)
    → Validation (schema check on parsed output)
    → Client Response
```

**Prompt Registry Integration:**
The registry is a database table (`prompt_registry`) with columns for prompt ID, version, system prompt, user prompt template, output format spec, and active/inactive flag. The API route fetches the active prompt by ID, injects variables, and sends the assembled prompt to Claude. See Section 8 (Database Schema) for the table definition and `waypointer_prompt_registry.md` for all prompt content.

**Structured Output Pattern:**
Every AI call that produces structured data (not free-form text) includes output format instructions in the system prompt specifying the exact JSON schema expected. The API route parses the response and validates it against the schema before returning to the client. If parsing fails, the call is retried once with a "your output was not valid JSON, please try again" nudge appended.

### AI Modules

#### Module 1: Career Snapshot Extraction

**Purpose:** Extract structured career data from an uploaded resume or LinkedIn profile.

**Pipeline:**
1. **Pass 1 — Structural Extraction:** Extract raw facts: job titles, companies, dates, education, certifications, tools/technologies, hard skills explicitly stated. No inference. Output is a flat structured object.
2. **Pass 2 — Semantic Enrichment:** Layer inference on structural data: industry classification, domain expertise areas, career trajectory (IC-track, management-track, hybrid), primary function area. Each inference includes a confidence score (0.0–1.0).
3. **Pass 3 — Achievement Extraction:** Pull out accomplishment statements, tag each with impact type (revenue, efficiency, scale, quality, leadership), flag whether it contains a quantified metric, and link it to the source text in the original resume.

**Prompt IDs:** `EXTRACT_STRUCTURAL`, `EXTRACT_SEMANTIC`, `EXTRACT_ACHIEVEMENTS`

**Input:** Raw text extracted from resume (PDF/DOCX parsed to plain text) or LinkedIn profile data (from OAuth import).
**Output:** `CareerSnapshot` JSON object (see Schema section for shape).

**Critical design decision:** Seniority, management experience, and level direction are NOT extracted by the AI. They are direct user inputs collected on Screen 2. The AI extraction pipeline handles skills, achievements, tools, industries, and career narrative — things that are tedious to self-report but low-risk to get slightly wrong. Identity-level questions are always asked, never inferred.

#### Module 2: Role Path Recommendation

**Purpose:** Generate 3 targeted role path recommendations based on the user's career snapshot and preferences.

**Pipeline:**
1. Assemble context: career snapshot, seniority level, management experience, level direction, location, compensation target, work preference.
2. Single Claude call with the full context. The prompt instructs the model to generate exactly 3 role paths, each with: title, category, why-you-fit narrative (2–3 sentences referencing specific user experience), salary band, demand level (High/Medium/Low), confidence score (0.0–1.0), skills overlap percentage, and gap analysis.

**Prompt ID:** `GENERATE_ROLE_PATHS`

**Input:** `CareerSnapshot` + user preferences (from Screen 2 inputs).
**Output:** Array of 3 `RolePath` objects.

**Regeneration:** If the user requests new suggestions, the prompt includes the previously rejected paths with a "do not suggest these again" instruction, plus any feedback the user provided.

#### Module 3: Resume Generation

**Purpose:** Generate a tailored resume for a specific target role path.

**Pipeline:**
1. Assemble context: career snapshot, selected role path, user preferences.
2. Single Claude call that generates the full resume content: summary statement, key skills (filtered and reordered for role relevance), achievement bullets (rewritten for role relevance), experience section (reordered), and suggested ATS keywords.
3. A separate scoring call evaluates the generated resume on three dimensions: ATS strength, clarity, and specificity. Each score is 0–100 with specific feedback.

**Prompt IDs:** `GENERATE_RESUME`, `SCORE_RESUME`

**Input:** `CareerSnapshot` + `RolePath` + user preferences.
**Output:** `ResumeContent` JSON object + `ResumeScore` object.

**Tone selection:** When the user switches tone, the `GENERATE_RESUME` prompt is called again with a tone parameter injected into the prompt template. The prompt registry stores one template with a `{{tone}}` variable, not three separate prompts.

#### Module 4: LinkedIn Optimization

**Purpose:** Generate LinkedIn profile content tailored to the user's primary target path.

**Pipeline:** Single Claude call with career snapshot and primary role path.

**Prompt ID:** `GENERATE_LINKEDIN`

**Output:** `LinkedInContent` JSON object with fields for headline, about_section, experience_bullets (array), featured_suggestions (array), skill_recommendations (array), open_to_work_guidance (string), and recruiter_tips (string).

#### Module 5: Job Matching and Scoring

**Purpose:** Score and explain job listings against the user's profile.

**Pipeline:**
1. Job listings are fetched from an aggregated job data source (see Architecture section for provider).
2. Each listing is scored in a batch Claude call (up to 10 listings per call). The prompt includes the user's career snapshot and target paths, and for each listing, generates: fit score (High Fit / Stretch / Low Fit), match explanation (1–2 sentences), competition level estimate, and recommended action.

**Prompt ID:** `SCORE_JOB_BATCH`

**Input:** `CareerSnapshot` + `RolePath[]` + array of job listing objects (title, company, description, requirements).
**Output:** Array of `JobScore` objects.

#### Module 6: Application Kit Generation

**Purpose:** Generate a complete application kit for a specific job listing.

**Pipeline:** Single Claude call with career snapshot, relevant role path, resume content, and full job description.

**Prompt ID:** `GENERATE_APPLICATION_KIT`

**Output:** `ApplicationKit` JSON object with fields for intro_paragraph, recruiter_message, hiring_manager_message, referral_request, resume_edits (array of suggested tweaks), and interview_themes (array of likely questions).

#### Module 7: Outreach Message Generation

**Purpose:** Generate outreach messages based on recipient type and context.

**Pipeline:** Single Claude call with career snapshot, target role, recipient type, relationship strength, and optional personal context.

**Prompt ID:** `GENERATE_OUTREACH`

**Output:** `OutreachKit` JSON object with fields for linkedin_message, email_message, followup_message, and guidance (timing, etiquette, anti-patterns).

**Tone toggle:** The prompt template includes a `{{tone}}` variable (warm / formal) that modifies the generation style.

#### Module 8: Interview Simulation

**Purpose:** Conduct a realistic voice-based mock interview.

**Pipeline:**
1. Pre-session: assemble an interviewer persona prompt based on the selected interview type, format, duration, and difficulty. This prompt is sent to the ElevenLabs Conversational AI agent configuration.
2. During session: ElevenLabs handles the real-time voice interaction. The system prompt instructs the AI to behave as a specific interviewer type (e.g., "You are a hiring manager at a mid-market B2B SaaS company interviewing for a Customer Success Manager role. Ask behavioral questions. Follow up on vague answers. Be professional but direct.").
3. Post-session: the audio transcript is sent to Claude for analysis.

**Prompt IDs:** `INTERVIEW_PERSONA` (sent to ElevenLabs), `ANALYZE_INTERVIEW` (post-session Claude call)

**`ANALYZE_INTERVIEW` output:** `InterviewFeedback` JSON object with fields for overall_score (0–100), answer_analyses (array of per-question assessments), clarity_score, specificity_score, confidence_score, filler_word_count, strongest_stories (array), weak_answers (array with suggested rewrites), and next_recommendation.

#### Module 9: Weekly Plan Generation

**Purpose:** Generate a personalized weekly action plan based on the user's current progress and activity.

**Pipeline:** Single Claude call with the user's progress data (what they've completed, what's pending), target paths, and current week number in their transition.

**Prompt ID:** `GENERATE_WEEKLY_PLAN`

**Output:** `WeeklyPlan` JSON object with an array of 5–8 `PlanItem` objects, each with: description, category (resume/jobs/outreach/interviews/other), priority (high/medium/low), and estimated_minutes.

#### Module 10: Transition Plan Summary

**Purpose:** Generate the initial transition plan after role targeting is complete.

**Pipeline:** Single Claude call with career snapshot, selected role paths, and preferences.

**Prompt ID:** `GENERATE_TRANSITION_PLAN`

**Output:** `TransitionPlan` JSON object with fields for search_strategy (text), readiness_score (0–100), readiness_breakdown (object with per-area scores), first_week_plan (array of daily items), and suggested_timeline (array of milestone objects).

### AI Error Handling

All AI calls implement the following error handling:

1. **Timeout:** 30-second timeout per call. If exceeded, return a user-friendly error and log the failure.
2. **Malformed output:** If the response doesn't parse to valid JSON matching the expected schema, retry once with a correction nudge. If the retry also fails, return a generic error and log both attempts.
3. **Rate limiting:** Queue AI calls per user to prevent burst overload. Maximum 5 concurrent AI calls per user session.
4. **Content safety:** All AI outputs are passed through a basic content filter before being shown to the user. The filter checks for: profanity, negative self-talk directed at the user, and hallucinated company names in outreach drafts (cross-checked against the job listing data).
5. **Fallback:** If the AI service is completely unavailable, the platform shows a status banner: "Some features are temporarily limited. Your data is safe — we'll have everything back shortly."

### AI Cost Estimation

Rough per-user cost estimates based on Claude Sonnet pricing:

| Module | Calls per user (est.) | Avg tokens per call | Est. cost per user |
|--------|----------------------|--------------------|--------------------|
| Career Snapshot (3 passes) | 3 | 4,000 in / 2,000 out | $0.06 |
| Role Path Recommendation | 1–3 | 3,000 in / 1,500 out | $0.03 |
| Resume Generation (per path) | 2–6 | 3,500 in / 2,500 out | $0.10 |
| Resume Scoring | 2–6 | 2,000 in / 500 out | $0.02 |
| LinkedIn Optimization | 1–2 | 3,000 in / 1,500 out | $0.03 |
| Job Scoring (batches) | 10–30 | 5,000 in / 2,000 out | $0.20 |
| Application Kit | 5–20 | 4,000 in / 2,000 out | $0.15 |
| Outreach Generation | 5–20 | 2,000 in / 800 out | $0.08 |
| Interview Analysis | 2–10 | 6,000 in / 2,000 out | $0.10 |
| Weekly Plans | 4–12 | 2,000 in / 800 out | $0.05 |
| Transition Plan | 1 | 3,000 in / 1,500 out | $0.02 |

**Estimated total AI cost per user over 90 days: $0.80–$1.50**

At $149/seat, AI costs represent roughly 0.5–1% of revenue per seat. This leaves substantial margin.

---

## 7. Technical Architecture

### Frontend

**Framework:** Next.js 14 (App Router) with React 18
- Why: Server-side rendering for fast initial load (matters for Day 0 emotional moment), API routes for backend logic, excellent DX, strong ecosystem.

**State Management:** Zustand for client state, React Query (TanStack Query) for server state
- Why: Zustand is lightweight and avoids Redux boilerplate. React Query handles caching, background refetching, and loading states for all API calls — critical given how many AI-generated responses the UI displays.

**Styling:** Tailwind CSS + shadcn/ui component library
- Why: Tailwind for utility-first styling, shadcn/ui for accessible, customizable primitives. The product has many form inputs, cards, and data displays — shadcn/ui covers these well without imposing a visual identity.

**Key Libraries:**
- `react-pdf` and `@react-pdf/renderer` for resume PDF preview and generation
- `docx` (npm package) for DOCX generation
- `react-dropzone` for resume upload
- `recharts` for progress and analytics charts
- `date-fns` for date handling
- `zod` for runtime schema validation (shared between client and server)

### Backend

**Runtime:** Next.js API routes (Edge Runtime where possible, Node.js Runtime for heavy operations like document generation)
- Why: Co-located with the frontend, no separate backend service to deploy or maintain. Edge Runtime for fast AI proxy calls; Node.js for document generation that requires Node libraries.

**Hosting:** Vercel
- Why: Native Next.js support, edge functions, automatic scaling, preview deployments for iteration speed.

**AI Integration:** Anthropic SDK (`@anthropic-ai/sdk`) for Claude API calls, ElevenLabs API for voice interviews.

**Job Data:** JSearch API (https://www.openwebninja.com/api/jsearch) — a real-time jobs API that aggregates listings from Google for Jobs and public sources. Provides job titles, descriptions, requirements, salaries, locations, employer info, and application links. Returns up to 500 results per query with 1–8s response times. Pricing: Pro tier at $25/month for 10,000 requests (5/second rate limit), scaling to Mega at $150/month for 200,000 requests. The job data layer is abstracted behind a `JobDataProvider` interface so the source can be swapped without touching the matching logic. API key stored in `JOB_DATA_API_KEY` environment variable.

### Database

**Type:** PostgreSQL via Supabase
- Why: Supabase provides hosted Postgres with auth, real-time subscriptions (useful for employer dashboard live updates), row-level security, and a generous free tier for development. Postgres is the right choice for relational data with complex queries (user profiles, job matches, analytics aggregation).

**Auth:** Supabase Auth
- Why: Built-in email/password and Google OAuth. Handles JWT issuance and refresh. Row-Level Security policies enforce employer/employee data isolation without application-level access control code.

**File Storage:** Supabase Storage
- Why: Co-located with the database, integrated auth, and presigned URL support for resume uploads and generated document downloads.

**File types stored:**
- Uploaded resumes (PDF, DOCX) — stored as-is for reference
- Generated resumes (PDF, DOCX) — stored after generation for download
- Generated reports (PDF) — employer summary reports

### Real-time

Supabase Realtime subscriptions for the employer dashboard. When an employee activates their account or completes a milestone, the employer dashboard updates live without polling. This is a nice-to-have for v1 — polling every 30 seconds is an acceptable fallback.

### Key Architectural Decisions

**Why not a separate backend service?**
The product is CRUD + AI API calls + document generation. There's no compute-heavy processing that requires a dedicated server. Next.js API routes handle all three. Adding a separate backend would double the deployment surface and slow iteration speed for zero benefit at this scale.

**Why Supabase over raw Postgres or Firebase?**
Supabase gives us auth, RLS, real-time, and storage in one hosted service. Firebase's document model is a poor fit for relational data (user profiles with many relationships). Raw Postgres would require setting up auth, file storage, and real-time separately.

**Why not stream AI responses to the client?**
For most AI calls (resume generation, job scoring), the output needs to be parsed and validated as complete JSON before being displayed. Streaming partial JSON to the client creates parsing complexity without meaningful UX benefit — the user sees a loading state for 3–8 seconds, which is acceptable. The exception is the voice interview, which is handled by ElevenLabs' real-time pipeline and doesn't go through our AI proxy.

**Why Edge Runtime for AI proxy calls?**
Claude API calls are I/O-bound (waiting for the API response). Edge Runtime handles these efficiently with lower cold-start latency than Node.js, which matters for the resume workspace where users interact with multiple AI calls in sequence.

---

## 8. Database Schema

### Enums

```sql
-- Seniority levels (identity-level, user-selected)
CREATE TYPE seniority_level AS ENUM (
  'entry_level',
  'mid_level',
  'senior',
  'staff_principal',
  'manager',
  'senior_manager',
  'director',
  'vp_plus'
);

-- Management experience (identity-level, user-selected)
CREATE TYPE management_experience AS ENUM (
  'no_direct_reports',
  '1_to_3',
  '4_to_10',
  '10_plus'
);

-- Level direction preference (identity-level, user-selected)
CREATE TYPE level_direction AS ENUM (
  'stay_current',
  'open_to_step_up',
  'open_to_step_down'
);

-- Work preference
CREATE TYPE work_preference AS ENUM (
  'remote',
  'hybrid',
  'on_site'
);

-- Work authorization
CREATE TYPE work_authorization AS ENUM (
  'us_citizen',
  'green_card',
  'h1b',
  'opt',
  'other'
);

-- Job fit score
CREATE TYPE fit_score AS ENUM (
  'high_fit',
  'stretch',
  'low_fit'
);

-- Recommended action for a job
CREATE TYPE job_action AS ENUM (
  'apply_now',
  'reach_out_first',
  'seek_referral',
  'save_for_later',
  'skip'
);

-- Application status
CREATE TYPE application_status AS ENUM (
  'saved',
  'applied',
  'interviewing',
  'offer',
  'closed'
);

-- Seat status
CREATE TYPE seat_status AS ENUM (
  'invited',
  'activated',
  'active',
  'inactive',
  'expired'
);

-- Interview session format
CREATE TYPE interview_format AS ENUM (
  'behavioral',
  'technical',
  'mixed'
);

-- Interview difficulty
CREATE TYPE interview_difficulty AS ENUM (
  'standard',
  'challenging'
);

-- Outreach recipient type
CREATE TYPE recipient_type AS ENUM (
  'recruiter',
  'hiring_manager',
  'former_colleague',
  'alumni',
  'referral_request',
  'follow_up'
);

-- Relationship strength
CREATE TYPE relationship_strength AS ENUM (
  'cold',
  'warm',
  'close'
);

-- Resume tone
CREATE TYPE resume_tone AS ENUM (
  'professional',
  'confident',
  'conversational'
);

-- Outreach tone
CREATE TYPE outreach_tone AS ENUM (
  'warm',
  'formal'
);

-- Plan item category
CREATE TYPE plan_item_category AS ENUM (
  'resume',
  'jobs',
  'outreach',
  'interviews',
  'linkedin',
  'other'
);

-- Impact type for achievements
CREATE TYPE impact_type AS ENUM (
  'revenue',
  'efficiency',
  'scale',
  'quality',
  'leadership'
);

-- Employer program tier
CREATE TYPE program_tier AS ENUM (
  'standard',
  'plus',
  'premium'
);

-- Email template type
CREATE TYPE email_template_type AS ENUM (
  'invitation',
  'reengagement_72h',
  'weekly_nudge',
  'thirty_day_checkin'
);
```

### Core Tables

```sql
-- ============================================================
-- EMPLOYER TABLES
-- ============================================================

-- Companies (employer accounts)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT, -- Supabase Storage path
  brand_color TEXT DEFAULT '#2563EB', -- hex value
  support_email TEXT,
  welcome_message TEXT, -- custom message shown to employees on welcome screen
  default_program_duration_days INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employer admin users
CREATE TABLE employer_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  auth_user_id UUID UNIQUE NOT NULL, -- references Supabase Auth user
  is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- primary admin who created the account
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);
CREATE INDEX idx_employer_admins_company ON employer_admins(company_id);
CREATE INDEX idx_employer_admins_auth ON employer_admins(auth_user_id);

-- Transition programs (a company can have multiple programs over time)
CREATE TABLE transition_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Program',
  tier program_tier NOT NULL DEFAULT 'standard',
  total_seats INT NOT NULL,
  used_seats INT NOT NULL DEFAULT 0,
  access_duration_days INT NOT NULL DEFAULT 90,
  is_branded BOOLEAN NOT NULL DEFAULT TRUE,
  custom_intro_message TEXT,
  interview_coaching_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  outreach_builder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transition_programs_company ON transition_programs(company_id);

-- ============================================================
-- EMPLOYEE / SEAT TABLES
-- ============================================================

-- Seats (the invitation/allocation record)
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES transition_programs(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  department TEXT,
  role_family TEXT,
  last_day DATE, -- last day at the company
  status seat_status NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- calculated: activated_at + access_duration_days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, employee_email)
);
CREATE INDEX idx_seats_program ON seats(program_id);
CREATE INDEX idx_seats_email ON seats(employee_email);
CREATE INDEX idx_seats_status ON seats(status);

-- Employee profiles (created when an employee activates their seat)
CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL, -- references Supabase Auth user
  seat_id UUID UNIQUE NOT NULL REFERENCES seats(id),
  -- Identity-level fields (direct user input, never AI-inferred)
  seniority seniority_level,
  management_exp management_experience,
  level_dir level_direction,
  -- Preferences
  location_city TEXT,
  location_state TEXT,
  work_pref work_preference,
  comp_target_min INT, -- annual salary in USD
  comp_target_max INT,
  work_auth work_authorization,
  years_of_experience INT,
  most_recent_role TEXT,
  most_recent_company TEXT,
  -- Onboarding state
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  paths_selected BOOLEAN NOT NULL DEFAULT FALSE,
  -- File references
  uploaded_resume_url TEXT, -- Supabase Storage path to original upload
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employee_profiles_auth ON employee_profiles(auth_user_id);
CREATE INDEX idx_employee_profiles_seat ON employee_profiles(seat_id);

-- ============================================================
-- CAREER SNAPSHOT TABLES
-- ============================================================

-- Career snapshot (the AI-extracted + user-confirmed profile)
CREATE TABLE career_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  career_narrative TEXT, -- AI-generated 2-3 sentence summary
  raw_extraction JSONB, -- full raw AI extraction output for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work history entries
CREATE TABLE work_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE, -- NULL = current/most recent
  duration_months INT,
  description TEXT,
  is_management_role BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_work_history_snapshot ON work_history(snapshot_id);

-- Skills (extracted + user-edited)
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'technical', 'domain', 'soft_skill'
  confidence FLOAT NOT NULL DEFAULT 1.0, -- AI confidence 0.0-1.0
  is_user_added BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skills_snapshot ON skills(snapshot_id);

-- Achievements (extracted from resume)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  impact impact_type,
  has_metric BOOLEAN NOT NULL DEFAULT FALSE,
  source_text TEXT, -- original resume bullet it was extracted from
  work_history_id UUID REFERENCES work_history(id), -- which role it came from
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_achievements_snapshot ON achievements(snapshot_id);

-- Industries
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_industries_snapshot ON industries(snapshot_id);

-- Tools and technologies
CREATE TABLE tools_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES career_snapshots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'crm', 'analytics', 'programming', 'design', etc.
  confidence FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tools_snapshot ON tools_technologies(snapshot_id);

-- ============================================================
-- ROLE TARGETING TABLES
-- ============================================================

-- Role paths (AI-recommended or user-created)
CREATE TABLE role_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g. "Customer Success Manager at B2B SaaS"
  category TEXT, -- broad category
  why_it_fits TEXT NOT NULL, -- 2-3 sentence narrative
  salary_band_min INT,
  salary_band_max INT,
  demand_level TEXT NOT NULL CHECK (demand_level IN ('high', 'medium', 'low')),
  confidence_score FLOAT NOT NULL, -- 0.0-1.0
  skills_overlap_pct INT NOT NULL, -- 0-100
  gap_analysis TEXT, -- description of missing skills/experience
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE, -- user-created vs AI-suggested
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_role_paths_employee ON role_paths(employee_id);

-- ============================================================
-- RESUME TABLES
-- ============================================================

-- Generated resumes (one per role path)
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID NOT NULL REFERENCES role_paths(id) ON DELETE CASCADE,
  tone resume_tone NOT NULL DEFAULT 'professional',
  -- Content
  summary_statement TEXT,
  skills_section JSONB, -- ordered array of skill strings
  experience_section JSONB, -- array of {company, title, dates, bullets[]}
  keywords JSONB, -- array of ATS keyword strings
  full_content JSONB, -- complete resume structure for rendering
  -- Scores
  ats_score INT, -- 0-100
  clarity_score INT, -- 0-100
  specificity_score INT, -- 0-100
  score_feedback JSONB, -- {missing_metrics: [], weak_bullets: [], suggestions: []}
  -- File references
  pdf_url TEXT, -- Supabase Storage path
  docx_url TEXT,
  -- State
  is_current BOOLEAN NOT NULL DEFAULT TRUE, -- latest version for this path
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, role_path_id, version)
);
CREATE INDEX idx_resumes_employee ON resumes(employee_id);
CREATE INDEX idx_resumes_path ON resumes(role_path_id);

-- LinkedIn content (one per employee, tied to primary path)
CREATE TABLE linkedin_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  headline TEXT,
  about_section TEXT,
  experience_bullets JSONB, -- array of {role, bullets[]}
  featured_suggestions JSONB, -- array of strings
  skill_recommendations JSONB, -- array of strings
  open_to_work_guidance TEXT,
  recruiter_tips TEXT,
  is_marked_updated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOB MATCHING TABLES
-- ============================================================

-- Job listings (cached from external provider)
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE, -- ID from the job data provider
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  location TEXT,
  is_remote BOOLEAN NOT NULL DEFAULT FALSE,
  is_hybrid BOOLEAN NOT NULL DEFAULT FALSE,
  description_summary TEXT, -- AI-condensed
  description_full TEXT, -- raw from provider
  salary_min INT,
  salary_max INT,
  requirements JSONB, -- array of requirement strings
  posted_at TIMESTAMPTZ,
  source_url TEXT, -- link to apply
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_listings_external ON job_listings(external_id);
CREATE INDEX idx_job_listings_active ON job_listings(is_active);

-- Job matches (scored per employee)
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  job_listing_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  role_path_id UUID REFERENCES role_paths(id), -- which path this match is for
  fit fit_score NOT NULL,
  match_explanation TEXT NOT NULL,
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
  recommended_action job_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, job_listing_id)
);
CREATE INDEX idx_job_matches_employee ON job_matches(employee_id);
CREATE INDEX idx_job_matches_fit ON job_matches(fit);

-- Application kit (generated per job match)
CREATE TABLE application_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_match_id UUID UNIQUE NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  intro_paragraph TEXT,
  recruiter_message TEXT,
  hiring_manager_message TEXT,
  referral_request TEXT,
  resume_edits JSONB, -- array of suggested edit objects
  interview_themes JSONB, -- array of likely question strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application tracking
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  job_match_id UUID REFERENCES job_matches(id),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status application_status NOT NULL DEFAULT 'saved',
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_applications_employee ON applications(employee_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- OUTREACH TABLES
-- ============================================================

CREATE TABLE outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  recipient recipient_type NOT NULL,
  role_path_id UUID REFERENCES role_paths(id),
  job_match_id UUID REFERENCES job_matches(id),
  relationship relationship_strength NOT NULL DEFAULT 'cold',
  personal_context TEXT,
  tone outreach_tone NOT NULL DEFAULT 'warm',
  -- Generated content
  linkedin_message TEXT,
  email_message TEXT,
  followup_message TEXT,
  guidance JSONB, -- {when_to_use, follow_up_timing, what_not_to_say}
  -- Tracking
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outreach_employee ON outreach_messages(employee_id);

-- ============================================================
-- INTERVIEW TABLES
-- ============================================================

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  role_path_id UUID REFERENCES role_paths(id),
  job_match_id UUID REFERENCES job_matches(id), -- if company-specific
  format interview_format NOT NULL DEFAULT 'behavioral',
  difficulty interview_difficulty NOT NULL DEFAULT 'standard',
  duration_minutes INT NOT NULL DEFAULT 15,
  -- Session data
  elevenlabs_session_id TEXT, -- ElevenLabs conversation ID
  transcript TEXT, -- full text transcript
  audio_url TEXT, -- Supabase Storage path if stored
  -- Feedback (from ANALYZE_INTERVIEW prompt)
  overall_score INT, -- 0-100
  clarity_score INT,
  specificity_score INT,
  confidence_score INT,
  filler_word_count INT,
  answer_analyses JSONB, -- array of per-question assessments
  strongest_stories JSONB, -- array of highlighted anecdotes
  weak_answers JSONB, -- array of {question, answer, suggested_rewrite}
  next_recommendation TEXT,
  -- State
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  feedback_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interview_sessions_employee ON interview_sessions(employee_id);

-- ============================================================
-- PROGRESS AND PLANNING TABLES
-- ============================================================

-- Weekly plans
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  week_number INT NOT NULL, -- week 1, 2, 3... of their transition
  week_start DATE NOT NULL,
  items JSONB NOT NULL, -- array of {description, category, priority, estimated_minutes, is_completed, is_deferred}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_number)
);
CREATE INDEX idx_weekly_plans_employee ON weekly_plans(employee_id);

-- Confidence check-ins (weekly self-report)
CREATE TABLE confidence_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  week_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_number)
);
CREATE INDEX idx_confidence_employee ON confidence_checkins(employee_id);

-- Activity log (for progress tracking and employer analytics)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'resume_completed', 'job_applied', 'outreach_sent', 'interview_practiced', 'linkedin_updated', etc.
  metadata JSONB, -- additional context for the action
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_log_employee ON activity_log(employee_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- ============================================================
-- TRANSITION PLAN TABLE
-- ============================================================

CREATE TABLE transition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  search_strategy TEXT,
  readiness_score INT, -- 0-100
  readiness_breakdown JSONB, -- {resume: 0-100, linkedin: 0-100, jobs: 0-100, outreach: 0-100, interviews: 0-100}
  first_week_plan JSONB, -- array of daily items
  suggested_timeline JSONB, -- array of milestone objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OUTCOME REPORTING TABLES
-- ============================================================

-- Self-reported outcomes (opt-in from employees)
CREATE TABLE outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  has_landed BOOLEAN NOT NULL DEFAULT FALSE,
  new_role_title TEXT,
  new_company TEXT,
  time_to_first_interview_days INT,
  time_to_placement_days INT,
  satisfaction_score INT CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  confidence_improvement INT, -- self-reported, 1-5 scale
  would_recommend BOOLEAN,
  feedback_text TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outcome_reports_employee ON outcome_reports(employee_id);

-- ============================================================
-- PROMPT REGISTRY TABLE
-- ============================================================

CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT UNIQUE NOT NULL, -- e.g. 'EXTRACT_STRUCTURAL', 'GENERATE_RESUME'
  version INT NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL, -- contains {{variable}} placeholders
  output_format TEXT, -- JSON schema description for structured outputs
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INT NOT NULL DEFAULT 4096,
  temperature FLOAT NOT NULL DEFAULT 0.3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT, -- internal notes about this prompt version
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);
CREATE INDEX idx_prompt_registry_active ON prompt_registry(prompt_id, is_active);

-- ============================================================
-- BILLING TABLE (lightweight, for seat tracking)
-- ============================================================

CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES transition_programs(id),
  seats_purchased INT NOT NULL,
  price_per_seat INT NOT NULL, -- in cents
  total_amount INT NOT NULL, -- in cents
  payment_method TEXT, -- 'stripe', 'invoice'
  stripe_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_billing_company ON billing_records(company_id);

-- ============================================================
-- DAY ZERO EMAIL TRACKING
-- ============================================================

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  template_type email_template_type NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_sends_seat ON email_sends(seat_id);
CREATE INDEX idx_email_sends_template ON email_sends(template_type);
```

### Row-Level Security Policies

```sql
-- Employees can only access their own profile and related data
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_own_data ON employee_profiles
  FOR ALL USING (auth.uid() = auth_user_id);

-- Employer admins can access data for their company
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY employer_seats ON seats
  FOR ALL USING (
    program_id IN (
      SELECT tp.id FROM transition_programs tp
      JOIN companies c ON tp.company_id = c.id
      JOIN employer_admins ea ON ea.company_id = c.id
      WHERE ea.auth_user_id = auth.uid()
    )
  );

-- Employer dashboard: aggregated access only (no individual employee data)
-- This is enforced at the API layer, not RLS — the employer endpoints
-- only return aggregated metrics, never individual employee records.

-- All employee-owned tables follow the same pattern:
-- FOR ALL USING (employee_id IN (SELECT id FROM employee_profiles WHERE auth_user_id = auth.uid()))
-- Applied to: career_snapshots, work_history, skills, achievements, industries,
-- tools_technologies, role_paths, resumes, linkedin_content, job_matches,
-- application_kits, applications, outreach_messages, interview_sessions,
-- weekly_plans, confidence_checkins, activity_log, transition_plans, outcome_reports
```

---

## 9. API Design

### Shared Patterns

**Base URL:** `/api/v1`

**Auth:** All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The JWT contains the user's `auth_user_id` and role (`employee` or `employer_admin`).

**Error format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {} // optional, field-level errors
  }
}
```

**Standard error codes:**
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `SEAT_EXPIRED` (403) — employee's access window has ended
- `SEATS_EXHAUSTED` (400) — employer has no remaining seats
- `AI_ERROR` (502) — AI provider returned an error
- `AI_TIMEOUT` (504) — AI call exceeded timeout

**Pagination:** List endpoints accept `?page=1&per_page=20` and return:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

### Employee Endpoints

#### Onboarding

**POST `/api/v1/employee/activate`**
Auth: Public (but requires valid seat token from invitation email)
Request:
```json
{
  "seat_token": "string", // JWT token from invitation email
  "email": "string",
  "password": "string" // or google_oauth_token
}
```
Response (201):
```json
{
  "employee_id": "uuid",
  "seat_id": "uuid",
  "program_name": "string",
  "company_name": "string",
  "access_expires_at": "iso8601",
  "auth_token": "string"
}
```
Errors: `INVALID_TOKEN`, `SEAT_EXPIRED`, `EMAIL_MISMATCH`

**POST `/api/v1/employee/profile`**
Auth: Employee
Request:
```json
{
  "seniority": "senior", // seniority_level enum
  "management_exp": "4_to_10", // management_experience enum
  "level_dir": "stay_current", // level_direction enum
  "location_city": "San Francisco",
  "location_state": "CA",
  "work_pref": "remote",
  "comp_target_min": 120000,
  "comp_target_max": 160000,
  "work_auth": "us_citizen",
  "years_of_experience": 8,
  "most_recent_role": "Customer Success Manager",
  "most_recent_company": "Acme SaaS"
}
```
Response (200):
```json
{
  "employee_id": "uuid",
  "profile_complete": true
}
```

**POST `/api/v1/employee/resume/upload`**
Auth: Employee
Request: Multipart form data with file (PDF or DOCX, max 10MB)
Response (200):
```json
{
  "upload_url": "string", // Supabase Storage URL
  "file_type": "pdf",
  "file_size_bytes": 245000
}
```
Errors: `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`

#### Career Snapshot

**POST `/api/v1/employee/snapshot/extract`**
Auth: Employee
Request:
```json
{
  "source": "resume_upload" // or "linkedin_import"
}
```
Response (200): — this triggers the 3-pass AI extraction pipeline
```json
{
  "snapshot_id": "uuid",
  "career_narrative": "string",
  "work_history": [
    {
      "id": "uuid",
      "company": "Acme SaaS",
      "title": "Customer Success Manager",
      "start_date": "2021-03",
      "end_date": "2025-01",
      "duration_months": 46,
      "is_management_role": false
    }
  ],
  "skills": [
    {"id": "uuid", "name": "Salesforce", "category": "technical", "confidence": 0.95}
  ],
  "achievements": [
    {
      "id": "uuid",
      "statement": "Grew portfolio retention from 82% to 94% over 18 months",
      "impact": "revenue",
      "has_metric": true,
      "source_text": "Improved client retention rate by 12 percentage points..."
    }
  ],
  "industries": [
    {"id": "uuid", "name": "B2B SaaS", "confidence": 0.92}
  ],
  "tools": [
    {"id": "uuid", "name": "Salesforce", "category": "crm", "confidence": 0.98}
  ]
}
```
Errors: `NO_RESUME_UPLOADED`, `EXTRACTION_FAILED`, `AI_ERROR`

**PATCH `/api/v1/employee/snapshot`**
Auth: Employee
Request: Partial update — any field from the snapshot can be modified
```json
{
  "skills_add": [{"name": "Gainsight", "category": "technical"}],
  "skills_remove": ["uuid"],
  "achievements_update": [{"id": "uuid", "statement": "Updated statement"}],
  "work_history_update": [{"id": "uuid", "title": "Senior CSM"}],
  "career_narrative": "Updated narrative text"
}
```
Response (200): Updated snapshot object
Errors: `SNAPSHOT_NOT_FOUND`

**POST `/api/v1/employee/snapshot/confirm`**
Auth: Employee
Response (200):
```json
{
  "snapshot_confirmed": true
}
```

#### Role Targeting

**POST `/api/v1/employee/paths/generate`**
Auth: Employee
Response (200):
```json
{
  "paths": [
    {
      "id": "uuid",
      "title": "Customer Success Manager at B2B SaaS",
      "category": "customer_success",
      "why_it_fits": "Direct continuation of your 4-year CSM career...",
      "salary_band_min": 110000,
      "salary_band_max": 145000,
      "demand_level": "high",
      "confidence_score": 0.88,
      "skills_overlap_pct": 85,
      "gap_analysis": "Consider adding Gainsight certification..."
    }
  ]
}
```
Errors: `SNAPSHOT_NOT_CONFIRMED`, `AI_ERROR`

**POST `/api/v1/employee/paths/regenerate`**
Auth: Employee
Request:
```json
{
  "rejected_path_ids": ["uuid", "uuid"],
  "feedback": "I want something more technical"
}
```
Response: Same shape as generate

**POST `/api/v1/employee/paths/select`**
Auth: Employee
Request:
```json
{
  "primary_path_id": "uuid",
  "secondary_path_ids": ["uuid"]
}
```
Response (200):
```json
{
  "paths_selected": true,
  "selected_count": 2
}
```

**POST `/api/v1/employee/paths/custom`**
Auth: Employee
Request:
```json
{
  "title": "DevOps Engineer"
}
```
Response (200): Same RolePath shape, generated by AI

#### Transition Plan

**POST `/api/v1/employee/plan/generate`**
Auth: Employee
Response (200):
```json
{
  "plan_id": "uuid",
  "search_strategy": "Focus 70% on Path A...",
  "readiness_score": 42,
  "readiness_breakdown": {
    "resume": 0,
    "linkedin": 0,
    "jobs": 0,
    "outreach": 0,
    "interviews": 0
  },
  "first_week_plan": [
    {"day": 1, "tasks": ["Build tailored resumes for both paths"]},
    {"day": 2, "tasks": ["Update LinkedIn profile"]}
  ],
  "suggested_timeline": [
    {"week": 1, "milestone": "Materials complete"},
    {"week": 3, "milestone": "First interviews"}
  ]
}
```

#### Resume

**POST `/api/v1/employee/resume/generate`**
Auth: Employee
Request:
```json
{
  "role_path_id": "uuid",
  "tone": "professional"
}
```
Response (200):
```json
{
  "resume_id": "uuid",
  "role_path_id": "uuid",
  "summary_statement": "string",
  "skills_section": ["skill1", "skill2"],
  "experience_section": [
    {
      "company": "Acme SaaS",
      "title": "Customer Success Manager",
      "dates": "2021 - 2025",
      "bullets": ["Grew portfolio retention...", "Led onboarding..."]
    }
  ],
  "keywords": ["customer success", "SaaS", "retention"],
  "scores": {
    "ats": 78,
    "clarity": 85,
    "specificity": 72,
    "feedback": {
      "missing_metrics": ["Second bullet in Acme role lacks a number"],
      "weak_bullets": [{"index": 3, "suggestion": "Rewrite to lead with impact"}],
      "suggestions": ["Add Gainsight to skills section"]
    }
  }
}
```

**POST `/api/v1/employee/resume/:id/regenerate`**
Auth: Employee
Request:
```json
{
  "tone": "confident"
}
```
Response: Same shape, new version

**POST `/api/v1/employee/resume/:id/download`**
Auth: Employee
Request:
```json
{
  "format": "pdf" // or "docx"
}
```
Response (200):
```json
{
  "download_url": "string", // presigned Supabase Storage URL, valid 1 hour
  "format": "pdf",
  "file_size_bytes": 145000
}
```

#### LinkedIn

**POST `/api/v1/employee/linkedin/generate`**
Auth: Employee
Response (200):
```json
{
  "headline": "string",
  "about_section": "string",
  "experience_bullets": [{"role": "CSM at Acme", "bullets": ["...", "..."]}],
  "featured_suggestions": ["string"],
  "skill_recommendations": ["string"],
  "open_to_work_guidance": "string",
  "recruiter_tips": "string"
}
```

**POST `/api/v1/employee/linkedin/mark-updated`**
Auth: Employee
Response (200):
```json
{
  "marked": true
}
```

#### Jobs

**GET `/api/v1/employee/jobs`**
Auth: Employee
Query params: `?path_id=uuid&fit=high_fit&page=1&per_page=20`
Response (200): Paginated array of job match objects

**GET `/api/v1/employee/jobs/:match_id`**
Auth: Employee
Response (200): Full job detail + application kit

**POST `/api/v1/employee/jobs/:match_id/kit`**
Auth: Employee
Triggers application kit generation if not already generated.
Response (200): ApplicationKit object

**POST `/api/v1/employee/jobs/:match_id/track`**
Auth: Employee
Request:
```json
{
  "status": "applied"
}
```
Response (200): Application object

#### Outreach

**POST `/api/v1/employee/outreach/generate`**
Auth: Employee
Request:
```json
{
  "recipient": "hiring_manager",
  "role_path_id": "uuid",
  "job_match_id": "uuid",
  "relationship": "cold",
  "personal_context": "We met at SaaStr 2024",
  "tone": "warm"
}
```
Response (200):
```json
{
  "outreach_id": "uuid",
  "linkedin_message": "string (< 300 chars)",
  "email_message": "string",
  "followup_message": "string",
  "guidance": {
    "when_to_use": "Send within 24 hours of applying",
    "follow_up_timing": "If no response, follow up in 5-7 business days",
    "what_not_to_say": "Don't mention being laid off in the first message"
  }
}
```

**POST `/api/v1/employee/outreach/:id/mark-sent`**
Auth: Employee
Response (200):
```json
{
  "marked": true,
  "sent_at": "iso8601"
}
```

#### Interviews

**GET `/api/v1/employee/interviews/prep`**
Auth: Employee
Query params: `?path_id=uuid&job_match_id=uuid` (optional, for company-specific prep)
Response (200):
```json
{
  "common_questions": ["string"],
  "behavioral_questions": ["string"],
  "company_specific": ["string"],
  "strengths_to_emphasize": ["string"],
  "weak_spots": ["string"],
  "compensation_prep": "string"
}
```

**POST `/api/v1/employee/interviews/session/start`**
Auth: Employee
Request:
```json
{
  "role_path_id": "uuid",
  "job_match_id": null,
  "format": "behavioral",
  "difficulty": "standard",
  "duration_minutes": 15
}
```
Response (200):
```json
{
  "session_id": "uuid",
  "elevenlabs_config": {
    "agent_id": "string",
    "conversation_id": "string",
    "signed_url": "string" // for WebSocket connection
  }
}
```
This endpoint creates the ElevenLabs conversation agent with the appropriate persona prompt and returns connection details for the client to establish a WebSocket voice session.

**POST `/api/v1/employee/interviews/session/:id/complete`**
Auth: Employee
Request:
```json
{
  "transcript": "string" // full conversation transcript from ElevenLabs
}
```
Response (200): — triggers the ANALYZE_INTERVIEW prompt
```json
{
  "session_id": "uuid",
  "feedback": {
    "overall_score": 72,
    "clarity_score": 68,
    "specificity_score": 75,
    "confidence_score": 70,
    "filler_word_count": 14,
    "answer_analyses": [
      {
        "question": "Tell me about a time you handled a difficult customer",
        "quality": "strong",
        "notes": "Good use of specific example with metrics"
      }
    ],
    "strongest_stories": ["Portfolio retention story", "Cross-functional migration project"],
    "weak_answers": [
      {
        "question": "How do you handle competing priorities?",
        "answer_summary": "Generic response about time management",
        "suggested_rewrite": "Consider using the specific example from your Acme role..."
      }
    ],
    "next_recommendation": "Practice technical scenario questions next"
  }
}
```

#### Progress

**GET `/api/v1/employee/progress`**
Auth: Employee
Response (200):
```json
{
  "resumes_completed": 2,
  "linkedin_updated": true,
  "applications_tracked": 7,
  "outreach_sent": 4,
  "interviews_practiced": 3,
  "interviews_landed": 1,
  "current_streak_days": 12,
  "weekly_activity": [
    {"week": 1, "actions": 23},
    {"week": 2, "actions": 18}
  ],
  "milestones": [
    {"name": "Resumes complete", "achieved": true, "achieved_at": "iso8601"},
    {"name": "First application", "achieved": true, "achieved_at": "iso8601"},
    {"name": "First interview", "achieved": false, "achieved_at": null}
  ],
  "confidence_history": [
    {"week": 1, "score": 2},
    {"week": 2, "score": 3}
  ]
}
```

**POST `/api/v1/employee/progress/confidence`**
Auth: Employee
Request:
```json
{
  "score": 4 // 1-5
}
```

**GET `/api/v1/employee/plan/weekly`**
Auth: Employee
Response (200): Current week's plan

**POST `/api/v1/employee/plan/weekly/generate`**
Auth: Employee
Response (200): Newly generated WeeklyPlan

**PATCH `/api/v1/employee/plan/weekly/:id/items`**
Auth: Employee
Request:
```json
{
  "item_index": 2,
  "is_completed": true
}
```

#### Outcomes

**POST `/api/v1/employee/outcome`**
Auth: Employee
Request:
```json
{
  "has_landed": true,
  "new_role_title": "Senior CSM",
  "new_company": "NewCo",
  "time_to_first_interview_days": 18,
  "time_to_placement_days": 47,
  "satisfaction_score": 5,
  "confidence_improvement": 4,
  "would_recommend": true,
  "feedback_text": "This was incredibly helpful during a tough time."
}
```

### Employer Endpoints

**POST `/api/v1/employer/company`**
Auth: Employer admin
Request:
```json
{
  "name": "Acme Corp",
  "logo": "base64_or_url",
  "brand_color": "#2563EB",
  "support_email": "hr@acme.com",
  "welcome_message": "We value your contributions...",
  "default_program_duration_days": 90
}
```

**POST `/api/v1/employer/program`**
Auth: Employer admin
Request:
```json
{
  "name": "Q1 2026 Restructuring",
  "tier": "standard",
  "total_seats": 90,
  "access_duration_days": 90,
  "is_branded": true,
  "custom_intro_message": "string",
  "interview_coaching_enabled": true,
  "outreach_builder_enabled": true
}
```

**POST `/api/v1/employer/invite`**
Auth: Employer admin
Request:
```json
{
  "program_id": "uuid",
  "employees": [
    {
      "name": "Maya Chen",
      "email": "maya@acme.com",
      "department": "Customer Success",
      "role_family": "CSM",
      "last_day": "2026-03-30"
    }
  ]
}
```
Response (200):
```json
{
  "invited": 90,
  "skipped_duplicates": 0,
  "skipped_invalid": 0,
  "errors": []
}
```

**POST `/api/v1/employer/invite/csv`**
Auth: Employer admin
Request: Multipart form data with CSV file
Response: Same shape as above

**GET `/api/v1/employer/invite/template`**
Auth: Employer admin
Response: CSV file download

**POST `/api/v1/employer/reengage`**
Auth: Employer admin
Request:
```json
{
  "program_id": "uuid",
  "inactive_days_threshold": 7
}
```
Response (200):
```json
{
  "emails_sent": 12
}
```

**GET `/api/v1/employer/dashboard`**
Auth: Employer admin
Response (200):
```json
{
  "seats_purchased": 90,
  "seats_activated": 71,
  "onboarding_completion_rate": 0.915,
  "resume_completion_rate": 0.817,
  "interview_practice_rate": 0.479,
  "weekly_active_rate": 0.732,
  "avg_satisfaction_score": 4.2,
  "activations_by_day": [{"date": "2026-03-01", "count": 12}],
  "engagement_by_module": [
    {"module": "resume", "usage_count": 142},
    {"module": "jobs", "usage_count": 98}
  ],
  "inactive_count": 8,
  "activity_heatmap": {"monday": 45, "tuesday": 52}
}
```

**GET `/api/v1/employer/outcomes`**
Auth: Employer admin
Response (200):
```json
{
  "total_engaged": 65,
  "pct_engaged": 0.85,
  "pct_interview_ready": 0.62,
  "avg_time_to_first_interview_days": 18,
  "avg_confidence_lift": 2.1,
  "opt_in_placement_rate": 0.34,
  "opt_in_count": 24,
  "avg_time_to_placement_days": 47,
  "avg_satisfaction": 4.3,
  "note": "Based on 24 self-reports. Encourage employees to share outcomes."
}
```

**GET `/api/v1/employer/outcomes/export`**
Auth: Employer admin
Query params: `?format=pdf` or `?format=csv`
Response: File download (PDF summary report or CSV data export)

---

## 10. Document Generation System

### Overview

Waypointer generates downloadable documents in two formats: PDF and DOCX. These are primarily resumes but also include employer summary reports. Documents are generated server-side using Node.js libraries, stored in Supabase Storage, and served to the client via presigned URLs.

### Resume Generation Pipeline

```
ResumeContent (from AI) → Template Selection → Render to Format → Upload to Storage → Return URL
```

**PDF generation:** Uses `@react-pdf/renderer` on the server. A React component defines the resume layout (margins, typography, sections) and receives the `ResumeContent` JSON as props. The component renders to a PDF buffer, which is uploaded to Supabase Storage.

**DOCX generation:** Uses the `docx` npm package. A builder function takes the `ResumeContent` JSON and constructs a DOCX document with proper heading styles, bullet formatting, and section breaks.

### Resume Template

Both PDF and DOCX outputs follow the same layout:

**Page setup:** US Letter (8.5" x 11"), 0.75" margins all sides.

**Sections in order:**
1. Name and contact info (centered, name in 18pt bold, email/location/phone in 10pt)
2. Summary (2–3 sentences, paragraph format)
3. Key Skills (comma-separated inline list, not bullets)
4. Experience (reverse chronological: Company — Title — Dates, with 3–5 bullet points per role)
5. Education (if present in career snapshot)
6. Certifications (if present)

**Typography (PDF):**
- Name: Inter Bold 18pt
- Section headers: Inter SemiBold 12pt, uppercase
- Body: Inter Regular 10pt
- Spacing: 6pt between bullets, 12pt between sections

**Typography (DOCX):**
- Uses equivalent Word styles (Heading 1 for name, Heading 2 for sections, Normal for body)
- Ensures compatibility with ATS parsers by using standard Word formatting, no tables, no text boxes, no headers/footers for content

### Employer Report Generation

The PDF summary report (exported from Screen E5) uses `@react-pdf/renderer` with a report template:

**Page 1: Cover**
- Company logo, report title ("Transition Support Summary"), date range, generated by Waypointer

**Page 2: Key Metrics**
- Activation rate, engagement rate, interview readiness, satisfaction
- Simple bar charts rendered as SVG within the PDF

**Page 3: Outcome Data**
- Placement rate (opt-in), time to interview, time to placement, confidence improvement
- Note about sample size

**Page 4: Module Usage**
- Breakdown by module (resume, jobs, outreach, interviews)
- Most active periods

### File Storage

All generated files are stored in Supabase Storage:

**Bucket structure:**
```
waypointer-files/
  uploads/
    {employee_id}/
      resume-original.pdf
  generated/
    {employee_id}/
      resume-{path_id}-v{version}.pdf
      resume-{path_id}-v{version}.docx
  reports/
    {company_id}/
      summary-{date}.pdf
      usage-{date}.csv
```

**Access control:** Files are private by default. Access is granted via presigned URLs with a 1-hour expiry. The API endpoint generates the presigned URL only after verifying the requesting user owns the file (employee) or the company (employer admin).

---

## 11. Design System

### Design Philosophy

The product should feel calm, respectful, practical, and confidence-restoring. Users are in a vulnerable moment — they've just lost their job. The design must never feel gimmicky, overly cheerful, or robotic. It should feel like a capable, steady ally. Think: the visual equivalent of a knowledgeable friend who's handled this before and knows exactly what to do next.

### Color Palette

**Primary:**
- Waypointer Blue: `#2563EB` — primary actions, CTAs, active states
- Waypointer Blue Light: `#DBEAFE` — selected states, soft highlights
- Waypointer Blue Dark: `#1D4ED8` — hover states on primary actions

**Neutral:**
- Background: `#FAFAFA` — page background
- Surface: `#FFFFFF` — cards, panels, modals
- Border: `#E5E7EB` — dividers, card borders
- Muted: `#9CA3AF` — secondary text, placeholders
- Text Primary: `#111827` — headings, body text
- Text Secondary: `#6B7280` — descriptions, metadata

**Semantic:**
- Success: `#059669` — completed states, high-fit scores, positive feedback
- Warning: `#D97706` — stretch scores, attention needed
- Danger: `#DC2626` — errors, low-fit scores, destructive actions
- Info: `#2563EB` — informational callouts (same as primary)

**Employer brand:**
- The employer's `brand_color` replaces `#2563EB` in the employee experience when `is_branded` is true. All other colors remain constant to ensure readability and accessibility.

### Typography

**Typefaces:**
- Headings: Inter SemiBold
- Body: Inter Regular
- Monospace (scores, metrics): JetBrains Mono

**Scale:**
- Display (welcome screen headline): 36px / 44px line height / SemiBold
- H1 (page titles): 24px / 32px / SemiBold
- H2 (section titles): 18px / 28px / SemiBold
- H3 (card titles, subsections): 16px / 24px / SemiBold
- Body: 15px / 24px / Regular
- Body Small: 13px / 20px / Regular
- Caption: 12px / 16px / Regular
- Metric Display: 32px / 40px / JetBrains Mono Medium (for dashboard numbers)

### Spacing System

**Base unit:** 4px

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Between related elements |
| `space-3` | 12px | Between form fields |
| `space-4` | 16px | Card padding, section gaps |
| `space-5` | 20px | Between sections |
| `space-6` | 24px | Major section breaks |
| `space-8` | 32px | Page section padding |
| `space-10` | 40px | Top-level layout gaps |
| `space-12` | 48px | Page margins |

### Border Radius

- Small (buttons, inputs, tags): 6px
- Medium (cards, panels): 8px
- Large (modals, popovers): 12px
- Full (avatars, badges): 9999px

### Shadows

- `shadow-sm`: `0 1px 2px rgba(0, 0, 0, 0.05)` — cards at rest
- `shadow-md`: `0 4px 6px rgba(0, 0, 0, 0.07)` — cards on hover, dropdowns
- `shadow-lg`: `0 10px 15px rgba(0, 0, 0, 0.1)` — modals, popovers

### Key Components

**Primary Button:** Background `#2563EB`, white text, 6px radius, 40px height, 16px horizontal padding. Hover: `#1D4ED8`. Disabled: `#9CA3AF` background, no pointer. Always full-width on mobile, auto-width on desktop.

**Secondary Button:** White background, `#2563EB` text, 1px `#E5E7EB` border, same dimensions. Hover: `#DBEAFE` background.

**Card:** White background, 1px `#E5E7EB` border, 8px radius, `shadow-sm`, 16px padding. Hover state (for clickable cards): `shadow-md`, border transitions to `#2563EB`. Used for: role path cards, job cards, outreach message previews.

**Score Badge:** Rounded pill with color-coded background. High Fit: `#059669` bg / white text. Stretch: `#D97706` bg / white text. Low Fit: `#DC2626` bg / white text. 12px font, 4px vertical / 8px horizontal padding.

**Skill Chip:** `#DBEAFE` background, `#2563EB` text, 9999px radius, 12px font, 4px/8px padding. Removable chips show an × icon on hover.

**Progress Bar:** 4px height, `#E5E7EB` background track, `#2563EB` fill. Animated fill on value change (200ms ease-out).

**Input Fields:** White background, 1px `#E5E7EB` border, 6px radius, 40px height, 12px horizontal padding. Focus: 2px `#2563EB` border (not outline). Error: 1px `#DC2626` border + error text below in 12px `#DC2626`.

**Sidebar Navigation:** 240px width, white background, `#FAFAFA` hover on nav items. Active item: `#DBEAFE` background, `#2563EB` text, 2px left border `#2563EB`. Collapsed to icon-only on mobile.

### Interaction Principles

**Loading states:** Skeleton screens for content areas (not spinners). Skeletons use `#E5E7EB` with a subtle shimmer animation. For AI generation specifically: show a contextual message ("Building your tailored resume..." or "Analyzing your background...") above the skeleton to set expectations.

**Empty states:** Every list/feed has a specific empty state with an illustration and a clear CTA. Example for empty job feed: "No matches yet. Complete your role targeting to see recommended jobs." + CTA to role targeting.

**Error states:** Inline error messages below the relevant field or section. Never a full-page error for recoverable issues. Toast notifications (top-right, auto-dismiss 5s) for background operation errors.

**Transitions:** 200ms ease-out for all hover effects, color changes, and layout shifts. Page transitions: fade-in (150ms). No animations that delay the user from taking an action.

**Responsive breakpoints:**
- Mobile: < 768px (single column, collapsed sidebar)
- Tablet: 768px–1024px (condensed sidebar, adjusted grid)
- Desktop: > 1024px (full sidebar, multi-column layouts)

### Emotional Design Notes

**Welcome screen:** The largest, most spacious layout in the product. Extra whitespace, large headline, minimal UI. This screen exists to calm, not to impress.

**Career Snapshot Review:** Compact, information-dense, but with clear visual hierarchy. The editing affordance should be obvious — users need to feel in control of their data.

**Job Feed:** Tight card layout similar to email clients. Scannable, dense enough to feel productive, but not cluttered. The "why it matches" text is the most important element on each card.

**Interview Feedback:** Generous spacing, clear sections. Use success green for strengths and neutral (not red) for areas to improve. The tone is coaching, not grading.

**Progress Tracker:** The most visually rewarding screen. Use the streak counter and milestone timeline to create a sense of forward motion. Celebrate completions with subtle micro-animations (checkmark bounce, progress bar fill).

---

## 12. Revenue Model

### Pricing Tiers

**Option A: Per-Seat (launch default)**

| Tier | Price | Includes |
|------|-------|----------|
| Standard | $149/employee | 90 days full platform access, all modules, employer dashboard with engagement + outcome reporting |
| Plus | $249/employee | Everything in Standard + 1:1 human kickoff session (30 min video call with a career advisor) |
| Premium | Custom | For large companies (500+ seats). Custom reporting, dedicated account manager, extended duration, white-glove setup. Quoted individually. |

**Option B: Platform + Activation (target for Year 1 renewals)**

| Component | Price |
|-----------|-------|
| Annual platform fee | $6,000–$15,000/year (based on company size) |
| Per-activation fee | $99–$149/employee |

Option B is the target pricing model for annual contracts. It creates "default offboarding vendor" behavior — the company pays the platform fee to have Waypointer in place, then pays per-activation only when layoffs or restructurings occur. This smooths revenue and reduces the need to sell reactively during crisis moments.

**Migration path:** Companies start on Option A (per-seat, credit card, instant deployment). At renewal, present Option B as a cost-saving alternative for companies that expect to use the platform annually.

### Billing Mechanics

**Option A:**
- Payment: Credit card via Stripe. Invoice available for 50+ seats.
- Deployment: Instant. Employer can invite employees immediately after payment.
- No subscription — single purchase per program.

**Option B:**
- Platform fee: Annual, billed at contract signing.
- Activation fee: Billed monthly in arrears based on seats activated.
- Payment: Invoice (NET 30).

### What's Gated

All launched features are available in Standard. There is no free tier. There is no freemium. The product is employer-paid.

The only gating between Standard and Plus is the human kickoff session. This is a deliberate choice: the AI platform should stand on its own at $149. The human session is an add-on for companies that want a higher-touch feel, not a crutch for a product that doesn't work without it.

### Unit Economics

**Target CAC:** $800–$1,200 per employer account (acquired via outbound sales + community marketing).

**Target LTV:**
- First purchase: mid-size company (100 employees), 5 seats at $149 = $745
- Annual re-purchase (Option B): $9,000 platform fee + 10 activations × $149 = $10,490
- Year 2+ LTV per account: $10,000–$15,000

**LTV:CAC ratio:** 10–15x if annual re-purchasing becomes the norm.

**AI cost per seat:** $0.80–$1.50 (see AI Architecture section)
**Infrastructure cost per seat:** ~$0.50 (Supabase, Vercel, storage, email)
**Total marginal cost per seat:** ~$2.00–$2.50
**Gross margin per seat at $149:** ~98%

The margin is extremely healthy. The business risk is not unit economics — it's customer acquisition velocity and sales cycle length.

### Revenue Projections (Directional)

| Period | Accounts | Avg seats/account | Revenue |
|--------|----------|-------------------|---------|
| Month 6 | 12 | 8 | $14,304 |
| Month 12 | 50 | 12 | $89,400 |
| Month 18 | 100 | 15 | $223,500 |
| Year 2 (with Option B) | 80 annual + 40 per-seat | mixed | $600K–$900K |
| Year 3 | 150+ accounts | mixed | $2M–$3M ARR |

These are rough and depend heavily on sales velocity. The per-seat model produces lumpy revenue tied to layoff events. Option B smooths this.

---

## 13. GTM Strategy

### Positioning

**Category:** Mass-market outplacement, rebuilt for the AI era.

**Lead message:** "Outplacement support for every employee, not just executives."

**Supporting message:** "Give departing employees immediate AI-powered transition support — from resumes and LinkedIn rewrites to targeted job search guidance and interview prep — at a price companies can actually roll out broadly."

**Words to use:** outplacement, transition support, career transition benefit, offboarding support, departing employees, dignified transition
**Words to avoid:** auto-apply, job board, bot, automation, AI agent (too robotic), career coaching (implies human-led), recruiting

### Target Customer (First 10 Accounts)

**Primary:** VP of People / Head of HR at mid-market tech companies (200–2,000 employees) that have conducted a layoff in the past 12 months or are planning a restructuring.

Why: the pain is fresh, the buyer understands software, budgets exist for severance support, and reputational stakes are high. These companies already know traditional outplacement is too expensive for broad use.

**Secondary:** Operating Partners at PE firms with 5+ portfolio companies. One relationship can unlock multiple deployments.

**Tertiary:** HR consultancies and boutique outplacement firms looking for a white-label technology layer.

### Launch Channels

**Channel 1: Post-layoff outbound (highest intent)**

Set up alerts for WARN Act filings (publicly available) and Layoffs.fyi. When a company announces a layoff, identify the VP of People or Head of HR via LinkedIn. Send a personalized outbound email within 48 hours referencing the announcement, the cost disparity between executive and non-executive outplacement, and an offer to deploy Waypointer for the affected employees. Timing is the advantage — no other vendor moves this fast because they require multi-week onboarding.

**Channel 2: HR community presence**

Join People Geek, Lattice's community, HR Open Source (HROS), and PeopleOps Society. Share the problem framing — "78% of laid-off employees receive no useful support, and HR leaders don't feel great about it" — not the product pitch. Contribute to discussions about offboarding practices, severance benchmarking, and employer brand. Let inbound develop from credibility.

**Channel 3: LinkedIn content**

Post 2–3x/week targeting the HR buyer. Content themes: the executive/IC outplacement disparity, what good offboarding looks like, employer brand impact of layoffs, benchmarks on transition support. The uncomfortable stat — "Your executives get $10,000 in outplacement. Your ICs get a goodbye email" — is the hook that drives the content strategy.

### Initial Motion

**Hybrid: self-serve purchase + founder-led sales.**

Self-serve: A company can buy seats with a credit card and deploy the same day. This is critical for reactive purchases — when HR is in crisis mode and needs something now.

Founder-led sales: For accounts with 50+ seats, the founder handles the sales conversation directly. The goal is to learn buying patterns, objections, and expansion triggers before formalizing a sales process.

### Landing Page

**Headline:** Outplacement support for every employee, not just executives.

**Subhead:** Give departing employees immediate AI-powered transition support — from resumes and LinkedIn rewrites to targeted job search guidance and interview prep — at a price companies can actually roll out broadly.

**Proof points:**
- Live in one day
- No integrations required
- 90-day guided transition support
- Employer dashboard included
- A fraction of traditional outplacement cost

**CTAs:**
- Primary: "Get started" (leads to self-serve purchase)
- Secondary: "Book a demo" (leads to founder calendar link)

---

## End of Masterplan

This document is the single source of truth for the Waypointer MVP. All design, engineering, and product decisions should reference this document. When this document conflicts with other sources, this document wins.
