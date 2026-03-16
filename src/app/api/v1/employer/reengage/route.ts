/**
 * POST /api/v1/employer/reengage
 *
 * Triggers re-engagement emails for inactive users.
 * Finds employees with no activity in the threshold period, checks
 * deduplication, and sends tracked re-engagement emails.
 *
 * Uses Node.js Runtime — email sending needs Node APIs.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";
import { sendTrackedEmail, hasRecentEmail } from "@/lib/email/send-tracked";
import type { EmailTemplateData } from "@/lib/email/templates";

// ─── Request Validation ───────────────────────────────────────────────

const reengageSchema = z.object({
  program_id: z.string().uuid("Invalid program ID"),
  inactive_days_threshold: z.number().int().min(1).max(90).default(7),
});

// ─── Types ────────────────────────────────────────────────────────────

interface SeatRecord {
  id: string;
  employee_email: string;
  employee_name: string | null;
}

interface EmployeeRecord {
  id: string;
  seat_id: string;
}

interface ActivityDateRecord {
  employee_id: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://getwaypointer.com";
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No company found. Please complete company setup first."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  try {
    const parsed = reengageSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request data",
        { fields: parsed.error.flatten().fieldErrors }
      );
    }

    const { program_id, inactive_days_threshold } = parsed.data;
    const supabase = createServiceClient();

    // Verify program belongs to this company
    const { data: rawProgram } = await supabase
      .from("transition_programs")
      .select("id")
      .eq("id", program_id)
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .single();

    if (!rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "Active transition program not found"
      );
    }

    // Get activated seats for this program
    const { data: rawSeats } = await supabase
      .from("seats")
      .select("id, employee_email, employee_name")
      .eq("program_id", program_id)
      .in("status", ["activated", "active"]);

    const seats = (rawSeats as unknown as SeatRecord[] | null) ?? [];
    if (seats.length === 0) {
      return NextResponse.json({ data: { sent: 0, skipped: 0, failed: 0 } });
    }

    const seatIds = seats.map((s) => s.id);

    // Get employee profiles for these seats
    const { data: rawEmployees } = await supabase
      .from("employee_profiles")
      .select("id, seat_id")
      .in("seat_id", seatIds);

    const employees =
      (rawEmployees as unknown as EmployeeRecord[] | null) ?? [];
    if (employees.length === 0) {
      return NextResponse.json({ data: { sent: 0, skipped: 0, failed: 0 } });
    }

    const employeeIds = employees.map((e) => e.id);

    // Find recent activity per employee
    const thresholdDate = new Date(
      Date.now() - inactive_days_threshold * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: rawActivity } = await supabase
      .from("activity_log")
      .select("employee_id, created_at")
      .in("employee_id", employeeIds)
      .gte("created_at", thresholdDate);

    const recentlyActive = new Set(
      ((rawActivity as unknown as ActivityDateRecord[] | null) ?? []).map(
        (a) => a.employee_id
      )
    );

    // Inactive = employees with no activity in threshold period
    const inactiveEmployeeIds = employeeIds.filter(
      (id) => !recentlyActive.has(id)
    );

    if (inactiveEmployeeIds.length === 0) {
      return NextResponse.json({
        data: { sent: 0, skipped: 0, failed: 0 },
      });
    }

    // Build a lookup from employee ID → seat record
    const employeeToSeat = new Map<string, SeatRecord>();
    for (const emp of employees) {
      const seat = seats.find((s) => s.id === emp.seat_id);
      if (seat) employeeToSeat.set(emp.id, seat);
    }

    // Fetch company name for branding
    const { data: rawCompany } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", auth.companyId)
      .single();
    const companyName =
      (rawCompany as unknown as { name: string } | null)?.name ??
      "Your Company";

    const baseUrl = getBaseUrl();
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const sentEmployeeIds: string[] = [];

    // Process seats sequentially to respect rate limits
    for (const empId of inactiveEmployeeIds) {
      const seat = employeeToSeat.get(empId);
      if (!seat) {
        skipped++;
        continue;
      }

      // Deduplication — skip if a re-engagement email was sent within 72h
      const recentlySent = await hasRecentEmail(
        supabase,
        seat.id,
        "reengagement_72h",
        72
      );
      if (recentlySent) {
        skipped++;
        continue;
      }

      const templateData: EmailTemplateData = {
        recipientName: seat.employee_name ?? "there",
        companyName,
        loginLink: `${baseUrl}/login`,
        unsubscribeLink: `${baseUrl}/unsubscribe?seat=${seat.id}`,
      };

      const result = await sendTrackedEmail({
        supabase,
        seatId: seat.id,
        recipientEmail: seat.employee_email,
        templateType: "reengagement_72h",
        templateData,
        baseUrl,
      });

      if (result.success) {
        sent++;
        sentEmployeeIds.push(empId);
      } else {
        failed++;
      }
    }

    // Log the re-engagement action for sent emails (fire-and-forget)
    if (sentEmployeeIds.length > 0) {
      Promise.resolve(
        supabase.from("activity_log").insert(
          sentEmployeeIds.map((empId) => ({
            employee_id: empId,
            action: "reengage_email_sent",
            metadata: {
              program_id,
              triggered_by: auth.user.id,
              threshold_days: inactive_days_threshold,
            },
          }))
        )
      ).catch(() => {});
    }

    return NextResponse.json({
      data: { sent, skipped, failed },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to process re-engagement request"
    );
  }
}
