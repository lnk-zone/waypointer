/**
 * GET /api/v1/employee/outreach
 *
 * Lists all outreach messages for the authenticated employee with pagination.
 * Ordered by most recently created first. Includes sent/unsent status
 * and associated role path title.
 *
 * Query params: ?page=1&per_page=20
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

// ─── Types ───────────────────────────────────────────────────────────

interface OutreachRow {
  id: string;
  recipient: string;
  role_path_id: string | null;
  job_match_id: string | null;
  relationship: string;
  tone: string;
  linkedin_message: string | null;
  email_message: string | null;
  followup_message: string | null;
  guidance: Record<string, string> | null;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
  role_paths: { title: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

// ─── Route Handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Parse pagination params
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(
    DEFAULT_PAGE,
    parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE
  );
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, parseInt(searchParams.get("per_page") ?? String(DEFAULT_PER_PAGE), 10) || DEFAULT_PER_PAGE)
  );

  // Get employee
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Count total and sent
  const { count: totalCount, error: countError } = await supabase
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employee.id);

  if (countError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to count outreach messages"
    );
  }

  const total = totalCount ?? 0;

  const { count: sentCountRaw } = await supabase
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employee.id)
    .eq("is_sent", true);

  const sentCount = sentCountRaw ?? 0;

  // Fetch paginated outreach messages with role path title
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: rawMessages, error: fetchError } = await supabase
    .from("outreach_messages")
    .select(
      "id, recipient, role_path_id, job_match_id, relationship, tone, linkedin_message, email_message, followup_message, guidance, is_sent, sent_at, created_at, role_paths(title)"
    )
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (fetchError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to fetch outreach messages"
    );
  }

  const messages = (rawMessages as unknown as OutreachRow[]) ?? [];

  const formatted = messages.map((m) => ({
    id: m.id,
    recipient: m.recipient,
    role_path_title: m.role_paths?.title ?? null,
    relationship: m.relationship,
    tone: m.tone,
    linkedin_message: m.linkedin_message,
    email_message: m.email_message,
    followup_message: m.followup_message,
    guidance: m.guidance,
    is_sent: m.is_sent,
    sent_at: m.sent_at,
    created_at: m.created_at,
  }));

  const totalPages = Math.ceil(total / perPage);

  return NextResponse.json({
    data: formatted,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
    meta: {
      sent_count: sentCount,
    },
  });
}
