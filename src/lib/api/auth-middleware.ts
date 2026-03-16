import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, createServerComponentClient, createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import type { User } from "@supabase/supabase-js";

export type UserRole = "employee" | "employer_admin";

export interface AuthContext {
  user: User;
  role: UserRole;
  employeeId?: string;
  companyId?: string;
}

/**
 * Authenticate a request and determine the user's role.
 * Supports both Bearer token (MP §9) and cookie-based auth.
 * Returns an AuthContext or a NextResponse error.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  let user: User | null = null;

  // Try Bearer token first (MP §9: Authorization: Bearer <token>)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      user = data.user;
    }
  }

  // Fall back to cookie-based auth
  if (!user) {
    const supabase = await createServerComponentClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      user = data.user;
    }
  }

  if (!user) {
    return apiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
  }

  // Check if user is an employer admin
  const serviceClient = createServiceClient();
  const { data: adminData } = await serviceClient
    .from("employer_admins")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (adminData) {
    return {
      user,
      role: "employer_admin",
      companyId: adminData.company_id,
    };
  }

  // Check if user is an employee
  const { data: employeeData } = await serviceClient
    .from("employee_profiles")
    .select("id, seat_id")
    .eq("auth_user_id", user.id)
    .single();

  if (employeeData) {
    // Check seat expiry
    const { data: seatData } = await serviceClient
      .from("seats")
      .select("expires_at, status")
      .eq("id", employeeData.seat_id)
      .single();

    if (seatData?.expires_at && new Date(seatData.expires_at) < new Date()) {
      return apiError(
        ERROR_CODES.SEAT_EXPIRED,
        "Your access window has expired. Please contact your former employer's HR team."
      );
    }

    if (seatData?.status === "expired") {
      return apiError(
        ERROR_CODES.SEAT_EXPIRED,
        "Your access window has expired. Please contact your former employer's HR team."
      );
    }

    return {
      user,
      role: "employee",
      employeeId: employeeData.id,
    };
  }

  return apiError(ERROR_CODES.UNAUTHORIZED, "No profile found for this user");
}

/**
 * Check if an auth result is an error response (not an AuthContext).
 */
export function isAuthError(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Require employee role. Returns apiError if not an employee.
 */
export function requireEmployee(auth: AuthContext) {
  if (auth.role !== "employee") {
    return apiError(ERROR_CODES.FORBIDDEN, "Employee access required");
  }
  return null;
}

/**
 * Require employer admin role. Returns apiError if not an employer admin.
 */
export function requireEmployer(auth: AuthContext) {
  if (auth.role !== "employer_admin") {
    return apiError(ERROR_CODES.FORBIDDEN, "Employer admin access required");
  }
  return null;
}
