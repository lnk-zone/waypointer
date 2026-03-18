/**
 * GET /api/v1/employee/jobs/:match_id/detail
 *
 * Returns everything about a job match in one call:
 * match (with job listing), application kit, application status, and interview sessions.
 * Used by the job detail page to hydrate all state on mount.
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: matchId } = await params;
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

  // Fetch job match with job listing join
  const { data: match, error: matchError } = await supabase
    .from("job_matches")
    .select(
      `id, fit, match_explanation, competition_level, recommended_action, role_path_id, created_at,
       job_listings!inner (
         id, external_id, title, company_name, company_logo_url,
         location, is_remote, is_hybrid, description_summary, description_full,
         salary_min, salary_max, requirements, posted_at, source_url, is_active
       )`
    )
    .eq("id", matchId)
    .eq("employee_id", employee.id)
    .single();

  if (matchError || !match) {
    return apiError(ERROR_CODES.NOT_FOUND, "Job match not found");
  }

  // Fetch application kit (may not exist)
  const { data: kit } = await supabase
    .from("application_kits")
    .select(
      `id, job_match_id, intro_paragraph, recruiter_message,
       hiring_manager_message, referral_request, resume_edits,
       interview_themes, resume_match_score, resume_match_projected,
       resume_match_date, created_at, updated_at`
    )
    .eq("job_match_id", matchId)
    .single();

  // Fetch application status (may not exist)
  const { data: application } = await supabase
    .from("applications")
    .select("id, status, applied_at")
    .eq("job_match_id", matchId)
    .eq("employee_id", employee.id)
    .single();

  // Fetch interview sessions (may be empty)
  const { data: interviews } = await supabase
    .from("interview_sessions")
    .select("id, overall_score, completed_at, format, feedback_generated")
    .eq("job_match_id", matchId)
    .eq("employee_id", employee.id)
    .order("completed_at", { ascending: false });

  return NextResponse.json({
    data: {
      match,
      kit: kit ?? null,
      application: application ?? null,
      interviews: interviews ?? [],
    },
  });
}
