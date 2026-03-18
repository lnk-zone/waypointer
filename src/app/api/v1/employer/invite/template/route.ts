/**
 * GET /api/v1/employer/invite/template
 *
 * Returns a downloadable CSV template for employee invitations.
 * Columns: employee_name, email, department, role_family, last_day
 *
 * Uses Edge Runtime — lightweight response.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";

const CSV_TEMPLATE = `employee_name,email,department,role_family,last_day
Jane Smith,jane@example.com,Engineering,Software Engineer,2026-04-15
John Doe,john@example.com,Customer Success,CSM,2026-04-30
`;

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="waypointer-invite-template.csv"',
    },
  });
}
