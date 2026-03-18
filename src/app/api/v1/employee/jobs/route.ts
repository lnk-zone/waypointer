/**
 * GET /api/v1/employee/jobs
 *
 * Returns paginated, scored job matches for the authenticated employee.
 * Filterable by path_id, fit score, and location. Sortable by fit, date, company.
 *
 * Query params: ?path_id=uuid&fit=high_fit&action=apply_now&location=remote&page=1&per_page=20&sort=fit&match_id=uuid
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

const JOB_LISTING_SELECT = `
  id,
  external_id,
  title,
  company_name,
  company_logo_url,
  location,
  is_remote,
  is_hybrid,
  description_summary,
  description_full,
  salary_min,
  salary_max,
  requirements,
  posted_at,
  source_url,
  is_active
`;

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

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

  // Parse query params
  const { searchParams } = new URL(request.url);
  const pathId = searchParams.get("path_id");
  const fit = searchParams.get("fit");
  const action = searchParams.get("action");
  const location = searchParams.get("location");
  const matchId = searchParams.get("match_id");
  const appStatus = searchParams.get("app_status");
  const sort = searchParams.get("sort") ?? "fit";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10))
  );

  // Validate fit param if provided
  const validFits = ["high_fit", "stretch", "low_fit"];
  if (fit && !validFits.includes(fit)) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid fit value. Must be one of: ${validFits.join(", ")}`
    );
  }

  // Validate action param if provided
  const validActions = [
    "apply_now",
    "reach_out_first",
    "seek_referral",
    "save_for_later",
    "skip",
  ];
  if (action && !validActions.includes(action)) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid action value. Must be one of: ${validActions.join(", ")}`
    );
  }

  // Validate location param if provided
  const validLocations = ["remote", "hybrid", "onsite"];
  if (location && !validLocations.includes(location)) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid location value. Must be one of: ${validLocations.join(", ")}`
    );
  }

  // Validate app_status param if provided
  const validAppStatuses = ["saved", "applied", "interviewing"];
  if (appStatus && !validAppStatuses.includes(appStatus)) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid app_status value. Must be one of: ${validAppStatuses.join(", ")}`
    );
  }

  // Single match lookup mode (for detail page)
  if (matchId) {
    const { data: singleMatch, error: singleError } = await supabase
      .from("job_matches")
      .select(
        `id, fit, match_explanation, competition_level, recommended_action, role_path_id, created_at, job_listings!inner (${JOB_LISTING_SELECT})`
      )
      .eq("id", matchId)
      .eq("employee_id", employee.id)
      .single();

    if (singleError || !singleMatch) {
      return apiError(ERROR_CODES.NOT_FOUND, "Job match not found");
    }

    // Fetch application status for this match
    const { data: singleApp } = await supabase
      .from("applications")
      .select("status, applied_at")
      .eq("employee_id", employee.id)
      .eq("job_match_id", matchId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...singleMatch,
        application_status: singleApp?.status ?? null,
        applied_at: singleApp?.applied_at ?? null,
      },
    });
  }

  // Build query for job matches with joined job listing data
  // When filtering by app_status, query from applications table instead
  if (appStatus) {
    // Filter through applications table
    let appCountQuery = supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("status", appStatus);

    const { count: appCount, error: appCountError } = await appCountQuery;

    if (appCountError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to count applications");
    }

    const appTotal = appCount ?? 0;
    const appTotalPages = Math.ceil(appTotal / perPage);
    const appOffset = (page - 1) * perPage;

    let appDataQuery = supabase
      .from("applications")
      .select("id, status, applied_at, job_match_id")
      .eq("employee_id", employee.id)
      .eq("status", appStatus)
      .order("created_at", { ascending: false })
      .range(appOffset, appOffset + perPage - 1);

    const { data: apps, error: appsError } = await appDataQuery;

    if (appsError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch applications");
    }

    // Fetch the corresponding job matches with listings
    const matchIds = (apps ?? []).map((a) => a.job_match_id).filter(Boolean);

    if (matchIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, per_page: perPage, total: appTotal, total_pages: appTotalPages },
      });
    }

    const { data: matchesWithListings, error: matchError } = await supabase
      .from("job_matches")
      .select(
        `id, fit, match_explanation, competition_level, recommended_action, role_path_id, created_at, job_listings!inner (${JOB_LISTING_SELECT})`
      )
      .in("id", matchIds);

    if (matchError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch job matches");
    }

    // Merge application status into match results
    const appMap = new Map((apps ?? []).map((a) => [a.job_match_id, a]));
    const enrichedMatches = (matchesWithListings ?? []).map((m) => {
      const app = appMap.get(m.id);
      return {
        ...m,
        application_status: app?.status ?? null,
        applied_at: app?.applied_at ?? null,
      };
    });

    return NextResponse.json({
      data: enrichedMatches,
      pagination: { page, per_page: perPage, total: appTotal, total_pages: appTotalPages },
    });
  }

  // Count query uses inner join on job_listings to match the data query's is_active filter
  let countQuery = supabase
    .from("job_matches")
    .select("id, job_listings!inner(id)", { count: "exact", head: true })
    .eq("employee_id", employee.id)
    .eq("job_listings.is_active", true);

  let dataQuery = supabase
    .from("job_matches")
    .select(
      `id, fit, match_explanation, competition_level, recommended_action, role_path_id, created_at, job_listings!inner (${JOB_LISTING_SELECT})`
    )
    .eq("employee_id", employee.id);

  // Apply filters
  if (pathId) {
    countQuery = countQuery.eq("role_path_id", pathId);
    dataQuery = dataQuery.eq("role_path_id", pathId);
  }

  if (fit) {
    countQuery = countQuery.eq("fit", fit);
    dataQuery = dataQuery.eq("fit", fit);
  }

  if (action) {
    countQuery = countQuery.eq("recommended_action", action);
    dataQuery = dataQuery.eq("recommended_action", action);
  }

  // Location type filter — applied on the joined job_listings columns
  if (location === "remote") {
    countQuery = countQuery.eq("job_listings.is_remote", true);
    dataQuery = dataQuery.eq("job_listings.is_remote", true);
  } else if (location === "hybrid") {
    countQuery = countQuery.eq("job_listings.is_hybrid", true);
    dataQuery = dataQuery.eq("job_listings.is_hybrid", true);
  } else if (location === "onsite") {
    countQuery = countQuery
      .eq("job_listings.is_remote", false)
      .eq("job_listings.is_hybrid", false);
    dataQuery = dataQuery
      .eq("job_listings.is_remote", false)
      .eq("job_listings.is_hybrid", false);
  }

  // Only show matches for active listings
  dataQuery = dataQuery.eq("job_listings.is_active", true);

  // Get total count
  const { count, error: countError } = await countQuery;

  if (countError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to count job matches"
    );
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;

  // Apply sort
  // Note: Supabase doesn't support ordering by related table columns directly.
  // For "company" and "date" sorts on the listing, we sort client-side after fetch.
  // For "fit" sort, we order by the match table's fit column.
  if (sort === "fit") {
    dataQuery = dataQuery.order("fit", { ascending: true });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  const { data: matches, error: dataError } = await dataQuery.range(
    offset,
    offset + perPage - 1
  );

  if (dataError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch job matches"
    );
  }

  // Fetch application statuses for all returned matches
  const matchIdList = (matches ?? []).map((m) => m.id);
  let applicationMap = new Map<string, { status: string; applied_at: string | null }>();

  if (matchIdList.length > 0) {
    const { data: applications } = await supabase
      .from("applications")
      .select("job_match_id, status, applied_at")
      .eq("employee_id", employee.id)
      .in("job_match_id", matchIdList);

    if (applications) {
      for (const app of applications) {
        applicationMap.set(app.job_match_id, {
          status: app.status,
          applied_at: app.applied_at,
        });
      }
    }
  }

  // Enrich matches with application status
  const enrichedMatches = (matches ?? []).map((m) => {
    const app = applicationMap.get(m.id);
    return {
      ...m,
      application_status: app?.status ?? null,
      applied_at: app?.applied_at ?? null,
    };
  });

  return NextResponse.json({
    data: enrichedMatches,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
  });
}
