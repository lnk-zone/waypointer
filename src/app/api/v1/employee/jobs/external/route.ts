/**
 * POST /api/v1/employee/jobs/external
 *
 * Creates an external job listing (from LinkedIn, Indeed, company pages, etc.)
 * and links it to the employee via a job_match record. Optionally creates an
 * application entry if the user has already applied.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

export const runtime = "nodejs";

// ─── Request Validation ──────────────────────────────────────────────

const externalJobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(200),
  company_name: z.string().min(1, "Company name is required").max(200),
  url: z.string().url().optional().or(z.literal("")),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  role_path_id: z.string().uuid().optional(),
  already_applied: z.boolean().optional(),
});

// ─── Route Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = externalJobSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Get employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Determine role_path_id: use provided or fall back to primary path
  let rolePathId = input.role_path_id ?? null;
  if (!rolePathId) {
    const { data: primaryPath } = await supabase
      .from("role_paths")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("is_primary", true)
      .maybeSingle();

    rolePathId = primaryPath?.id ?? null;
  }

  // Insert into job_listings
  const { data: listing, error: listingError } = await supabase
    .from("job_listings")
    .insert({
      title: input.title,
      company_name: input.company_name,
      location: input.location || null,
      apply_url: input.url && input.url.length > 0 ? input.url : null,
      source: "external",
      is_active: true,
    })
    .select("id")
    .single();

  if (listingError || !listing) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to create job listing"
    );
  }

  // Insert into job_matches
  const { data: match, error: matchError } = await supabase
    .from("job_matches")
    .insert({
      employee_id: employee.id,
      job_listing_id: listing.id,
      role_path_id: rolePathId,
      fit: "stretch",
      match_explanation: input.notes || "Manually added external job listing",
      competition_level: "medium",
      recommended_action: "apply_now",
    })
    .select(
      "id, fit, match_explanation, competition_level, recommended_action, role_path_id, created_at"
    )
    .single();

  if (matchError || !match) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to create job match"
    );
  }

  // Optionally create an application entry
  let applicationStatus: string | null = null;
  let appliedAt: string | null = null;

  if (input.already_applied) {
    const { data: app } = await supabase
      .from("applications")
      .insert({
        employee_id: employee.id,
        job_match_id: match.id,
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .select("status, applied_at")
      .single();

    if (app) {
      applicationStatus = app.status;
      appliedAt = app.applied_at;
    }
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "external_job_added",
      metadata: {
        job_listing_id: listing.id,
        title: input.title,
        company_name: input.company_name,
      },
    })
  ).catch(() => {
    // Swallow -- activity logging is non-critical
  });

  return NextResponse.json(
    {
      data: {
        ...match,
        job_listings: {
          id: listing.id,
          external_id: null,
          title: input.title,
          company_name: input.company_name,
          company_logo_url: null,
          location: input.location || null,
          is_remote: false,
          is_hybrid: false,
          description_summary: null,
          salary_min: null,
          salary_max: null,
          posted_at: null,
          source_url: input.url && input.url.length > 0 ? input.url : null,
        },
        application_status: applicationStatus,
        applied_at: appliedAt,
      },
    },
    { status: 201 }
  );
}
