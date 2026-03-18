/**
 * GET  /api/v1/employee/settings — fetch profile data for the settings page
 * PATCH /api/v1/employee/settings — update name and location fields
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

const settingsPatchSchema = z
  .object({
    full_name: z.string().min(1, "Name is required").max(200).optional(),
    location_city: z.string().max(200).optional(),
    location_state: z.string().max(200).optional(),
    location_country: z.string().max(10).optional(),
  })
  .refine(
    (data) =>
      data.full_name !== undefined ||
      data.location_city !== undefined ||
      data.location_state !== undefined ||
      data.location_country !== undefined,
    { message: "At least one field is required" }
  );

/**
 * GET /api/v1/employee/settings
 * Returns employee profile data needed for the settings page.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id, full_name, email, location_city, location_state, location_country")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  return NextResponse.json({ data: employee });
}

/**
 * PATCH /api/v1/employee/settings
 * Updates name and location fields on the employee profile.
 */
export async function PATCH(request: NextRequest) {
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

  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.full_name !== undefined) {
    updatePayload.full_name = parsed.data.full_name;
  }
  if (parsed.data.location_city !== undefined) {
    updatePayload.location_city = parsed.data.location_city;
  }
  if (parsed.data.location_state !== undefined) {
    updatePayload.location_state = parsed.data.location_state;
  }
  if (parsed.data.location_country !== undefined) {
    updatePayload.location_country = parsed.data.location_country;
  }

  const { error: updateError } = await supabase
    .from("employee_profiles")
    .update(updatePayload)
    .eq("id", employee.id);

  if (updateError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update settings");
  }

  return NextResponse.json({ data: { updated: true } });
}
