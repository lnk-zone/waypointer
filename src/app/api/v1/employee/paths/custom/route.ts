/**
 * POST /api/v1/employee/paths/custom
 *
 * Generates a single AI-analyzed role path card for a user-specified
 * target role title. Uses the same system prompt as GENERATE_ROLE_PATHS
 * but with a modified user prompt requesting analysis of one specific role.
 * Persists with is_custom = true.
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
  fetchPrompt,
  injectVariables,
  callClaude,
  parseStructuredOutput,
} from "@/lib/ai/pipeline";
import { generateSingleRolePathSchema } from "@/lib/validators/ai";
import {
  getEmployeeAndSnapshot,
  assemblePathContext,
} from "@/lib/api/paths-helpers";
import { z } from "zod";
import type { AIModelConfig } from "@/types/ai";

export const runtime = "edge";

const requestSchema = z.object({
  title: z.string().min(1).max(200),
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
  const { title } = parsed.data;

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

  // Fetch the GENERATE_ROLE_PATHS prompt for its system prompt and config
  const prompt = await fetchPrompt("GENERATE_ROLE_PATHS");

  // Build a custom user prompt for a single role analysis
  // Note: We use string concatenation for the title to avoid ${{ being parsed
  // as a template literal expression when mixed with Handlebars {{variables}}
  const customUserTemplate =
    "Analyze this specific target role for this candidate and generate a detailed assessment.\n\n" +
    "Target role: " + title + "\n\n" +
    "Career snapshot:\n---\n{{career_snapshot_json}}\n---\n\n" +
    "Preferences:\n" +
    "- Seniority: {{seniority}}\n" +
    "- Management experience: {{management_exp}}\n" +
    "- Level direction: {{level_dir}}\n" +
    "- Location: {{location_city}}, {{location_state}}\n" +
    "- Work preference: {{work_pref}}\n" +
    "- Compensation target: ${{comp_target_min}} - ${{comp_target_max}}\n" +
    "- Years of experience: {{years_of_experience}}\n\n" +
    'Return a JSON object with a single "path" key:\n\n' +
    "{\n" +
    '  "path": {\n' +
    '    "title": "The exact role title specified above, potentially refined with company type context",\n' +
    '    "category": "The broad function category",\n' +
    '    "why_it_fits": "Two to three sentences explaining how this person\'s experience maps to this role. Be honest about fit — if it\'s a stretch, say so.",\n' +
    '    "salary_band_min": number,\n' +
    '    "salary_band_max": number,\n' +
    '    "demand_level": "high | medium | low",\n' +
    '    "confidence_score": 0.0-1.0,\n' +
    '    "skills_overlap_pct": 0-100,\n' +
    '    "gap_analysis": "One to two sentences describing any skills or experience gaps for this specific role.",\n' +
    '    "title_variations": ["Alternative job titles to search for"],\n' +
    '    "core_keywords": ["Keywords that should appear in job listings for this role"],\n' +
    '    "ideal_company_profile": "One sentence describing the type of company where this role would be the best fit"\n' +
    "  }\n" +
    "}\n\n" +
    "Salary bands should reflect the candidate's location and seniority. Be realistic, not optimistic.";

  const customUserPrompt = injectVariables(customUserTemplate, variables);

  const config: AIModelConfig = {
    model: prompt.model,
    maxTokens: prompt.max_tokens,
    temperature: prompt.temperature,
  };

  try {
    const response = await callClaude(prompt.system_prompt, customUserPrompt, config);
    const result = parseStructuredOutput(response.text, generateSingleRolePathSchema);

    // Get the current max sort_order for this employee
    const { data: existingPaths } = await supabase
      .from("role_paths")
      .select("sort_order")
      .eq("employee_id", employee.id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = (existingPaths?.[0]?.sort_order ?? -1) + 1;

    // Persist the custom path
    const { data: insertedPath, error: insertError } = await supabase
      .from("role_paths")
      .insert({
        employee_id: employee.id,
        title: result.path.title,
        category: result.path.category,
        why_it_fits: result.path.why_it_fits,
        salary_band_min: result.path.salary_band_min,
        salary_band_max: result.path.salary_band_max,
        demand_level: result.path.demand_level,
        confidence_score: result.path.confidence_score,
        skills_overlap_pct: result.path.skills_overlap_pct,
        gap_analysis: result.path.gap_analysis,
        title_variations: result.path.title_variations,
        core_keywords: result.path.core_keywords,
        ideal_company_profile: result.path.ideal_company_profile,
        is_primary: false,
        is_custom: true,
        is_selected: false,
        sort_order: nextSortOrder,
      })
      .select(ROLE_PATH_SELECT_FIELDS)
      .single();

    if (insertError || !insertedPath) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to save custom role path"
      );
    }

    return NextResponse.json(insertedPath);
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Custom path generation failed: ${err.message}`
        : "Failed to generate custom role path"
    );
  }
}
