/**
 * POST /api/v1/employee/paths/generate
 *
 * Generates 3 AI-recommended role paths based on the employee's
 * career snapshot and preferences (MP §6 Module 2).
 *
 * Requires a confirmed career snapshot. Assembles full context
 * (snapshot + preferences) and calls the GENERATE_ROLE_PATHS prompt.
 * Persists results to the role_paths table and returns the paths.
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
import {
  generateRolePathsSchema,
  type GenerateRolePathsOutput,
} from "@/lib/validators/ai";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";

export const runtime = "edge";

const ROLE_PATH_SELECT_FIELDS =
  "id, title, category, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis, title_variations, core_keywords, ideal_company_profile, is_primary, is_custom, is_selected, sort_order";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  // Get employee and validated snapshot
  const { employee, snapshotId, error: contextError } =
    await getEmployeeAndSnapshot(supabase, auth.user.id);

  if (contextError || !employee || !snapshotId) {
    const code = (contextError?.code ?? "INTERNAL_ERROR") as keyof typeof ERROR_CODES;
    return apiError(
      ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR,
      contextError?.message ?? "Failed to load employee data"
    );
  }

  // Assemble context for AI
  const { variables } = await assemblePathContext(supabase, employee, snapshotId);

  // No rejected paths on initial generation (empty = {{#if}} block removed)
  variables.rejected_paths = "";
  variables.rejected_paths_json = "";
  variables.rejection_feedback = "";

  const sessionId = auth.user.id;

  // Execute AI pipeline
  let aiResult: GenerateRolePathsOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_ROLE_PATHS",
      variables,
      generateRolePathsSchema,
      sessionId
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Role path generation failed: ${err.message}`
        : "Failed to generate role paths"
    );
  }

  // Delete any existing non-custom paths (regeneration replaces AI paths)
  const { error: deleteError } = await supabase
    .from("role_paths")
    .delete()
    .eq("employee_id", employee.id)
    .eq("is_custom", false);

  if (deleteError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to clear previous role paths"
    );
  }

  // Persist the 3 generated paths
  const rows = aiResult.paths.map((path, index) => ({
    employee_id: employee.id,
    title: path.title,
    category: path.category,
    why_it_fits: path.why_it_fits,
    salary_band_min: path.salary_band_min,
    salary_band_max: path.salary_band_max,
    demand_level: path.demand_level,
    confidence_score: path.confidence_score,
    skills_overlap_pct: path.skills_overlap_pct,
    gap_analysis: path.gap_analysis,
    title_variations: path.title_variations,
    core_keywords: path.core_keywords,
    ideal_company_profile: path.ideal_company_profile,
    is_primary: false,
    is_custom: false,
    is_selected: false,
    sort_order: index,
  }));

  const { data: insertedPaths, error: insertError } = await supabase
    .from("role_paths")
    .insert(rows)
    .select(ROLE_PATH_SELECT_FIELDS);

  if (insertError || !insertedPaths) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save generated role paths"
    );
  }

  return NextResponse.json({ paths: insertedPaths });
}
