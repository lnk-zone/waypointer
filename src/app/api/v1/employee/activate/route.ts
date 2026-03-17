import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, createServiceClient } from "@/lib/supabase/server";
import { activateEmployeeSchema } from "@/lib/validators/auth";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import * as jose from "jose";

export const runtime = "edge";

/**
 * POST /api/v1/employee/activate
 * Activates an employee seat — creates auth user and employee profile.
 * Public endpoint (requires valid seat token, not auth).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = activateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { seat_token, email, password, google_oauth_token } = parsed.data;
    const supabase = createServiceClient();

    // Decode the seat token (JWT signed with service role secret)
    let tokenPayload: { seat_id: string; email: string; program_id?: string };
    try {
      const secret = new TextEncoder().encode(
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { payload } = await jose.jwtVerify(seat_token, secret);
      tokenPayload = payload as unknown as typeof tokenPayload;
    } catch {
      return apiError(ERROR_CODES.INVALID_TOKEN, "Invalid or expired seat token");
    }

    // Verify email matches
    if (tokenPayload.email.toLowerCase() !== email.toLowerCase()) {
      return apiError(
        ERROR_CODES.EMAIL_MISMATCH,
        "Email does not match the invitation. Please use the email address your invitation was sent to."
      );
    }

    // Fetch the seat
    const { data: seat, error: seatError } = await supabase
      .from("seats")
      .select("id, program_id, status, employee_email")
      .eq("id", tokenPayload.seat_id)
      .single();

    if (seatError || !seat) {
      return apiError(ERROR_CODES.NOT_FOUND, "Seat not found");
    }

    // Check seat status
    if (seat.status === "expired") {
      return apiError(
        ERROR_CODES.SEAT_EXPIRED,
        "This invitation has expired. Please contact your former employer's HR team."
      );
    }

    if (seat.status !== "invited") {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "This invitation has already been used"
      );
    }

    // Get company info from the seat's company_id
    const { data: seatWithCompany } = await supabase
      .from("seats")
      .select("company_id")
      .eq("id", seat.id)
      .single();

    if (!seatWithCompany) {
      return apiError(ERROR_CODES.NOT_FOUND, "Seat company not found");
    }

    const companyId = (seatWithCompany as unknown as { company_id: string }).company_id;

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    // Get program name if program_id exists
    let programName = "Career Transition";
    if (seat.program_id) {
      const { data: prog } = await supabase
        .from("transition_programs")
        .select("name")
        .eq("id", seat.program_id)
        .single();
      if (prog) programName = (prog as unknown as { name: string }).name;
    }

    // Create Supabase Auth user
    let authUserId: string;

    if (google_oauth_token) {
      // Google OAuth flow: create user linked to Google provider
      const { data: oauthData, error: oauthError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          app_metadata: { provider: "google" },
          user_metadata: { oauth_provider: "google" },
        });

      if (oauthError) {
        if (oauthError.message.includes("already been registered")) {
          return apiError(
            ERROR_CODES.VALIDATION_ERROR,
            "An account with this email already exists. Please sign in instead."
          );
        }
        return apiError(ERROR_CODES.VALIDATION_ERROR, oauthError.message);
      }
      authUserId = oauthData.user.id;
    } else {
      // Email/password flow
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: password!,
          email_confirm: true,
        });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          return apiError(
            ERROR_CODES.VALIDATION_ERROR,
            "An account with this email already exists. Please sign in instead."
          );
        }
        return apiError(ERROR_CODES.VALIDATION_ERROR, authError.message);
      }
      authUserId = authData.user.id;
    }

    // Helper to clean up auth user on downstream failure
    const rollbackAuthUser = async () => {
      await supabase.auth.admin.deleteUser(authUserId);
    };

    const now = new Date();
    // 90 days access from activation
    const ACCESS_DURATION_DAYS = 90;
    const expiresAt = new Date(
      now.getTime() + ACCESS_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    // Update seat status
    const { error: seatUpdateError } = await supabase
      .from("seats")
      .update({
        status: "activated",
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", seat.id);

    if (seatUpdateError) {
      await rollbackAuthUser();
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Failed to activate seat");
    }

    // Create employee profile
    const { data: employeeProfile, error: profileError } = await supabase
      .from("employee_profiles")
      .insert({
        auth_user_id: authUserId,
        seat_id: seat.id,
      })
      .select("id")
      .single();

    if (profileError) {
      await rollbackAuthUser();
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Failed to create employee profile");
    }

    // Sign the user in to get a usable session token
    // For password flow, sign in with the credentials we just created
    // For OAuth flow, generate a magic link token
    let authToken = "";

    if (password) {
      const anonClient = createAnonClient();
      const { data: sessionData } = await anonClient.auth.signInWithPassword({
        email,
        password,
      });
      authToken = sessionData?.session?.access_token ?? "";
    } else {
      // For OAuth users, generate a magic link they can use to establish a session
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      authToken = linkData?.properties?.hashed_token ?? "";
    }

    // Return activation response per MP §9
    return NextResponse.json(
      {
        employee_id: employeeProfile.id,
        seat_id: seat.id,
        program_name: programName,
        company_name: company?.name ?? "",
        access_expires_at: expiresAt.toISOString(),
        auth_token: authToken,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
