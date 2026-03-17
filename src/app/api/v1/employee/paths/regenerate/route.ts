/**
 * POST /api/v1/employee/paths/regenerate
 *
 * Regenerates role paths, excluding previously rejected paths.
 * Uses the same GENERATE_ROLE_PATHS prompt with rejected_paths
 * context added via {{#if rejected_paths}} conditional block.
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
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  rejected_path_ids: z.array(z.string().uuid()).min(1),
  feedback: z.string().max(1000).optional(),
});

const ROLE_PATH_SELECT_FIELDS =
  "id, title, category, why_it_fits, salary_band_min, salary_band_max, demand_level, confidence_score, skills_overlap_pct, gap_analysis, title_variations, core_keywords, ideal_company_profile, is_primary, is_custom, is_selected, sort_order";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();
  const { rejected_path_ids, feedback } = parsed.data;

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

  // Fetch the rejected paths to include as context
  const { data: rejectedPaths } = await supabase
    .from("role_paths")
    .select("title, category, why_it_fits")
    .in("id", rejected_path_ids)
    .eq("employee_id", employee.id);

  // Assemble context for AI
  const { variables } = await assemblePathContext(supabase, employee, snapshotId);

  // Add rejected paths context for the {{#if rejected_paths}} block
  variables.rejected_paths = rejectedPaths && rejectedPaths.length > 0 ? "true" : "";
  variables.rejected_paths_json = JSON.stringify(rejectedPaths ?? []);
  variables.rejection_feedback = feedback ?? "";

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
        ? `Path regeneration failed: ${err.message}`
        : "Failed to regenerate role paths"
    );
  }

  // Get the current max sort_order before modifying paths
  const { data: existingPaths } = await supabase
    .from("role_paths")
    .select("sort_order")
    .eq("employee_id", employee.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const startSortOrder = (existingPaths?.[0]?.sort_order ?? -1) + 1;

  // Insert new paths first (before deleting old ones) to avoid data loss
  // if the insert fails
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
    sort_order: startSortOrder + index,
  }));

  const { data: insertedPaths, error: insertError } = await supabase
    .from("role_paths")
    .insert(rows)
    .select(ROLE_PATH_SELECT_FIELDS);

  if (insertError || !insertedPaths) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save regenerated role paths"
    );
  }

  // Delete old non-custom, non-selected paths now that new ones are saved
  await supabase
    .from("role_paths")
    .delete()
    .eq("employee_id", employee.id)
    .eq("is_custom", false)
    .eq("is_selected", false)
    .not("id", "in", `(${insertedPaths.map((p) => p.id).join(",")})`);

  // Return all current paths (custom + selected + new) for full UI refresh
  const { data: allPaths, error: allError } = await supabase
    .from("role_paths")
    .select(ROLE_PATH_SELECT_FIELDS)
    .eq("employee_id", employee.id)
    .order("sort_order", { ascending: true });

  if (allError) {
    // Non-critical: return just the new paths
    return NextResponse.json({ paths: insertedPaths });
  }

  return NextResponse.json({ paths: allPaths });
}
