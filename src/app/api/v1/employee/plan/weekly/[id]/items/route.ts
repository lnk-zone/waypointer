/**
 * PATCH /api/v1/employee/plan/weekly/:id/items
 *
 * Updates a specific item in a weekly plan: mark as completed or defer.
 *
 * Uses Edge Runtime — lightweight update.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";
import { type PlanItemStored } from "@/lib/plan/helpers";

// ─── Request Validation ───────────────────────────────────────────────

const updateItemSchema = z.object({
  item_index: z.number().int().min(0),
  is_completed: z.boolean().optional(),
  is_deferred: z.boolean().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────

interface WeeklyPlanRecord {
  id: string;
  employee_id: string;
  items: PlanItemStored[];
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: planId } = await params;

  if (!planId) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Plan ID is required");
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Get employee
  const { data: rawEmployee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !rawEmployee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const employee = rawEmployee as unknown as { id: string };

  // Fetch the plan
  const { data: rawPlan, error: planError } = await supabase
    .from("weekly_plans")
    .select("id, employee_id, items")
    .eq("id", planId)
    .single();

  if (planError || !rawPlan) {
    return apiError(ERROR_CODES.NOT_FOUND, "Weekly plan not found");
  }

  const plan = rawPlan as unknown as WeeklyPlanRecord;

  if (plan.employee_id !== employee.id) {
    return apiError(
      ERROR_CODES.FORBIDDEN,
      "You do not have access to this plan"
    );
  }

  // Validate item index
  const items = plan.items ?? [];
  if (input.item_index >= items.length) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Item index ${input.item_index} is out of range. Plan has ${items.length} items.`
    );
  }

  // Update the item
  const updatedItems = [...items];
  if (input.is_completed !== undefined) {
    updatedItems[input.item_index] = {
      ...updatedItems[input.item_index],
      is_completed: input.is_completed,
    };
  }
  if (input.is_deferred !== undefined) {
    updatedItems[input.item_index] = {
      ...updatedItems[input.item_index],
      is_deferred: input.is_deferred,
    };
  }

  // Persist
  const { error: updateError } = await supabase
    .from("weekly_plans")
    .update({
      items: updatedItems,
    })
    .eq("id", planId);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to update plan item"
    );
  }

  // Log activity (fire-and-forget)
  const action = input.is_completed
    ? "plan_item_completed"
    : input.is_deferred
      ? "plan_item_deferred"
      : "plan_item_updated";

  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action,
      metadata: {
        plan_id: planId,
        item_index: input.item_index,
        description: updatedItems[input.item_index].description,
      },
    })
  ).catch(() => {});

  return NextResponse.json({
    data: {
      id: planId,
      items: updatedItems,
    },
  });
}
