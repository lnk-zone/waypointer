/**
 * GET /api/v1/employee/resume/suggestions
 *
 * Returns pending resume edit suggestions from application kits for a given role path.
 * Joins application_kits -> job_matches -> job_listings to get job context.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { searchParams } = new URL(request.url);
  const rolePathId = searchParams.get("role_path_id");

  if (!rolePathId) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "role_path_id query parameter is required"
    );
  }

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

  // Step 1: Get job_match_ids for this employee + role_path_id
  const { data: matches, error: matchError } = await supabase
    .from("job_matches")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("role_path_id", rolePathId);

  if (matchError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch job matches"
    );
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const matchIds = matches.map((m) => m.id);

  // Step 2: Get application_kits for those match IDs where resume_edits is not null
  const { data: kits, error: kitsError } = await supabase
    .from("application_kits")
    .select("id, job_match_id, resume_edits, dismissed_edits")
    .in("job_match_id", matchIds)
    .not("resume_edits", "is", null);

  if (kitsError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch application kits"
    );
  }

  if (!kits || kits.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Step 3: Get job listing details for each match
  const kitMatchIds = kits.map((k) => k.job_match_id);
  const { data: matchDetails, error: detailsError } = await supabase
    .from("job_matches")
    .select("id, job_listing_id")
    .in("id", kitMatchIds);

  if (detailsError || !matchDetails) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch match details"
    );
  }

  const listingIds = matchDetails.map((m) => m.job_listing_id);
  const { data: listings, error: listingsError } = await supabase
    .from("job_listings")
    .select("id, title, company_name")
    .in("id", listingIds);

  if (listingsError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch job listings"
    );
  }

  // Build lookup maps
  const matchToListing = new Map(
    matchDetails.map((m) => [m.id, m.job_listing_id])
  );
  const listingMap = new Map(
    (listings ?? []).map((l) => [l.id, { title: l.title, company_name: l.company_name }])
  );

  // Assemble response, filtering out dismissed edits
  const data = kits
    .map((kit) => {
      const listingId = matchToListing.get(kit.job_match_id);
      const listing = listingId ? listingMap.get(listingId) : null;
      const dismissed: string[] = Array.isArray(kit.dismissed_edits) ? kit.dismissed_edits : [];

      // Filter out dismissed edits
      let edits = kit.resume_edits;
      if (Array.isArray(edits) && dismissed.length > 0) {
        edits = edits.filter((edit: string | { suggestion?: string }) => {
          const editText = typeof edit === "string" ? edit : edit.suggestion ?? JSON.stringify(edit);
          return !dismissed.includes(editText);
        });
      }

      if (Array.isArray(edits) && edits.length === 0) return null;

      return {
        kit_id: kit.id,
        job_match_id: kit.job_match_id,
        job_title: listing?.title ?? "Unknown Position",
        company_name: listing?.company_name ?? "Unknown Company",
        resume_edits: edits,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ data });
}

/**
 * PATCH /api/v1/employee/resume/suggestions
 *
 * Dismiss a suggestion so it doesn't reappear.
 * Body: { kit_id: string, edit_text: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const body = await request.json();
  const { kit_id, edit_text } = body;

  if (!kit_id || !edit_text) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "kit_id and edit_text are required");
  }

  const supabase = createServiceClient();

  // Verify ownership: kit -> job_match -> employee
  const { data: employee } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (!employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Get current dismissed_edits
  const { data: kit, error: kitError } = await supabase
    .from("application_kits")
    .select("id, dismissed_edits, job_match_id")
    .eq("id", kit_id)
    .single();

  if (kitError || !kit) {
    return apiError(ERROR_CODES.NOT_FOUND, "Application kit not found");
  }

  // Verify the kit belongs to this employee
  const { data: match } = await supabase
    .from("job_matches")
    .select("employee_id")
    .eq("id", kit.job_match_id)
    .single();

  if (!match || match.employee_id !== employee.id) {
    return apiError(ERROR_CODES.FORBIDDEN, "Not authorized");
  }

  // Append to dismissed_edits
  const currentDismissed: string[] = Array.isArray(kit.dismissed_edits) ? kit.dismissed_edits : [];
  if (!currentDismissed.includes(edit_text)) {
    currentDismissed.push(edit_text);
  }

  const { error: updateError } = await supabase
    .from("application_kits")
    .update({ dismissed_edits: currentDismissed, updated_at: new Date().toISOString() })
    .eq("id", kit_id);

  if (updateError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to dismiss suggestion");
  }

  return NextResponse.json({ success: true });
}
