/**
 * POST /api/v1/employer/company
 *
 * Creates a company record and the primary employer_admin record linked
 * to the authenticated user. Handles logo upload to Supabase Storage.
 *
 * Uses Node.js Runtime — file upload handling.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

// ─── Request Validation ───────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .default("#2563EB"),
  support_email: z.string().email("Invalid support email"),
  welcome_message: z.string().max(2000).optional().default(""),
  default_program_duration_days: z
    .number()
    .int()
    .min(7)
    .max(365)
    .default(90),
  admin_emails: z
    .array(z.string().email("Invalid email format"))
    .max(5, "Maximum 5 admin emails")
    .optional()
    .default([]),
});

// ─── Types ────────────────────────────────────────────────────────────

interface CompanyRecord {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  support_email: string;
  welcome_message: string;
  default_program_duration_days: number;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  // Only new users or existing employer admins can create companies
  if (auth.role === "employee") {
    return apiError(ERROR_CODES.FORBIDDEN, "Employees cannot create companies");
  }

  try {
    const supabase = createServiceClient();

    // Check if user already has a company
    const { data: existingAdmin } = await supabase
      .from("employer_admins")
      .select("id, company_id")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (existingAdmin) {
      return apiError(
        ERROR_CODES.CONFLICT,
        "You already have a company set up"
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const bodyStr = formData.get("data");
    if (!bodyStr || typeof bodyStr !== "string") {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Missing company data in form body"
      );
    }

    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(bodyStr);
    } catch {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON in data field");
    }

    const parsed = companySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid company data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;

    // Handle logo upload
    let logoUrl: string | null = null;
    const logoFile = formData.get("logo");
    if (logoFile && logoFile instanceof File && logoFile.size > 0) {
      // Validate file type
      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!allowedTypes.includes(logoFile.type)) {
        return apiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Logo must be a PNG, JPEG, WebP, or SVG file"
        );
      }

      // Validate file size (max 2MB)
      if (logoFile.size > 2 * 1024 * 1024) {
        return apiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Logo file must be under 2MB"
        );
      }

      const ext = logoFile.name.split(".").pop() ?? "png";
      const filePath = `logos/${auth.user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        });

      if (uploadError) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to upload logo"
        );
      }

      logoUrl = filePath;
    }

    // Create company record
    const { data: rawCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        logo_url: logoUrl,
        brand_color: input.brand_color,
        support_email: input.support_email,
        welcome_message: input.welcome_message,
        default_program_duration_days: input.default_program_duration_days,
      })
      .select("id, name, logo_url, brand_color, support_email, welcome_message, default_program_duration_days")
      .single();

    if (companyError || !rawCompany) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create company"
      );
    }

    const company = rawCompany as unknown as CompanyRecord;

    // Create primary employer_admin record
    const { error: adminError } = await supabase
      .from("employer_admins")
      .insert({
        company_id: company.id,
        email: auth.user.email ?? input.support_email,
        full_name: auth.user.user_metadata?.full_name ?? "Admin",
        auth_user_id: auth.user.id,
        is_primary: true,
      });

    if (adminError) {
      // Rollback: delete the company
      await supabase.from("companies").delete().eq("id", company.id);
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create admin record"
      );
    }

    // Additional admin emails are collected but their employer_admin records
    // are created only when they register and claim their accounts. The
    // auth_user_id UNIQUE constraint prevents creating placeholder rows.
    // These emails will be used to send invitation emails in a future step.

    // Generate presigned URL for logo if one was uploaded
    let logoPresignedUrl: string | null = null;
    if (logoUrl) {
      const { data: signedData } = await supabase.storage
        .from("company-assets")
        .createSignedUrl(logoUrl, 3600);
      logoPresignedUrl = signedData?.signedUrl ?? null;
    }

    return NextResponse.json({
      data: {
        id: company.id,
        name: company.name,
        logo_url: logoPresignedUrl,
        brand_color: company.brand_color,
        support_email: company.support_email,
        welcome_message: company.welcome_message,
        default_program_duration_days: company.default_program_duration_days,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to set up company"
    );
  }
}
