/**
 * POST /api/v1/employee/jobs/:match_id/track
 *
 * Creates or updates an application tracking entry for a job match.
 * Per MP §9: Request body { status: "applied" | "saved" | ... }
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

const trackSchema = z.object({
  status: z.enum(["saved", "applied", "interviewing", "offer", "closed"]),
});

/** Log activity without blocking or failing the primary operation */
function logActivity(
  supabase: SupabaseClient,
  employeeId: string,
  status: string,
  metadata: Record<string, string>
) {
  Promise.resolve(
    supabase
      .from("activity_log")
      .insert({
        employee_id: employeeId,
        action: `application_${status}`,
        metadata,
      })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: matchId } = await params;

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid status: ${parsed.error.issues.map((i) => i.message).join("; ")}`
    );
  }

  const supabase = createServiceClient();

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Verify the job match exists and belongs to this employee
  const { data: match, error: matchError } = await supabase
    .from("job_matches")
    .select("id, job_listing_id, job_listings!inner(title, company_name)")
    .eq("id", matchId)
    .eq("employee_id", employee.id)
    .single();

  if (matchError || !match) {
    return apiError(ERROR_CODES.NOT_FOUND, "Job match not found");
  }

  const jobListing = match.job_listings as unknown as {
    title: string;
    company_name: string;
  };

  const now = new Date().toISOString();
  const status = parsed.data.status;

  // Check if application already exists for this match
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("job_match_id", matchId)
    .single();

  let resultData: Record<string, unknown> | null = null;

  if (existing) {
    // Update existing application
    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update({
        status,
        ...(status === "applied" && { applied_at: now }),
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, status, applied_at, created_at")
      .single();

    if (updateError || !updated) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update application"
      );
    }
    resultData = updated;
  } else {
    // Create new application
    const { data: inserted, error: insertError } = await supabase
      .from("applications")
      .insert({
        employee_id: employee.id,
        job_match_id: matchId,
        job_title: jobListing.title,
        company_name: jobListing.company_name,
        status,
        ...(status === "applied" && { applied_at: now }),
      })
      .select("id, status, applied_at, created_at")
      .single();

    if (insertError || !inserted) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create application"
      );
    }
    resultData = inserted;
  }

  // Log activity (fire-and-forget, does not block response)
  logActivity(supabase, employee.id, status, {
    job_match_id: matchId,
    job_title: jobListing.title,
    company_name: jobListing.company_name,
  });

  return NextResponse.json({ data: resultData });
}
