/**
 * GET /api/v1/employee/jobs
 *
 * Returns paginated, scored job matches for the authenticated employee.
 * Filterable by path_id and fit score per MP §9.
 *
 * Query params: ?path_id=uuid&fit=high_fit&page=1&per_page=20
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

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

  // Build query for job matches with joined job listing data
  // Count query uses inner join on job_listings to match the data query's is_active filter
  let countQuery = supabase
    .from("job_matches")
    .select("id, job_listings!inner(id)", { count: "exact", head: true })
    .eq("employee_id", employee.id)
    .eq("job_listings.is_active", true);

  let dataQuery = supabase
    .from("job_matches")
    .select(
      `
      id,
      fit,
      match_explanation,
      competition_level,
      recommended_action,
      role_path_id,
      created_at,
      job_listings!inner (
        id,
        external_id,
        title,
        company_name,
        company_logo_url,
        location,
        is_remote,
        is_hybrid,
        description_summary,
        salary_min,
        salary_max,
        posted_at,
        source_url,
        is_active
      )
    `
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

  // Get paginated data, ordered by most recent first
  const { data: matches, error: dataError } = await dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (dataError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch job matches"
    );
  }

  return NextResponse.json({
    data: matches ?? [],
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
  });
}
