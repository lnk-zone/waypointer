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
    employee_name: z.string().min(1, "Name is required").max(200).optional(),
    location_city: z.string().max(200).optional(),
    location_state: z.string().max(200).optional(),
    location_country: z.string().max(10).optional(),
  })
  .refine(
    (data) =>
      data.employee_name !== undefined ||
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
    .select("id, seat_id, location_city, location_state, location_country, seats(employee_name, employee_email)")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const seatsRaw = employee.seats as unknown;
  const seat = Array.isArray(seatsRaw) ? seatsRaw[0] as { employee_name: string | null; employee_email: string } | undefined : null;

  return NextResponse.json({
    data: {
      id: employee.id,
      full_name: seat?.employee_name ?? "",
      email: seat?.employee_email ?? auth.user.email ?? "",
      location_city: employee.location_city ?? "",
      location_state: employee.location_state ?? "",
      location_country: employee.location_country ?? "",
    },
  });
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
    .select("id, seat_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Update name on the seats table
  if (parsed.data.employee_name !== undefined) {
    const { error: seatError } = await supabase
      .from("seats")
      .update({
        employee_name: parsed.data.employee_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employee.seat_id);

    if (seatError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update name");
    }
  }

  // Update location on the employee_profiles table
  const profilePayload: Record<string, unknown> = {};
  if (parsed.data.location_city !== undefined) {
    profilePayload.location_city = parsed.data.location_city;
  }
  if (parsed.data.location_state !== undefined) {
    profilePayload.location_state = parsed.data.location_state;
  }
  if (parsed.data.location_country !== undefined) {
    profilePayload.location_country = parsed.data.location_country;
  }

  if (Object.keys(profilePayload).length > 0) {
    profilePayload.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("employee_profiles")
      .update(profilePayload)
      .eq("id", employee.id);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update settings");
    }
  }

  return NextResponse.json({ data: { updated: true } });
}
