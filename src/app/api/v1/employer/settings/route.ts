/**
 * GET  /api/v1/employer/settings — Returns employer admin profile + company data
 * PATCH /api/v1/employer/settings — Updates company name/industry and admin full_name
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

// ─── Validation ──────────────────────────────────────────────────────

const patchSchema = z.object({
  company_name: z
    .string()
    .min(1, "Company name is required")
    .max(200, "Company name is too long")
    .optional(),
  industry: z
    .string()
    .max(200, "Industry is too long")
    .optional(),
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(200, "Full name is too long")
    .optional(),
});

// ─── GET ─────────────────────────────────────────────────────────────

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

    const [companyResult, adminResult] = await Promise.all([
      supabase
        .from("companies")
        .select("name, logo_url, industry")
        .eq("id", auth.companyId)
        .single(),
      supabase
        .from("employer_admins")
        .select("id, full_name, email")
        .eq("auth_user_id", auth.user.id)
        .single(),
    ]);

    if (!companyResult.data || !adminResult.data) {
      return apiError(ERROR_CODES.NOT_FOUND, "Settings data not found");
    }

    return NextResponse.json({
      data: {
        company: {
          name: companyResult.data.name,
          logo_url: companyResult.data.logo_url ?? null,
          industry: (companyResult.data as Record<string, unknown>).industry ?? null,
        },
        admin: {
          id: adminResult.data.id,
          full_name: adminResult.data.full_name,
          email: adminResult.data.email,
        },
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to load settings");
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { company_name, industry, full_name } = parsed.data;

  try {
    const supabase = createServiceClient();
    const updates: PromiseLike<unknown>[] = [];

    // Update company fields
    if (company_name !== undefined || industry !== undefined) {
      const companyUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (company_name !== undefined) companyUpdate.name = company_name;
      if (industry !== undefined) companyUpdate.industry = industry;

      updates.push(
        supabase
          .from("companies")
          .update(companyUpdate)
          .eq("id", auth.companyId)
          .select()
          .then()
      );
    }

    // Update admin full_name
    if (full_name !== undefined) {
      updates.push(
        supabase
          .from("employer_admins")
          .update({
            full_name,
            updated_at: new Date().toISOString(),
          })
          .eq("auth_user_id", auth.user.id)
          .select()
          .then()
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return NextResponse.json({
      data: { success: true },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update settings");
  }
}
