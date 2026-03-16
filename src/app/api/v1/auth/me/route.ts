import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/api/auth-middleware";

/**
 * GET /api/v1/auth/me
 * Returns the current user's profile and role.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (isAuthError(auth)) {
    return auth;
  }

  return NextResponse.json({
    user_id: auth.user.id,
    email: auth.user.email,
    role: auth.role,
    ...(auth.employeeId && { employee_id: auth.employeeId }),
    ...(auth.companyId && { company_id: auth.companyId }),
  });
}
