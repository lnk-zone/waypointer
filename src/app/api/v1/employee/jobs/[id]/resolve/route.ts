/**
 * GET /api/v1/employee/jobs/:id/resolve
 *
 * Resolves a direct application URL for a specific job match.
 * The :id parameter is the job_matches.id (not job_listings.id).
 *
 * Runs the 4-tier waterfall resolver and returns the best available direct
 * application URL. Results are cached so subsequent calls for the same job
 * return instantly from cache.
 *
 * When a Tier 1–3 result is resolved, the job listing's source_url is updated
 * in place so the jobs list already reflects the direct link on next load.
 *
 * Response shape:
 * {
 *   data: {
 *     direct_url: string;
 *     is_direct: boolean;
 *     tier: 1 | 2 | 3 | 4;
 *     method: string;
 *     confidence: "high" | "medium" | "low";
 *     matched_title: string;
 *     is_verified: boolean;
 *   }
 * }
 */

export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { resolveDirectLink } from "@/lib/resolver";

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Authentication ─────────────────────────────────────────────────────────
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: matchId } = await params;
  const supabase = createServiceClient();

  // ── Resolve employee profile ───────────────────────────────────────────────
  const { data: employee } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (!employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // ── Fetch job match + listing fields needed for resolution ─────────────────
  const { data: match, error: matchError } = await supabase
    .from("job_matches")
    .select(
      "id, job_listing_id, job_listings!inner(id, external_id, title, company_name, employer_website, source_url)"
    )
    .eq("id", matchId)
    .eq("employee_id", employee.id)
    .single();

  if (matchError || !match) {
    return apiError(ERROR_CODES.NOT_FOUND, "Job match not found");
  }

  const listing = match.job_listings as unknown as {
    id: string;
    external_id: string;
    title: string;
    company_name: string;
    employer_website: string | null;
    source_url: string | null;
  };

  // ── Run the resolver waterfall ─────────────────────────────────────────────
  try {
    const result = await resolveDirectLink({
      id: listing.id,
      external_id: listing.external_id,
      title: listing.title,
      company_name: listing.company_name,
      employer_website: listing.employer_website,
      source_url: listing.source_url,
    });

    // Persist the resolved direct URL back to job_listings so the jobs list
    // reflects the direct link on subsequent loads without re-resolving.
    if (result.isDirect && result.directUrl) {
      await supabase
        .from("job_listings")
        .update({
          source_url: result.directUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);
    }

    return NextResponse.json({
      data: {
        direct_url: result.directUrl,
        is_direct: result.isDirect,
        tier: result.tier,
        method: result.method,
        confidence: result.confidence,
        matched_title: result.matchedTitle,
        is_verified: result.isVerified,
      },
    });
  } catch (err) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      err instanceof Error ? err.message : "Failed to resolve direct link"
    );
  }
}
