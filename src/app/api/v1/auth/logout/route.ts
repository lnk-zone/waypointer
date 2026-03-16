import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

/**
 * POST /api/v1/auth/logout
 * Signs out the current user and clears the session.
 */
export async function POST() {
  try {
    const supabase = await createServerComponentClient();

    // Verify user is authenticated before signing out
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Failed to sign out");
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
