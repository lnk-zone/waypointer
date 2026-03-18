/**
 * GET /api/v1/employer/seats
 * Returns the employer's account-level seat balance.
 */
export const runtime = "nodejs";

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
    const { data: company, error } = await supabase
      .from("companies")
      .select("total_seats_purchased, total_seats_assigned")
      .eq("id", auth.companyId)
      .single();

    if (error || !company) {
      return apiError(ERROR_CODES.NOT_FOUND, "Company not found");
    }

    const c = company as { total_seats_purchased: number; total_seats_assigned: number };

    return NextResponse.json({
      data: {
        total_purchased: c.total_seats_purchased,
        total_assigned: c.total_seats_assigned,
        available: c.total_seats_purchased - c.total_seats_assigned,
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch seat balance");
  }
}
