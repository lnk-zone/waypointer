/**
 * POST /api/v1/email/send
 *
 * Internal API for sending tracked emails to employees.
 * Requires employer admin auth. Renders template, sends via Resend,
 * records in email_sends table.
 *
 * Uses Node.js Runtime — email sending requires Node APIs.
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
import * as jose from "jose";
import {
  sendTrackedEmail,
  hasRecentEmail,
} from "@/lib/email/send-tracked";
import type { EmailTemplateData, EmailTemplateType } from "@/lib/email/templates";

// ─── Validation ───────────────────────────────────────────────────────

const sendEmailSchema = z.object({
  seat_ids: z.array(z.string().uuid()).min(1).max(500),
  template_type: z.enum([
    "invitation",
    "reengagement_72h",
    "weekly_nudge",
    "thirty_day_checkin",
  ]),
  custom_message: z.string().max(500).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────

interface SeatRecord {
  id: string;
  employee_name: string | null;
  employee_email: string;
  status: string;
  program_id: string;
}

interface CompanyRecord {
  id: string;
  name: string;
  logo_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://getwaypointer.com";
}

async function generateSeatToken(
  seatId: string,
  email: string,
  programId: string
): Promise<string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  const secret = new TextEncoder().encode(key);
  const token = await new jose.SignJWT({
    seat_id: seatId,
    email,
    program_id: programId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(secret);

  return token;
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

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request data", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { seat_ids, template_type, custom_message } = parsed.data;

  try {
    const supabase = createServiceClient();

    // Verify seats belong to employer's programs
    const { data: rawSeats } = await supabase
      .from("seats")
      .select(
        "id, employee_name, employee_email, status, program_id, transition_programs!inner(company_id)"
      )
      .in("id", seat_ids)
      .eq("transition_programs.company_id", auth.companyId);

    const seats = (rawSeats as unknown as SeatRecord[] | null) ?? [];

    if (seats.length === 0) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No valid seats found for this company"
      );
    }

    // Fetch company info for branding
    const { data: rawCompany } = await supabase
      .from("companies")
      .select("id, name, logo_url")
      .eq("id", auth.companyId)
      .single();

    const company = (rawCompany as unknown as CompanyRecord | null) ?? {
      id: auth.companyId,
      name: "Your Company",
      logo_url: null,
    };

    // Generate logo URL if exists
    let logoUrl: string | null = null;
    if (company.logo_url) {
      const { data: signedData } = await supabase.storage
        .from("waypointer-files")
        .createSignedUrl(company.logo_url, 3600);
      logoUrl = signedData?.signedUrl ?? null;
    }

    const baseUrl = getBaseUrl();
    const templateTypeTyped = template_type as EmailTemplateType;

    // Process each seat
    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: Array<{ seat_id: string; error: string }> = [];

    for (const seat of seats) {
      // Skip if already sent recently (dedup within 24h)
      const isDuplicate = await hasRecentEmail(
        supabase,
        seat.id,
        templateTypeTyped,
        24
      );
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      // Generate activation link for invitation emails
      let activationLink: string | undefined;
      if (template_type === "invitation") {
        const token = await generateSeatToken(
          seat.id,
          seat.employee_email,
          seat.program_id
        );
        activationLink = `${baseUrl}/activate?token=${encodeURIComponent(token)}`;
      }

      const templateData: EmailTemplateData = {
        recipientName: seat.employee_name ?? "there",
        companyName: company.name,
        companyLogoUrl: logoUrl,
        customMessage: custom_message,
        activationLink,
        loginLink: `${baseUrl}/login`,
        unsubscribeLink: `${baseUrl}/unsubscribe?seat=${seat.id}`,
      };

      const result = await sendTrackedEmail({
        supabase,
        seatId: seat.id,
        recipientEmail: seat.employee_email,
        templateType: templateTypeTyped,
        templateData,
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push({
          seat_id: seat.id,
          error: result.error ?? "Unknown error",
        });
      }
    }

    return NextResponse.json({
      data: {
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        total: seats.length,
        ...(errors.length > 0 && { errors }),
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to send emails"
    );
  }
}
