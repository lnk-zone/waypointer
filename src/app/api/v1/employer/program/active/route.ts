/**
 * GET /api/v1/employer/program/active
 *
 * Returns the employer's active transition program.
 * Used by the invite page to know seat availability.
 *
 * Uses Edge Runtime — lightweight read.
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

// ─── Types ────────────────────────────────────────────────────────────

interface ProgramRecord {
  id: string;
  name: string;
  tier: string;
  total_seats: number;
  used_seats: number;
  access_duration_days: number;
  is_branded: boolean;
  interview_coaching_enabled: boolean;
  outreach_builder_enabled: boolean;
}

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

    const { data: rawProgram, error: programError } = await supabase
      .from("transition_programs")
      .select(
        "id, name, tier, total_seats, used_seats, access_duration_days, is_branded, interview_coaching_enabled, outreach_builder_enabled"
      )
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (programError || !rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No active transition program found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    return NextResponse.json({
      data: {
        id: program.id,
        name: program.name,
        tier: program.tier,
        total_seats: program.total_seats,
        used_seats: program.used_seats,
        access_duration_days: program.access_duration_days,
        is_branded: program.is_branded,
        interview_coaching_enabled: program.interview_coaching_enabled,
        outreach_builder_enabled: program.outreach_builder_enabled,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch program details"
    );
  }
}
