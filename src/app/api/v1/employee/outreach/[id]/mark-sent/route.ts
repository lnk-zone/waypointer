/**
 * POST /api/v1/employee/outreach/:id/mark-sent
 *
 * Marks an outreach message as sent. Updates `is_sent = true` and
 * `sent_at = NOW()`. Logs to activity_log with action `outreach_sent`.
 *
 * Per MP §9: returns { marked: true, sent_at: "iso8601" }
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

// ─── Types ───────────────────────────────────────────────────────────

interface OutreachRecord {
  id: string;
  recipient: string;
  is_sent: boolean;
  sent_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Log activity without blocking or failing the primary operation */
function logActivity(
  supabase: SupabaseClient,
  employeeId: string,
  metadata: Record<string, string>
) {
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employeeId,
      action: "outreach_sent",
      metadata,
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const { id: outreachId } = await params;

  const supabase = createServiceClient();

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Verify the outreach message exists and belongs to this employee
  const { data: rawOutreach, error: outreachError } = await supabase
    .from("outreach_messages")
    .select("id, recipient, is_sent, sent_at")
    .eq("id", outreachId)
    .eq("employee_id", employee.id)
    .single();

  if (outreachError || !rawOutreach) {
    return apiError(ERROR_CODES.NOT_FOUND, "Outreach message not found");
  }

  const outreach = rawOutreach as unknown as OutreachRecord;

  // Already marked as sent — idempotent response
  if (outreach.is_sent) {
    return NextResponse.json({
      data: {
        marked: true,
        sent_at: outreach.sent_at,
      },
    });
  }

  const now = new Date().toISOString();

  // Update is_sent and sent_at
  const { error: updateError } = await supabase
    .from("outreach_messages")
    .update({
      is_sent: true,
      sent_at: now,
      updated_at: now,
    })
    .eq("id", outreachId)
    .eq("employee_id", employee.id);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to mark outreach as sent"
    );
  }

  // Log activity (fire-and-forget)
  logActivity(supabase, employee.id, {
    outreach_id: outreachId,
    recipient: outreach.recipient,
  });

  return NextResponse.json({
    data: {
      marked: true,
      sent_at: now,
    },
  });
}
