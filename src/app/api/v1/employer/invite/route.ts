/**
 * POST /api/v1/employer/invite
 *
 * Creates seat records for invited employees. Validates emails, deduplicates,
 * checks seat availability, and creates seat records with status 'invited'.
 *
 * Email sending is handled by E12 — this route creates the records and marks
 * seats as invited. The actual emails are triggered separately.
 *
 * Uses Edge Runtime — JSON processing only.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const employeeEntrySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email("Invalid email format"),
  department: z.string().max(200).optional().default(""),
  role_family: z.string().max(200).optional().default(""),
  last_day: z.string().optional().default(""),
});

const inviteSchema = z.object({
  program_id: z.string().uuid("Invalid program ID"),
  employees: z
    .array(employeeEntrySchema)
    .min(1, "At least one employee is required")
    .max(500, "Maximum 500 employees per batch"),
});

// ─── Types ────────────────────────────────────────────────────────────

interface ProgramRecord {
  id: string;
  company_id: string;
  total_seats: number;
  used_seats: number;
}

interface InviteError {
  email: string;
  reason: string;
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
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid invite data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { program_id, employees } = parsed.data;
    const supabase = createServiceClient();

    // Verify program belongs to this company
    const { data: rawProgram, error: programError } = await supabase
      .from("transition_programs")
      .select("id, company_id, total_seats, used_seats")
      .eq("id", program_id)
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .single();

    if (programError || !rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "Active transition program not found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    // Validate and deduplicate emails
    const errors: InviteError[] = [];
    const seenEmails = new Set<string>();
    const validEmployees: Array<{
      name: string;
      email: string;
      department: string;
      role_family: string;
      last_day: string;
    }> = [];
    let skippedDuplicates = 0;
    let skippedInvalid = 0;

    for (const emp of employees) {
      const email = emp.email.trim().toLowerCase();

      // Validate email format
      if (!EMAIL_RE.test(email)) {
        errors.push({ email: emp.email, reason: "Invalid email format" });
        skippedInvalid++;
        continue;
      }

      // Check for duplicates within this batch
      if (seenEmails.has(email)) {
        skippedDuplicates++;
        continue;
      }
      seenEmails.add(email);

      validEmployees.push({
        name: emp.name.trim(),
        email,
        department: emp.department || "",
        role_family: emp.role_family || "",
        last_day: emp.last_day || "",
      });
    }

    // Check seat availability
    const availableSeats = program.total_seats - program.used_seats;
    if (validEmployees.length > availableSeats) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        `You have ${availableSeats} seat${availableSeats !== 1 ? "s" : ""} remaining. Purchase additional seats to continue.`
      );
    }

    // Check for existing seats in batches to avoid URL length limits
    const existingEmails = new Set<string>();
    if (validEmployees.length > 0) {
      const emailList = validEmployees.map((e) => e.email);
      const BATCH_SIZE = 50;
      for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
        const batch = emailList.slice(i, i + BATCH_SIZE);
        const { data: existingSeats } = await supabase
          .from("seats")
          .select("employee_email")
          .eq("program_id", program_id)
          .in("employee_email", batch);

        if (existingSeats) {
          for (const seat of existingSeats as unknown as Array<{ employee_email: string }>) {
            existingEmails.add(seat.employee_email);
          }
        }
      }
    }

    // Filter out already-invited employees
    const newEmployees = validEmployees.filter((emp) => {
      if (existingEmails.has(emp.email)) {
        skippedDuplicates++;
        return false;
      }
      return true;
    });

    // Atomically increment used_seats before creating records
    let invited = 0;
    if (newEmployees.length > 0) {
      const { error: rpcError } = await supabase.rpc(
        "increment_used_seats_batch",
        { p_program_id: program_id, p_count: newEmployees.length }
      );

      if (rpcError) {
        return apiError(
          ERROR_CODES.VALIDATION_ERROR,
          `You have ${availableSeats} seat${availableSeats !== 1 ? "s" : ""} remaining. Purchase additional seats to continue.`
        );
      }

      // Create seat records
      const seatRecords = newEmployees.map((emp) => ({
        program_id,
        employee_email: emp.email,
        employee_name: emp.name || null,
        department: emp.department || null,
        role_family: emp.role_family || null,
        last_day: emp.last_day || null,
        status: "invited" as const,
      }));

      const { error: insertError } = await supabase
        .from("seats")
        .insert(seatRecords);

      if (insertError) {
        // Rollback: decrement used_seats
        Promise.resolve(supabase.rpc("increment_used_seats_batch", {
          p_program_id: program_id,
          p_count: -newEmployees.length,
        })).catch(() => {});
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create seat records"
        );
      }

      invited = newEmployees.length;
    }

    return NextResponse.json({
      data: {
        invited,
        skipped_duplicates: skippedDuplicates,
        skipped_invalid: skippedInvalid,
        errors,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to process invitations"
    );
  }
}
