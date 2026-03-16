/**
 * GET /api/v1/employer/outcomes
 *
 * Returns aggregated outcome metrics for the employer's transition program.
 * All data is aggregated — no individual employee data exposed.
 *
 * Uses Edge Runtime — read-only aggregation.
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
import {
  computeOutcomeMetrics,
  type ProgramRecord,
  type SeatRecord,
} from "@/lib/employer/outcome-metrics";

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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
    const supabase = createServiceClient();

    // Get active program
    const { data: rawProgram } = await supabase
      .from("transition_programs")
      .select("id, company_id, total_seats, access_duration_days, created_at")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No active transition program found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    // Get all seats
    const { data: rawSeats } = await supabase
      .from("seats")
      .select("id, status, activated_at")
      .eq("program_id", program.id);

    const seats = (rawSeats as unknown as SeatRecord[] | null) ?? [];
    const activeSeatIds = seats
      .filter((s) => s.status === "activated" || s.status === "active")
      .map((s) => s.id);
    const seatsActivated = activeSeatIds.length;

    if (seatsActivated === 0) {
      return NextResponse.json({
        data: {
          total_engaged: 0,
          pct_engaged: 0,
          pct_interview_ready: 0,
          avg_time_to_first_interview_days: 0,
          avg_confidence_lift: 0,
          opt_in_placement_rate: 0,
          opt_in_count: 0,
          avg_time_to_placement_days: 0,
          avg_satisfaction: 0,
          note: "No employees have activated yet.",
        },
      });
    }

    // Compute all metrics via shared utility
    const metrics = await computeOutcomeMetrics(
      supabase,
      program,
      activeSeatIds,
      seatsActivated
    );

    return NextResponse.json({
      data: {
        total_engaged: metrics.totalEngaged,
        pct_engaged: Math.round(metrics.pctEngaged * 1000) / 1000,
        pct_interview_ready:
          Math.round(metrics.pctInterviewReady * 1000) / 1000,
        avg_time_to_first_interview_days: metrics.avgTimeToFirstInterview,
        avg_confidence_lift: metrics.avgConfidenceLift,
        opt_in_placement_rate: metrics.optInPlacementRate,
        opt_in_count: metrics.optInCount,
        avg_time_to_placement_days: metrics.avgTimeToPlacement,
        avg_satisfaction: metrics.avgSatisfaction,
        note: metrics.note,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to load outcome metrics"
    );
  }
}
