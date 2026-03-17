/**
 * GET /api/v1/employer/program/active
 * Returns the most recently created active program (for backward compat).
 */
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError, requireEmployer } from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const supabase = createServiceClient();

    const { data: rawProgram, error } = await supabase
      .from("transition_programs")
      .select("id, name, custom_intro_message, is_branded, is_active, created_at")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !rawProgram) {
      return apiError(ERROR_CODES.NOT_FOUND, "No active program found");
    }

    return NextResponse.json({
      data: rawProgram,
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch program");
  }
}
