/**
 * POST /api/v1/employee/plan/generate
 *
 * Generates a transition plan using the GENERATE_TRANSITION_PLAN prompt.
 * Assembles career snapshot + selected role paths + preferences as context.
 * Persists the result to the transition_plans table.
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
  generateTransitionPlanSchema,
  type GenerateTransitionPlanOutput,
} from "@/lib/validators/ai";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";

export const runtime = "edge";
export const maxDuration = 60;

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

  // Fetch selected role paths (primary + secondary)
  const { data: selectedPaths, error: pathsError } = await supabase
    .from("role_paths")
    .select(
      "id, title, category, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis, is_primary"
    )
    .eq("employee_id", employee.id)
    .eq("is_selected", true)
    .order("is_primary", { ascending: false });

  if (pathsError || !selectedPaths || selectedPaths.length === 0) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "No role paths selected. Please select at least one target path first."
    );
  }

  // Split into primary and secondary
  const primaryPath = selectedPaths.find((p) => p.is_primary) ?? selectedPaths[0];
  const secondaryPaths = selectedPaths.filter((p) => p.id !== primaryPath.id);

  // Assemble career snapshot context
  const { variables } = await assemblePathContext(supabase, employee, snapshotId);

  // Add path-specific variables for the transition plan prompt
  variables.primary_path_json = JSON.stringify({
    title: primaryPath.title,
    category: primaryPath.category,
    why_it_fits: primaryPath.why_it_fits,
    salary_band_min: primaryPath.salary_band_min,
    salary_band_max: primaryPath.salary_band_max,
    demand_level: primaryPath.demand_level,
    confidence_score: primaryPath.confidence_score,
    skills_overlap_pct: primaryPath.skills_overlap_pct,
    gap_analysis: primaryPath.gap_analysis,
  });

  variables.secondary_paths_json =
    secondaryPaths.length > 0
      ? JSON.stringify(
          secondaryPaths.map((p) => ({
            title: p.title,
            category: p.category,
            why_it_fits: p.why_it_fits,
            demand_level: p.demand_level,
            confidence_score: p.confidence_score,
          }))
        )
      : "None selected";

  const sessionId = auth.user.id;

  // Execute AI pipeline
  let aiResult: GenerateTransitionPlanOutput;
  try {
    aiResult = await executeAIPipeline(
      "GENERATE_TRANSITION_PLAN",
      variables,
      generateTransitionPlanSchema,
      sessionId
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Transition plan generation failed: ${err.message}`
        : "Failed to generate transition plan"
    );
  }

  // Upsert to transition_plans (employee_id is UNIQUE, so upsert on conflict)
  const { data: plan, error: upsertError } = await supabase
    .from("transition_plans")
    .upsert(
      {
        employee_id: employee.id,
        search_strategy: aiResult.search_strategy,
        readiness_score: aiResult.readiness_score,
        readiness_breakdown: aiResult.readiness_breakdown,
        first_week_plan: aiResult.first_week_plan,
        suggested_timeline: aiResult.suggested_timeline,
      },
      { onConflict: "employee_id" }
    )
    .select("id, search_strategy, readiness_score, readiness_breakdown, first_week_plan, suggested_timeline")
    .single();

  if (upsertError || !plan) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save transition plan"
    );
  }

  return NextResponse.json({
    plan_id: plan.id,
    search_strategy: plan.search_strategy,
    readiness_score: plan.readiness_score,
    readiness_breakdown: plan.readiness_breakdown,
    first_week_plan: plan.first_week_plan,
    suggested_timeline: plan.suggested_timeline,
    selected_paths: selectedPaths.map((p) => ({
      id: p.id,
      title: p.title,
      is_primary: p.is_primary,
    })),
  });
}
