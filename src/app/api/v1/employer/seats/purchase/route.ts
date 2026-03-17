/**
 * POST /api/v1/employer/seats/purchase
 * Processes a seat purchase (simulated payment).
 * Creates a seat_purchases record and credits seats to the company account.
 */
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError, requireEmployer } from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { seatPurchaseSchema } from "@/lib/validators/program";
import { calculateTotal } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const roleError = requireEmployer(auth);
  if (roleError) return roleError;
  if (!auth.companyId) {
    return apiError(ERROR_CODES.NOT_FOUND, "No company found.");
  }

  try {
    const body = await request.json();
    const parsed = seatPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid purchase data", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { quantity } = parsed.data;
    const pricing = calculateTotal(quantity);
    const supabase = createServiceClient();

    // Create purchase record
    const { error: purchaseError } = await supabase
      .from("seat_purchases")
      .insert({
        company_id: auth.companyId,
        seats_purchased: quantity,
        price_per_seat_cents: pricing.pricePerSeatCents,
        total_amount_cents: pricing.totalCents,
        payment_method: "simulated",
      });

    if (purchaseError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to record purchase");
    }

    // Credit seats: fetch current, then update (atomic enough for simulated payment)
    const { data: currentCompany } = await supabase
      .from("companies")
      .select("total_seats_purchased")
      .eq("id", auth.companyId)
      .single();

    const current = (currentCompany as { total_seats_purchased: number } | null)?.total_seats_purchased ?? 0;

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        total_seats_purchased: current + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.companyId);

    if (updateError) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to credit seats");
    }

    // Fetch updated balance
    const { data: updatedCompany } = await supabase
      .from("companies")
      .select("total_seats_purchased, total_seats_assigned")
      .eq("id", auth.companyId)
      .single();

    const uc = updatedCompany as { total_seats_purchased: number; total_seats_assigned: number } | null;

    return NextResponse.json({
      data: {
        seats_purchased: quantity,
        price_per_seat: pricing.pricePerSeatDisplay,
        total: pricing.totalDisplay,
        balance: {
          total_purchased: uc?.total_seats_purchased ?? current + quantity,
          total_assigned: uc?.total_seats_assigned ?? 0,
          available: (uc?.total_seats_purchased ?? current + quantity) - (uc?.total_seats_assigned ?? 0),
        },
      },
    });
  } catch {
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to process purchase");
  }
}
