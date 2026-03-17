/**
 * POST /api/v1/employee/linkedin/generate
 *
 * Generates LinkedIn profile optimization content using the GENERATE_LINKEDIN
 * AI pipeline. Persists results to linkedin_content table.
 *
 * Uses Edge Runtime for lower cold start (AI proxy route per CLAUDE.md Rule 6).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { executeAIPipeline } from "@/lib/ai/pipeline";
import { generateLinkedInSchema } from "@/lib/validators/ai";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Get employee and snapshot
  const { employee, snapshotId, error: empError } =
    await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (empError || !employee || !snapshotId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      empError?.message ?? "Employee profile not found"
    );
  }

  // Get primary role path
  const { data: primaryPath, error: pathError } = await supabase
    .from("role_paths")
    .select("id, title, match_score, gap_analysis, core_keywords, seniority_fit")
    .eq("employee_id", employee.id)
    .eq("is_primary", true)
    .single();

  if (pathError || !primaryPath) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No primary role path found. Please select a primary role path first."
    );
  }

  // Assemble career context
  const context = await assemblePathContext(supabase, employee, snapshotId);

  // Add primary path JSON to variables
  const variables: Record<string, string> = {
    ...context.variables,
    primary_path_json: JSON.stringify(primaryPath),
  };

  // Execute AI pipeline
  try {
    const result = await executeAIPipeline(
      "GENERATE_LINKEDIN",
      variables,
      generateLinkedInSchema,
      auth.user.id
    );

    // Upsert into linkedin_content (one per employee)
    const { error: upsertError } = await supabase
      .from("linkedin_content")
      .upsert(
        {
          employee_id: employee.id,
          headline: result.headline,
          about_section: result.about_section,
          experience_bullets: result.experience_bullets,
          featured_suggestions: result.featured_suggestions,
          skill_recommendations: result.skill_recommendations,
          open_to_work_guidance: result.open_to_work_guidance,
          recruiter_tips: result.recruiter_tips,
          is_marked_updated: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id" }
      );

    if (upsertError) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to save LinkedIn content"
      );
    }

    return NextResponse.json({
      data: {
        headline: result.headline,
        about_section: result.about_section,
        experience_bullets: result.experience_bullets,
        featured_suggestions: result.featured_suggestions,
        skill_recommendations: result.skill_recommendations,
        open_to_work_guidance: result.open_to_work_guidance,
        recruiter_tips: result.recruiter_tips,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "LinkedIn content generation failed";
    return apiError(ERROR_CODES.AI_ERROR, message);
  }
}
