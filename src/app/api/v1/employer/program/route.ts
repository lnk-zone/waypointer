/**
 * POST /api/v1/employer/program — Create a new transition program.
 * PUT  /api/v1/employer/program — Update the active transition program.
 *
 * Auth: Employer admin only.
 * Uses Edge Runtime — lightweight JSON endpoint.
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
import { programSchema } from "@/lib/validators/program";

// ─── Types ────────────────────────────────────────────────────────────

interface ProgramRecord {
  id: string;
  company_id: string;
  name: string;
  tier: string;
  total_seats: number;
  used_seats: number;
  access_duration_days: number;
  is_branded: boolean;
  custom_intro_message: string | null;
  interview_coaching_enabled: boolean;
  outreach_builder_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
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
    const parsed = programSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid program data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const supabase = createServiceClient();

    // Check if a program already exists for this company
    const { data: existingProgram } = await supabase
      .from("transition_programs")
      .select("id")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .single();

    if (existingProgram) {
      return apiError(
        ERROR_CODES.CONFLICT,
        "An active program already exists for this company"
      );
    }

    // Create the program
    const { data: rawProgram, error: programError } = await supabase
      .from("transition_programs")
      .insert({
        company_id: auth.companyId,
        name: input.name,
        tier: input.tier,
        total_seats: input.total_seats,
        access_duration_days: input.access_duration_days,
        is_branded: input.is_branded,
        custom_intro_message: input.custom_intro_message || null,
        interview_coaching_enabled: input.interview_coaching_enabled,
        outreach_builder_enabled: input.outreach_builder_enabled,
      })
      .select(
        "id, company_id, name, tier, total_seats, used_seats, access_duration_days, is_branded, custom_intro_message, interview_coaching_enabled, outreach_builder_enabled, is_active, created_at"
      )
      .single();

    if (programError || !rawProgram) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create transition program"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    return NextResponse.json({
      data: {
        id: program.id,
        company_id: program.company_id,
        name: program.name,
        tier: program.tier,
        total_seats: program.total_seats,
        used_seats: program.used_seats,
        access_duration_days: program.access_duration_days,
        is_branded: program.is_branded,
        custom_intro_message: program.custom_intro_message,
        interview_coaching_enabled: program.interview_coaching_enabled,
        outreach_builder_enabled: program.outreach_builder_enabled,
        is_active: program.is_active,
        created_at: program.created_at,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to create transition program"
    );
  }
}

// ─── PUT Handler (Update) ────────────────────────────────────────────

export async function PUT(request: NextRequest) {
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
    const parsed = programSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid program data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const supabase = createServiceClient();

    const { data: rawProgram, error: programError } = await supabase
      .from("transition_programs")
      .update({
        name: input.name,
        tier: input.tier,
        total_seats: input.total_seats,
        access_duration_days: input.access_duration_days,
        is_branded: input.is_branded,
        custom_intro_message: input.custom_intro_message || null,
        interview_coaching_enabled: input.interview_coaching_enabled,
        outreach_builder_enabled: input.outreach_builder_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .select(
        "id, company_id, name, tier, total_seats, used_seats, access_duration_days, is_branded, custom_intro_message, interview_coaching_enabled, outreach_builder_enabled, is_active, created_at"
      )
      .single();

    if (programError || !rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No active program found to update"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    return NextResponse.json({
      data: {
        id: program.id,
        company_id: program.company_id,
        name: program.name,
        tier: program.tier,
        total_seats: program.total_seats,
        used_seats: program.used_seats,
        access_duration_days: program.access_duration_days,
        is_branded: program.is_branded,
        custom_intro_message: program.custom_intro_message,
        interview_coaching_enabled: program.interview_coaching_enabled,
        outreach_builder_enabled: program.outreach_builder_enabled,
        is_active: program.is_active,
        created_at: program.created_at,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to update transition program"
    );
  }
}
