/**
 * POST /api/v1/employer/invite
 *
 * Creates seat records for invited employees. Validates emails, deduplicates,
 * checks account-level seat availability, creates seat records with status 'invited',
 * and sends invitation emails via Resend.
 *
 * Uses Node.js Runtime — needs jose for JWT token generation + Resend for email.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError, requireEmployer } from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";
import * as jose from "jose";
import { sendTrackedEmail } from "@/lib/email/send-tracked";
import type { EmailTemplateData } from "@/lib/email/templates";

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
  program_id: z.string().uuid("Invalid program ID").optional(),
  employees: z
    .array(employeeEntrySchema)
    .min(1, "At least one employee is required")
    .max(500, "Maximum 500 employees per batch"),
});

// ─── Types ────────────────────────────────────────────────────────────

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

    // If program_id provided, verify it belongs to this company
    if (program_id) {
      const { data: program, error: programError } = await supabase
        .from("transition_programs")
        .select("id")
        .eq("id", program_id)
        .eq("company_id", auth.companyId)
        .eq("is_active", true)
        .single();

      if (programError || !program) {
        return apiError(ERROR_CODES.NOT_FOUND, "Program not found");
      }
    }

    // Get account-level seat balance
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("total_seats_purchased, total_seats_assigned")
      .eq("id", auth.companyId)
      .single();

    if (companyError || !company) {
      return apiError(ERROR_CODES.NOT_FOUND, "Company not found");
    }

    const companyData = company as { total_seats_purchased: number; total_seats_assigned: number };

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

      if (!EMAIL_RE.test(email)) {
        errors.push({ email: emp.email, reason: "Invalid email format" });
        skippedInvalid++;
        continue;
      }

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

    // Check seat availability at account level
    const availableSeats = companyData.total_seats_purchased - companyData.total_seats_assigned;
    if (validEmployees.length > availableSeats) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        `You have ${availableSeats} seat${availableSeats !== 1 ? "s" : ""} remaining. Purchase additional seats to continue.`
      );
    }

    // Check for existing seats by company (not by program)
    const existingEmails = new Set<string>();
    if (validEmployees.length > 0) {
      const emailList = validEmployees.map((e) => e.email);
      const BATCH_SIZE = 50;
      for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
        const batch = emailList.slice(i, i + BATCH_SIZE);
        const { data: existingSeats } = await supabase
          .from("seats")
          .select("employee_email")
          .eq("company_id", auth.companyId)
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

    // Atomically assign seats at account level
    let invited = 0;
    if (newEmployees.length > 0) {
      const { error: rpcError } = await supabase.rpc("assign_seats", {
        p_company_id: auth.companyId,
        p_count: newEmployees.length,
      });

      if (rpcError) {
        return apiError(
          ERROR_CODES.VALIDATION_ERROR,
          `Not enough available seats. Purchase additional seats to continue.`
        );
      }

      // Create seat records (return IDs for email sending)
      const seatRecords = newEmployees.map((emp) => ({
        company_id: auth.companyId,
        program_id: program_id || null,
        employee_email: emp.email,
        employee_name: emp.name || null,
        department: emp.department || null,
        role_family: emp.role_family || null,
        last_day: emp.last_day || null,
        status: "invited" as const,
      }));

      const { data: insertedSeats, error: insertError } = await supabase
        .from("seats")
        .insert(seatRecords)
        .select("id");

      if (insertError || !insertedSeats) {
        // Rollback: decrement assigned seats
        Promise.resolve(
          supabase.rpc("assign_seats", {
            p_company_id: auth.companyId,
            p_count: -newEmployees.length,
          })
        ).catch(() => {});
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create seat records");
      }

      invited = newEmployees.length;

      // Send invitation emails directly
      const insertedSeatIds = (insertedSeats as unknown as Array<{ id: string }>).map((s) => s.id);
      if (insertedSeatIds.length > 0) {
        // Fetch company info for email branding
        const { data: rawCompany } = await supabase
          .from("companies")
          .select("name, logo_url")
          .eq("id", auth.companyId)
          .single();

        const companyInfo = rawCompany as { name: string; logo_url: string | null } | null;
        const companyName = companyInfo?.name ?? "Your Company";

        // Generate logo presigned URL if exists
        let logoUrl: string | null = null;
        if (companyInfo?.logo_url) {
          const { data: signedData } = await supabase.storage
            .from("waypointer-files")
            .createSignedUrl(companyInfo.logo_url, 3600);
          logoUrl = signedData?.signedUrl ?? null;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://getwaypointer.com");

        // Send emails to each new invite (non-blocking — don't fail the invite if email fails)
        const emailPromises = newEmployees.map(async (emp, idx) => {
          try {
            const seatId = insertedSeatIds[idx];

            // Generate JWT activation token
            const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const token = await new jose.SignJWT({
              seat_id: seatId,
              email: emp.email,
              ...(program_id && { program_id }),
            })
              .setProtectedHeader({ alg: "HS256" })
              .setExpirationTime("30d")
              .setIssuedAt()
              .sign(secret);

            const activationLink = `${baseUrl}/activate?token=${encodeURIComponent(token)}`;

            const templateData: EmailTemplateData = {
              recipientName: emp.name || "there",
              companyName,
              companyLogoUrl: logoUrl,
              activationLink,
              loginLink: `${baseUrl}/login`,
              unsubscribeLink: `${baseUrl}/unsubscribe?seat=${seatId}`,
            };

            await sendTrackedEmail({
              supabase,
              seatId,
              recipientEmail: emp.email,
              templateType: "invitation",
              templateData,
              baseUrl,
            });
          } catch {
            // Email failure is non-fatal — seat is already created
          }
        });

        // Wait for all emails but don't block response on individual failures
        await Promise.allSettled(emailPromises);
      }
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
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to process invitations");
  }
}
