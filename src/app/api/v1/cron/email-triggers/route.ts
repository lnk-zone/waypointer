/**
 * Automated Email Triggers — Vercel Cron Job endpoint.
 *
 * Processes three trigger types on each invocation:
 * 1. Re-engagement (72h) — nudge seats that were invited but never activated
 * 2. Weekly Nudge — keep active users engaged with job match updates
 * 3. 30-Day Check-in — milestone email ~30 days after activation
 *
 * Security: Requires CRON_SECRET bearer token (set by Vercel Cron).
 * Each trigger type runs independently — one failure does not block others.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTrackedEmail, hasRecentEmail } from "@/lib/email/send-tracked";
import type { EmailTemplateData } from "@/lib/email/templates";

// ─── Types ────────────────────────────────────────────────────────────

interface SeatRecord {
  id: string;
  employee_email: string;
  employee_name: string | null;
  status: string;
  program_id: string;
  created_at: string;
  activated_at: string | null;
}

interface CompanyRecord {
  id: string;
  name: string;
}

interface ProgramRecord {
  id: string;
  company_id: string;
}

interface TriggerCounters {
  sent: number;
  skipped: number;
  failed: number;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 100;
const REENGAGEMENT_HOURS = 72;
const WEEKLY_NUDGE_HOURS = 168; // 7 days
const THIRTY_DAY_CHECKIN_HOURS = 720; // 30 days

// ─── Helpers ──────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://getwaypointer.com";
}

function buildTemplateData(
  seat: SeatRecord,
  company: CompanyRecord,
  baseUrl: string,
  extra?: {
    jobMatchCount?: number;
    progressSummary?: string;
    daysSinceActivation?: number;
  }
): EmailTemplateData {
  return {
    recipientName: seat.employee_name ?? "there",
    companyName: company.name,
    companyLogoUrl: null,
    loginLink: `${baseUrl}/login`,
    unsubscribeLink: `${baseUrl}/unsubscribe?seat=${seat.id}`,
    ...extra,
  };
}

/**
 * Fetch the company record for a given program, using an in-memory cache
 * to avoid redundant DB queries within a single cron run.
 */
async function getCompanyForProgram(
  supabase: SupabaseClient,
  programId: string,
  programCache: Map<string, string>,
  companyCache: Map<string, CompanyRecord>
): Promise<CompanyRecord | null> {
  let companyId = programCache.get(programId);

  if (!companyId) {
    const { data: program } = await supabase
      .from("transition_programs")
      .select("id, company_id")
      .eq("id", programId)
      .single<ProgramRecord>();

    if (!program) return null;

    companyId = program.company_id;
    programCache.set(programId, companyId);
  }

  const cached = companyCache.get(companyId);
  if (cached) return cached;

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single<CompanyRecord>();

  if (!company) return null;

  companyCache.set(companyId, company);
  return company;
}

// ─── Trigger Processors ──────────────────────────────────────────────

async function processReengagement(
  supabase: SupabaseClient,
  results: Record<string, TriggerCounters>
): Promise<void> {
  const threshold = new Date(
    Date.now() - REENGAGEMENT_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: seats } = await supabase
    .from("seats")
    .select("id, employee_email, employee_name, status, program_id, created_at, activated_at")
    .eq("status", "invited")
    .lte("created_at", threshold)
    .limit(MAX_BATCH_SIZE);

  if (!seats || seats.length === 0) return;

  const baseUrl = getBaseUrl();
  const programCache = new Map<string, string>();
  const companyCache = new Map<string, CompanyRecord>();

  for (const seat of seats as SeatRecord[]) {
    try {
      const recentlySent = await hasRecentEmail(
        supabase,
        seat.id,
        "reengagement_72h",
        REENGAGEMENT_HOURS
      );

      if (recentlySent) {
        results.reengagement.skipped++;
        continue;
      }

      const company = await getCompanyForProgram(
        supabase,
        seat.program_id,
        programCache,
        companyCache
      );

      if (!company) {
        results.reengagement.failed++;
        continue;
      }

      const templateData = buildTemplateData(seat, company, baseUrl);

      const result = await sendTrackedEmail({
        supabase,
        seatId: seat.id,
        recipientEmail: seat.employee_email,
        templateType: "reengagement_72h",
        templateData,
        baseUrl,
      });

      if (result.success) {
        results.reengagement.sent++;
      } else {
        results.reengagement.failed++;
      }
    } catch {
      results.reengagement.failed++;
    }
  }
}

async function processWeeklyNudges(
  supabase: SupabaseClient,
  results: Record<string, TriggerCounters>
): Promise<void> {
  const { data: seats } = await supabase
    .from("seats")
    .select("id, employee_email, employee_name, status, program_id, created_at, activated_at")
    .in("status", ["activated", "active"])
    .limit(MAX_BATCH_SIZE);

  if (!seats || seats.length === 0) return;

  const baseUrl = getBaseUrl();
  const programCache = new Map<string, string>();
  const companyCache = new Map<string, CompanyRecord>();

  for (const seat of seats as SeatRecord[]) {
    try {
      const recentlySent = await hasRecentEmail(
        supabase,
        seat.id,
        "weekly_nudge",
        WEEKLY_NUDGE_HOURS
      );

      if (recentlySent) {
        results.weekly_nudge.skipped++;
        continue;
      }

      const company = await getCompanyForProgram(
        supabase,
        seat.program_id,
        programCache,
        companyCache
      );

      if (!company) {
        results.weekly_nudge.failed++;
        continue;
      }

      // Try to get job match count via employee profile — optional, graceful failure
      let jobMatchCount: number | undefined;
      try {
        const { data: empProfile } = await supabase
          .from("employee_profiles")
          .select("id")
          .eq("seat_id", seat.id)
          .single();

        if (empProfile) {
          const { count } = await supabase
            .from("job_matches")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", (empProfile as unknown as { id: string }).id);

          if (count !== null && count > 0) {
            jobMatchCount = count;
          }
        }
      } catch {
        // Tables may not exist or employee not yet profiled — proceed without count
      }

      const templateData = buildTemplateData(seat, company, baseUrl, {
        jobMatchCount,
      });

      const result = await sendTrackedEmail({
        supabase,
        seatId: seat.id,
        recipientEmail: seat.employee_email,
        templateType: "weekly_nudge",
        templateData,
        baseUrl,
      });

      if (result.success) {
        results.weekly_nudge.sent++;
      } else {
        results.weekly_nudge.failed++;
      }
    } catch {
      results.weekly_nudge.failed++;
    }
  }
}

async function processThirtyDayCheckins(
  supabase: SupabaseClient,
  results: Record<string, TriggerCounters>
): Promise<void> {
  const now = Date.now();
  const twentyNineDaysAgo = new Date(
    now - 29 * 24 * 60 * 60 * 1000
  ).toISOString();
  const thirtyOneDaysAgo = new Date(
    now - 31 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: seats } = await supabase
    .from("seats")
    .select("id, employee_email, employee_name, status, program_id, created_at, activated_at")
    .in("status", ["activated", "active"])
    .not("activated_at", "is", null)
    .lte("activated_at", twentyNineDaysAgo)
    .gte("activated_at", thirtyOneDaysAgo)
    .limit(MAX_BATCH_SIZE);

  if (!seats || seats.length === 0) return;

  const baseUrl = getBaseUrl();
  const programCache = new Map<string, string>();
  const companyCache = new Map<string, CompanyRecord>();

  for (const seat of seats as SeatRecord[]) {
    try {
      const recentlySent = await hasRecentEmail(
        supabase,
        seat.id,
        "thirty_day_checkin",
        THIRTY_DAY_CHECKIN_HOURS
      );

      if (recentlySent) {
        results.thirty_day_checkin.skipped++;
        continue;
      }

      const company = await getCompanyForProgram(
        supabase,
        seat.program_id,
        programCache,
        companyCache
      );

      if (!company) {
        results.thirty_day_checkin.failed++;
        continue;
      }

      const daysSinceActivation = seat.activated_at
        ? Math.round(
            (now - new Date(seat.activated_at).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : 30;

      // Fetch progress metrics for the check-in email
      let progressSummary: string | undefined;
      try {
        const { data: empProfile } = await supabase
          .from("employee_profiles")
          .select("id")
          .eq("seat_id", seat.id)
          .single();

        if (empProfile) {
          const empId = (empProfile as unknown as { id: string }).id;
          const [resumeRes, interviewRes, jobMatchRes] = await Promise.all([
            supabase
              .from("resumes")
              .select("id", { count: "exact", head: true })
              .eq("employee_id", empId),
            supabase
              .from("interview_sessions")
              .select("id", { count: "exact", head: true })
              .eq("employee_id", empId),
            supabase
              .from("job_matches")
              .select("id", { count: "exact", head: true })
              .eq("employee_id", empId),
          ]);

          const parts: string[] = [];
          if (resumeRes.count && resumeRes.count > 0) {
            parts.push(`${resumeRes.count} resume${resumeRes.count > 1 ? "s" : ""} created`);
          }
          if (interviewRes.count && interviewRes.count > 0) {
            parts.push(`${interviewRes.count} interview${interviewRes.count > 1 ? "s" : ""} completed`);
          }
          if (jobMatchRes.count && jobMatchRes.count > 0) {
            parts.push(`${jobMatchRes.count} job match${jobMatchRes.count > 1 ? "es" : ""} found`);
          }

          if (parts.length > 0) {
            progressSummary = parts.join(" · ");
          }
        }
      } catch {
        // Progress fetch is optional — proceed without summary
      }

      const templateData = buildTemplateData(seat, company, baseUrl, {
        daysSinceActivation,
        progressSummary,
      });

      const result = await sendTrackedEmail({
        supabase,
        seatId: seat.id,
        recipientEmail: seat.employee_email,
        templateType: "thirty_day_checkin",
        templateData,
        baseUrl,
      });

      if (result.success) {
        results.thirty_day_checkin.sent++;
      } else {
        results.thirty_day_checkin.failed++;
      }
    } catch {
      results.thirty_day_checkin.failed++;
    }
  }
}

// ─── Route Handler ───────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();

  const results: Record<string, TriggerCounters> = {
    reengagement: { sent: 0, skipped: 0, failed: 0 },
    weekly_nudge: { sent: 0, skipped: 0, failed: 0 },
    thirty_day_checkin: { sent: 0, skipped: 0, failed: 0 },
  };

  try {
    await processReengagement(supabase, results);
  } catch {
    results.reengagement.error = "Trigger processing failed";
  }

  try {
    await processWeeklyNudges(supabase, results);
  } catch {
    results.weekly_nudge.error = "Trigger processing failed";
  }

  try {
    await processThirtyDayCheckins(supabase, results);
  } catch {
    results.thirty_day_checkin.error = "Trigger processing failed";
  }

  return NextResponse.json({ data: results });
}
