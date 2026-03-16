import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { profileSchema } from "@/lib/validators/profile";
import { z } from "zod";

const profilePatchSchema = z.object({
  seniority: z.enum([
    "entry_level", "mid_level", "senior", "staff_principal",
    "manager", "senior_manager", "director", "vp_plus",
  ]).optional(),
  management_exp: z.enum([
    "no_direct_reports", "1_to_3", "4_to_10", "10_plus",
  ]).optional(),
  level_dir: z.enum([
    "stay_current", "open_to_step_up", "open_to_step_down",
  ]).optional(),
}).refine(
  (data) => data.seniority || data.management_exp || data.level_dir,
  { message: "At least one field is required" }
);

/**
 * GET /api/v1/employee/profile
 * Returns the employee's profile data including identity fields.
 * Employee-only endpoint.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select(
      "id, seniority, management_exp, level_dir, location_city, location_state, work_pref, comp_target_min, comp_target_max, work_auth, years_of_experience, most_recent_role, most_recent_company"
    )
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  return NextResponse.json(employee);
}

/**
 * POST /api/v1/employee/profile
 * Saves the employee's identity-level inputs and preferences.
 * Employee-only endpoint.
 */
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

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();
  const data = parsed.data;

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const updatePayload: Record<string, unknown> = {
    seniority: data.seniority,
    management_exp: data.management_exp,
    level_dir: data.level_dir,
    location_city: data.location_city,
    location_state: data.location_state,
    work_pref: data.work_pref,
    comp_target_min: data.comp_target_min,
    comp_target_max: data.comp_target_max,
    work_auth: data.work_auth,
    updated_at: new Date().toISOString(),
  };

  if (data.years_of_experience !== undefined) {
    updatePayload.years_of_experience = data.years_of_experience;
  }
  if (data.most_recent_role !== undefined) {
    updatePayload.most_recent_role = data.most_recent_role;
  }
  if (data.most_recent_company !== undefined) {
    updatePayload.most_recent_company = data.most_recent_company;
  }

  const { error: updateError } = await supabase
    .from("employee_profiles")
    .update(updatePayload)
    .eq("id", employee.id);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save profile"
    );
  }

  return NextResponse.json({
    employee_id: employee.id,
    profile_complete: true,
  });
}

/**
 * PATCH /api/v1/employee/profile
 * Partial update for identity fields (seniority, management_exp, level_dir).
 * Used by the snapshot review screen to update individual identity dropdowns.
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

  const parsed = profilePatchSchema.safeParse(body);
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
  if (parsed.data.seniority !== undefined) updatePayload.seniority = parsed.data.seniority;
  if (parsed.data.management_exp !== undefined) updatePayload.management_exp = parsed.data.management_exp;
  if (parsed.data.level_dir !== undefined) updatePayload.level_dir = parsed.data.level_dir;

  const { error: updateError } = await supabase
    .from("employee_profiles")
    .update(updatePayload)
    .eq("id", employee.id);

  if (updateError) {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to update profile");
  }

  return NextResponse.json({ updated: true });
}
