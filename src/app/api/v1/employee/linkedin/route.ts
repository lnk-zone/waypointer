/**
 * GET /api/v1/employee/linkedin
 *
 * Fetches existing LinkedIn content for the authenticated employee.
 * Returns null fields if no content has been generated yet.
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

  // Get employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Fetch linkedin content
  const { data: content, error: contentError } = await supabase
    .from("linkedin_content")
    .select(
      "headline, about_section, experience_bullets, featured_suggestions, skill_recommendations, open_to_work_guidance, recruiter_tips, is_marked_updated, updated_at"
    )
    .eq("employee_id", employee.id)
    .single();

  // PGRST116 = no rows found, which is expected when content hasn't been generated yet
  if (contentError && contentError.code !== "PGRST116") {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch LinkedIn content"
    );
  }

  return NextResponse.json({
    data: content ?? null,
  });
}
