/**
 * GET /api/v1/employee/interviews/prep
 *
 * Generates role-specific interview preparation materials using the
 * GENERATE_INTERVIEW_PREP AI pipeline (PR Prompt 14).
 *
 * Query params: ?path_id=uuid&job_match_id=uuid (both optional)
 * If path_id is omitted, uses the primary role path.
 * If job_match_id is provided, includes company-specific prep.
 *
 * Uses Edge Runtime for lower cold start (single AI call proxy).
 */

export const runtime = "nodejs";
export const maxDuration = 60;

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
  generateInterviewPrepSchema,
  type GenerateInterviewPrepOutput,
} from "@/lib/validators/ai";

// ─── Types ───────────────────────────────────────────────────────────

interface RolePathRow {
  id: string;
  title: string;
  is_primary: boolean;
}

interface JobMatchRow {
  id: string;
  job_listings: {
    title: string;
    company_name: string;
    description: string | null;
  };
}

// ─── Route Handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const pathId = searchParams.get("path_id");
  const jobMatchId = searchParams.get("job_match_id");

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

  // Get the target role path
  let rolePath: RolePathRow | null = null;

  if (pathId) {
    const { data: rawPath } = await supabase
      .from("role_paths")
      .select("id, title, is_primary")
      .eq("id", pathId)
      .eq("employee_id", employee.id)
      .single();

    rolePath = rawPath as unknown as RolePathRow | null;
  } else {
    // Default to primary path
    const { data: rawPath } = await supabase
      .from("role_paths")
      .select("id, title, is_primary")
      .eq("employee_id", employee.id)
      .eq("is_primary", true)
      .single();

    rolePath = rawPath as unknown as RolePathRow | null;
  }

  if (!rolePath) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No role path found. Complete role targeting first."
    );
  }

  // Get the full role path details for the prompt
  const { data: rawPathDetails } = await supabase
    .from("role_paths")
    .select("id, title, match_score, is_primary, reasoning")
    .eq("id", rolePath.id)
    .single();

  const rolePathJson = JSON.stringify(rawPathDetails ?? { title: rolePath.title });

  // Build company context if job_match_id provided
  let companyName = "";
  let jobTitle = "";
  let jobDescription = "";
  let hasCompanyContext = false;

  if (jobMatchId) {
    const { data: rawMatch } = await supabase
      .from("job_matches")
      .select("id, job_listings!inner(title, company_name, description)")
      .eq("id", jobMatchId)
      .eq("employee_id", employee.id)
      .single();

    if (rawMatch) {
      const match = rawMatch as unknown as JobMatchRow;
      companyName = match.job_listings.company_name;
      jobTitle = match.job_listings.title;
      jobDescription = match.job_listings.description ?? "";
      hasCompanyContext = true;
    }
  }

  // Assemble career context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  // Build variables for the prompt template
  const variables: Record<string, string> = {
    ...context.variables,
    role_path_json: rolePathJson,
    company_name: companyName,
    job_title: jobTitle,
    job_description: jobDescription,
    company_context: hasCompanyContext ? "true" : "",
  };

  // Call AI pipeline
  let aiResult: GenerateInterviewPrepOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_INTERVIEW_PREP",
      variables,
      generateInterviewPrepSchema,
      auth.user.id
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Interview prep generation failed: ${err.message}`
        : "Failed to generate interview prep materials"
    );
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "interview_prep_generated",
      metadata: {
        role_path_title: rolePath.title,
        ...(hasCompanyContext ? { company_name: companyName, job_title: jobTitle } : {}),
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: {
      role_path: {
        id: rolePath.id,
        title: rolePath.title,
      },
      ...(hasCompanyContext
        ? { company_context: { company_name: companyName, job_title: jobTitle } }
        : {}),
      common_questions: aiResult.common_questions,
      behavioral_questions: aiResult.behavioral_questions,
      company_specific: aiResult.company_specific,
      strengths_to_emphasize: aiResult.strengths_to_emphasize,
      weak_spots_to_prepare: aiResult.weak_spots_to_prepare,
      compensation_prep: aiResult.compensation_prep,
    },
  });
}
