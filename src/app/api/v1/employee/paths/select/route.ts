/**
 * POST /api/v1/employee/paths/select
 *
 * Persists the employee's role path selections (primary + secondary).
 * Uses an atomic RPC function to clear and set selections in one transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";

export const runtime = "nodejs";

const selectSchema = z.object({
  primary_path_id: z.string().uuid(),
  secondary_path_ids: z.array(z.string().uuid()).default([]),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = selectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();
  const { primary_path_id, secondary_path_ids } = parsed.data;

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Atomically clear and set selections via RPC
  const { data: updatedCount, error: rpcError } = await supabase.rpc(
    "select_role_paths",
    {
      p_employee_id: employee.id,
      p_primary_path_id: primary_path_id,
      p_secondary_path_ids: secondary_path_ids,
    }
  );

  if (rpcError) {
    // RPC raises P0002 when path IDs don't belong to the employee
    if (rpcError.message.includes("not found for this employee")) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "One or more selected paths were not found"
      );
    }
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save selections");
  }

  return NextResponse.json({
    paths_selected: true,
    selected_count: updatedCount ?? (1 + secondary_path_ids.length),
  });
}
