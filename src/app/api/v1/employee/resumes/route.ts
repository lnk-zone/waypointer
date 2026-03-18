/**
 * GET /api/v1/employee/resumes
 *
 * Returns all current resumes (is_current = true) for the authenticated employee,
 * joined with their associated role path info.
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

  const supabase = createServiceClient();

  // Get employee profile with seat name
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, seats!inner(employee_name)")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch all current resumes with role path info via join
  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select(
      `id, role_path_id, tone, version, summary_statement, skills_section,
       experience_section, keywords, full_content, ats_score, clarity_score,
       specificity_score, score_feedback, created_at,
       role_paths!inner(title, is_primary)`
    )
    .eq("employee_id", employee.id)
    .eq("is_current", true)
    .order("created_at", { ascending: false });

  if (resumesError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch resumes");
  }

  // Extract employee name from seat join
  const rawSeat = employee.seats as
    | { employee_name: string | null }
    | { employee_name: string | null }[]
    | null;
  const seat = Array.isArray(rawSeat) ? rawSeat[0] : rawSeat;
  const employeeName = seat?.employee_name ?? null;

  if (!resumes || resumes.length === 0) {
    return NextResponse.json({ resumes: [], employee_name: employeeName });
  }

  const formatted = resumes.map((r) => {
    const rawRolePath = r.role_paths as
      | { title: string; is_primary: boolean }
      | { title: string; is_primary: boolean }[]
      | null;
    const rolePath = Array.isArray(rawRolePath)
      ? rawRolePath[0]
      : rawRolePath;
    return {
      resume_id: r.id,
      role_path_id: r.role_path_id,
      role_path_title: rolePath?.title ?? null,
      is_primary: rolePath?.is_primary ?? false,
      tone: r.tone,
      version: r.version,
      summary_statement: r.summary_statement,
      skills_section: r.skills_section,
      experience_section: r.experience_section,
      keywords: r.keywords,
      full_content: r.full_content,
      scores: {
        ats: r.ats_score,
        clarity: r.clarity_score,
        specificity: r.specificity_score,
        feedback: r.score_feedback,
      },
      created_at: r.created_at,
    };
  });

  return NextResponse.json({ resumes: formatted, employee_name: employeeName });
}
