/**
 * GET /api/v1/employer/seats/history
 * Returns the employer's seat purchase history.
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError, requireEmployer } from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const supabase = createServiceClient();

    const { data: purchases, error } = await supabase
      .from("seat_purchases")
      .select("id, seats_purchased, price_per_seat_cents, total_amount_cents, payment_method, created_at")
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch purchase history");
    }

    return NextResponse.json({
      data: (purchases ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        seats_purchased: p.seats_purchased,
        price_per_seat: `$${((p.price_per_seat_cents as number) / 100).toFixed(0)}`,
        total: `$${((p.total_amount_cents as number) / 100).toLocaleString()}`,
        payment_method: p.payment_method,
        date: p.created_at,
      })),
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to fetch purchase history");
  }
}
