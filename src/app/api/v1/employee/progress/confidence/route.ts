/**
 * POST /api/v1/employee/progress/confidence
 *
 * Records a weekly confidence check-in (1–5 scale). One check-in per week
 * enforced by a unique constraint on (employee_id, week_number).
 *
 * Uses Edge Runtime — lightweight write.
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { getWeekNumber } from "@/lib/plan/helpers";
import { z } from "zod";

// ─── Request Validation ───────────────────────────────────────────────

const confidenceSchema = z.object({
  score: z.number().int().min(1).max(5),
});

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = confidenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Score must be an integer between 1 and 5", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const { score } = parsed.data;

  try {
    const supabase = createServiceClient();

    // Get employee profile
    const { data: rawEmployee, error: empError } = await supabase
      .from("employee_profiles")
      .select("id, created_at")
      .eq("auth_user_id", auth.user.id)
      .single();

    if (empError || !rawEmployee) {
      return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
    }

    const employee = rawEmployee as unknown as { id: string; created_at: string };
    const weekNumber = getWeekNumber(employee.created_at);

    // Insert confidence check-in (unique constraint rejects duplicates)
    const { data: rawCheckin, error: insertError } = await supabase
      .from("confidence_checkins")
      .insert({
        employee_id: employee.id,
        score,
        week_number: weekNumber,
      })
      .select("id, score, week_number, created_at")
      .single();

    if (insertError) {
      // Check for unique constraint violation (duplicate check-in this week)
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate") ||
        insertError.message?.includes("unique")
      ) {
        // Update existing check-in for this week instead
        const { data: rawUpdated, error: updateError } = await supabase
          .from("confidence_checkins")
          .update({ score })
          .eq("employee_id", employee.id)
          .eq("week_number", weekNumber)
          .select("id, score, week_number, created_at")
          .single();

        if (updateError || !rawUpdated) {
          return apiError(
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to update confidence check-in"
          );
        }

        const updated = rawUpdated as unknown as {
          id: string;
          score: number;
          week_number: number;
          created_at: string;
        };

        return NextResponse.json({
          data: {
            id: updated.id,
            score: updated.score,
            week_number: updated.week_number,
            created_at: updated.created_at,
            updated: true,
          },
        });
      }

      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to save confidence check-in"
      );
    }

    const checkin = rawCheckin as unknown as {
      id: string;
      score: number;
      week_number: number;
      created_at: string;
    };

    // Log activity (fire-and-forget)
    Promise.resolve(
      supabase.from("activity_log").insert({
        employee_id: employee.id,
        action: "confidence_checkin",
        metadata: {
          score,
          week_number: weekNumber,
        },
      })
    ).catch(() => {});

    return NextResponse.json({
      data: {
        id: checkin.id,
        score: checkin.score,
        week_number: checkin.week_number,
        created_at: checkin.created_at,
        updated: false,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save confidence check-in"
    );
  }
}
