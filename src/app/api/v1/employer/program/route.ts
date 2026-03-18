/**
 * POST /api/v1/employer/program — Create a new program.
 * GET  /api/v1/employer/program — List all programs.
 * PUT  /api/v1/employer/program — Update a program by ID.
 *
 * Programs are organizational containers only — no seats, tiers, or duration.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError, requireEmployer } from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { programSchema } from "@/lib/validators/program";
import { z } from "zod";

interface ProgramRecord {
  id: string;
  company_id: string;
  name: string;
  custom_intro_message: string | null;
  is_branded: boolean;
  is_active: boolean;
  created_at: string;
}

// ─── GET: List all programs ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const supabase = createServiceClient();

    const { data: programs, error } = await supabase
      .from("transition_programs")
      .select("id, company_id, name, custom_intro_message, is_branded, is_active, created_at")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch programs");
    }

    // Get employee count per program
    const programIds = (programs ?? []).map((p: Record<string, unknown>) => p.id as string);
    const countsMap: Record<string, number> = {};

    if (programIds.length > 0) {
      const { data: seats } = await supabase
        .from("seats")
        .select("program_id")
        .in("program_id", programIds);

      if (seats) {
        for (const seat of seats as Array<{ program_id: string }>) {
          countsMap[seat.program_id] = (countsMap[seat.program_id] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      data: (programs ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        custom_intro_message: p.custom_intro_message,
        is_branded: p.is_branded,
        is_active: p.is_active,
        created_at: p.created_at,
        employee_count: countsMap[p.id as string] || 0,
      })),
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch programs");
  }
}

// ─── POST: Create a program ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
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
      .insert({
        company_id: auth.companyId,
        name: input.name,
        custom_intro_message: input.custom_intro_message || null,
        is_branded: input.is_branded,
      })
      .select("id, company_id, name, custom_intro_message, is_branded, is_active, created_at")
      .single();

    if (programError || !rawProgram) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create program");
    }

    const program = rawProgram as unknown as ProgramRecord;

    return NextResponse.json({
      data: {
        id: program.id,
        company_id: program.company_id,
        name: program.name,
        custom_intro_message: program.custom_intro_message,
        is_branded: program.is_branded,
        is_active: program.is_active,
        created_at: program.created_at,
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create program");
  }
}

// ─── PUT: Update a program ──────────────────────────────────────────

const updateSchema = programSchema.extend({
  id: z.string().uuid("Invalid program ID"),
});

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

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
        custom_intro_message: input.custom_intro_message || null,
        is_branded: input.is_branded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("company_id", auth.companyId)
      .select("id, company_id, name, custom_intro_message, is_branded, is_active, created_at")
      .single();

    if (programError || !rawProgram) {
      return apiError(ERROR_CODES.NOT_FOUND, "Program not found");
    }

    const program = rawProgram as unknown as ProgramRecord;

    return NextResponse.json({
      data: {
        id: program.id,
        company_id: program.company_id,
        name: program.name,
        custom_intro_message: program.custom_intro_message,
        is_branded: program.is_branded,
        is_active: program.is_active,
        created_at: program.created_at,
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update program");
  }
}
