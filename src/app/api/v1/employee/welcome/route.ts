import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * GET /api/v1/employee/welcome
 * Returns welcome screen data: company branding, welcome message, and program info.
 * Employee-only endpoint.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Fetch employee profile with seat → program → company chain
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, seat_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const { data: seat, error: seatError } = await supabase
    .from("seats")
    .select("id, program_id")
    .eq("id", employee.seat_id)
    .single();

  if (seatError || !seat) {
    return apiError(ERROR_CODES.NOT_FOUND, "Seat not found");
  }

  const { data: program, error: progError } = await supabase
    .from("transition_programs")
    .select("id, name, company_id, is_branded")
    .eq("id", seat.program_id)
    .single();

  if (progError || !program) {
    return apiError(ERROR_CODES.NOT_FOUND, "Program not found");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url, brand_color, welcome_message")
    .eq("id", program.company_id)
    .single();

  return NextResponse.json({
    data: {
      company_name: company?.name ?? "",
      logo_url: company?.logo_url ?? null,
      brand_color: program.is_branded ? (company?.brand_color ?? null) : null,
      welcome_message: company?.welcome_message ?? null,
      program_name: program.name,
    },
  });
}
