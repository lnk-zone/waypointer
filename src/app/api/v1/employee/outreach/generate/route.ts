/**
 * POST /api/v1/employee/outreach/generate
 *
 * Generates context-aware outreach messages using the GENERATE_OUTREACH
 * AI pipeline (PR Prompt 11). Supports multiple recipient types and tones.
 *
 * Uses Edge Runtime for lower cold start (single AI call proxy).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import {
  generateOutreachSchema,
  type GenerateOutreachOutput,
} from "@/lib/validators/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Request Validation ──────────────────────────────────────────────

const RECIPIENT_TYPES = [
  "recruiter",
  "hiring_manager",
  "former_colleague",
  "alumni",
  "referral_request",
  "follow_up",
] as const;

const RELATIONSHIP_STRENGTHS = ["cold", "warm", "close"] as const;
const TONES = ["warm", "formal"] as const;

const generateRequestSchema = z.object({
  recipient: z.enum(RECIPIENT_TYPES),
  role_path_id: z.string().uuid(),
  job_match_id: z.string().uuid().optional(),
  company_or_job_context: z.string().optional(),
  relationship: z.enum(RELATIONSHIP_STRENGTHS),
  personal_context: z.string().optional(),
  tone: z.enum(TONES).optional(),
});

// ─── Types ───────────────────────────────────────────────────────────

interface OutreachRow {
  id: string;
  employee_id: string;
  recipient: string;
  role_path_id: string | null;
  job_match_id: string | null;
  relationship: string;
  personal_context: string | null;
  tone: string;
  linkedin_message: string | null;
  email_message: string | null;
  followup_message: string | null;
  guidance: Record<string, string> | null;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const RECIPIENT_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  former_colleague: "Former Colleague",
  alumni: "Alumni Network Contact",
  referral_request: "Referral Request",
  follow_up: "Follow-up After Application",
};

// ─── Route Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Get employee and snapshot
  const {
    employee,
    snapshotId,
    error: empError,
  } = await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (empError || !employee || !snapshotId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      empError?.message ?? "Employee profile not found"
    );
  }

  // Get the role path
  const { data: rolePath, error: pathError } = await supabase
    .from("role_paths")
    .select("id, title")
    .eq("id", input.role_path_id)
    .eq("employee_id", employee.id)
    .single();

  if (pathError || !rolePath) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Select a role you're pursuing so we can personalize the message."
    );
  }

  // Build company/job context
  let companyOrJobContext = input.company_or_job_context ?? "";
  if (input.job_match_id && !companyOrJobContext) {
    const { data: matchData } = await supabase
      .from("job_matches")
      .select("job_listings!inner(title, company_name)")
      .eq("id", input.job_match_id)
      .eq("employee_id", employee.id)
      .single();

    if (matchData) {
      const listing = matchData.job_listings as unknown as {
        title: string;
        company_name: string;
      };
      companyOrJobContext = `${listing.title} at ${listing.company_name}`;
    }
  }

  // Assemble career context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  // Build variables for the prompt template (spread base variables from context)
  const variables: Record<string, string> = {
    ...context.variables,
    recipient_type: RECIPIENT_LABELS[input.recipient] ?? input.recipient,
    role_path_title: rolePath.title,
    company_or_job_context: companyOrJobContext || "Not specified",
    relationship_strength: input.relationship,
    personal_context: input.personal_context ?? "None provided",
    tone: input.tone ?? "warm",
  };

  // Call AI pipeline
  let aiResult: GenerateOutreachOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_OUTREACH",
      variables,
      generateOutreachSchema,
      auth.user.id
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Outreach generation failed: ${err.message}`
        : "Failed to generate outreach messages"
    );
  }

  // Persist to outreach_messages table
  const { data: rawOutreach, error: insertError } = await supabase
    .from("outreach_messages")
    .insert({
      employee_id: employee.id,
      recipient: input.recipient,
      role_path_id: input.role_path_id,
      job_match_id: input.job_match_id ?? null,
      relationship: input.relationship,
      personal_context: input.personal_context ?? null,
      tone: input.tone ?? "warm",
      linkedin_message: aiResult.linkedin_message,
      email_message: aiResult.email_message,
      followup_message: aiResult.followup_message,
      guidance: aiResult.guidance,
    })
    .select("*")
    .single();

  if (insertError || !rawOutreach) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save outreach messages"
    );
  }

  const outreach = rawOutreach as unknown as OutreachRow;

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "outreach_generated",
      metadata: {
        recipient: input.recipient,
        role_path_title: rolePath.title,
        tone: input.tone,
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: {
      outreach_id: outreach.id,
      linkedin_message: outreach.linkedin_message,
      email_message: outreach.email_message,
      followup_message: outreach.followup_message,
      guidance: outreach.guidance,
      created_at: outreach.created_at,
    },
  });
}
