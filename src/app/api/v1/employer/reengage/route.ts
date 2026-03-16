/**
 * POST /api/v1/employer/reengage
 *
 * Triggers re-engagement emails for inactive users.
 * Email sending is implemented in E12 — this endpoint marks users for
 * re-engagement and returns the count.
 *
 * Uses Edge Runtime — lightweight JSON processing.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

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

  try {
    const body = await request.json();
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
      return NextResponse.json({ data: { emails_sent: 0 } });
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
      return NextResponse.json({ data: { emails_sent: 0 } });
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

    // Email sending is deferred to E12. For now, we record the reengage
    // action and return the count.

    if (inactiveEmployeeIds.length > 0) {
      // Log the re-engagement action (fire-and-forget)
      Promise.resolve(
        supabase.from("activity_log").insert(
          inactiveEmployeeIds.map((empId) => ({
            employee_id: empId,
            action: "reengage_email_queued",
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
      data: {
        emails_sent: inactiveEmployeeIds.length,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to process re-engagement request"
    );
  }
}
