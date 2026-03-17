import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, createServiceClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validators/auth";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "edge";

/**
 * POST /api/v1/auth/signup
 * Register a new employer admin with company.
 * Creates auth user, company record, and employer_admin record.
 * Returns session tokens on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { full_name, email, company_name, password } = parsed.data;

    const supabase = createServiceClient();

    // Step 1: Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists")) {
        return apiError(
          ERROR_CODES.CONFLICT,
          "An account with this email already exists"
        );
      }
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create user");
    }

    // Step 2: Create company record
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name })
      .select("id")
      .single();

    if (companyError) {
      // Clean up: delete the auth user we just created
      await supabase.auth.admin.deleteUser(authData.user.id);
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to create company");
    }

    // Step 3: Create employer_admin record
    const { error: adminError } = await supabase
      .from("employer_admins")
      .insert({
        auth_user_id: authData.user.id,
        company_id: company.id,
        full_name,
        email,
      });

    if (adminError) {
      // Clean up: delete company and auth user
      await supabase.from("companies").delete().eq("id", company.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create admin profile"
      );
    }

    // Step 4: Sign in to get session tokens
    const anonClient = createAnonClient();
    const { data: session, error: sessionError } =
      await anonClient.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError) {
      // Records are created successfully but session failed — return success without tokens
      return NextResponse.json(
        {
          data: {
            user_id: authData.user.id,
            role: "employer_admin",
            company_id: company.id,
            access_token: null,
            refresh_token: null,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        data: {
          user_id: authData.user.id,
          role: "employer_admin",
          company_id: company.id,
          access_token: session.session?.access_token ?? null,
          refresh_token: session.session?.refresh_token ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
