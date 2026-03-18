import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, createServiceClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/login
 * Login with email/password via Supabase Auth.
 * Returns access_token and role for both employer admins and employees.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    // Use anon key client for sign-in (signInWithPassword needs anon, not service role)
    const supabase = createAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Invalid email or password");
    }

    // Determine role using service client (bypasses RLS)
    const serviceClient = createServiceClient();

    const { data: adminData } = await serviceClient
      .from("employer_admins")
      .select("id, company_id")
      .eq("auth_user_id", data.user.id)
      .single();

    if (adminData) {
      return NextResponse.json(
        {
          data: {
            user_id: data.user.id,
            role: "employer_admin",
            company_id: adminData.company_id,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        },
        { status: 200 }
      );
    }

    // Check if employee
    const { data: employeeData } = await serviceClient
      .from("employee_profiles")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .single();

    if (employeeData) {
      return NextResponse.json(
        {
          data: {
            user_id: data.user.id,
            role: "employee",
            employee_id: employeeData.id,
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        },
        { status: 200 }
      );
    }

    return apiError(ERROR_CODES.UNAUTHORIZED, "No profile found for this user");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
