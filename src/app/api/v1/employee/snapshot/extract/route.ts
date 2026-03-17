/**
 * POST /api/v1/employee/snapshot/extract
 *
 * Triggers the 3-pass AI extraction pipeline on the employee's uploaded resume:
 * 1. EXTRACT_STRUCTURAL — raw facts (work history, skills, tools, education)
 * 2. EXTRACT_SEMANTIC — inferred analysis (industries, trajectory, narrative)
 * 3. EXTRACT_ACHIEVEMENTS — achievement statements with impact tagging
 *
 * Persists results to database tables and returns the full snapshot.
 * Uses Node.js runtime (pdf-parse and mammoth require Node APIs).
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
  extractTextFromStorage,
  TextExtractionError,
} from "@/lib/ai/extract-text";
import {
  extractStructuralSchema,
  extractSemanticSchema,
  extractAchievementsSchema,
  type ExtractStructuralOutput,
  type ExtractSemanticOutput,
  type ExtractAchievementsOutput,
} from "@/lib/validators/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // 3-pass AI extraction needs time

const requestSchema = z.object({
  source: z.enum(["resume_upload", "linkedin_import"]),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse request body
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

  // Get employee profile with resume path and identity inputs
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select(
      "id, uploaded_resume_url, seniority, management_exp, level_dir"
    )
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  if (!employee.uploaded_resume_url) {
    return apiError(
      ERROR_CODES.NO_RESUME_UPLOADED,
      "No resume has been uploaded. Please upload a resume first."
    );
  }

  // Extract text from the uploaded file
  let resumeText: string;
  try {
    resumeText = await extractTextFromStorage(employee.uploaded_resume_url);
  } catch (err) {
    if (err instanceof TextExtractionError) {
      return apiError(ERROR_CODES.EXTRACTION_FAILED, err.message);
    }
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to read resume file. Please try uploading again."
    );
  }

  // Session ID for concurrency limiting
  const sessionId = auth.user.id;

  // Pass 1 — EXTRACT_STRUCTURAL
  let structural: ExtractStructuralOutput;
  try {
    structural = await executeAIPipeline(
      "EXTRACT_STRUCTURAL",
      { resume_text: resumeText },
      extractStructuralSchema,
      sessionId
    );
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Extraction failed: ${err.message}`
        : "Failed to extract career data from resume"
    );
  }

  // Pass 2 + 3 — Run in parallel (both depend on structural, not each other)
  let semantic: ExtractSemanticOutput;
  let achievements: ExtractAchievementsOutput;
  try {
    [semantic, achievements] = await Promise.all([
      executeAIPipeline(
        "EXTRACT_SEMANTIC",
        {
          structural_extraction_json: JSON.stringify(structural),
          seniority: employee.seniority ?? "mid_level",
          management_exp: employee.management_exp ?? "no_direct_reports",
          level_dir: employee.level_dir ?? "stay_current",
        },
        extractSemanticSchema,
        sessionId
      ),
      executeAIPipeline(
        "EXTRACT_ACHIEVEMENTS",
        {
          work_history_json: JSON.stringify(structural.work_history),
        },
        extractAchievementsSchema,
        sessionId
      ),
    ]);
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Analysis failed: ${err.message}`
        : "Failed to analyze career data"
    );
  }

  // Persist to database
  const rawExtraction = {
    structural,
    semantic,
    achievements: achievements.achievements,
  };

  // Delete any existing snapshot for this employee (handles re-extraction)
  const { error: deleteError } = await supabase
    .from("career_snapshots")
    .delete()
    .eq("employee_id", employee.id);

  if (deleteError) {
    const logEntry = {
      type: "db_error",
      step: "delete_existing_snapshot",
      employee_id: employee.id,
      error: deleteError.message,
      code: deleteError.code,
      details: deleteError.details,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(logEntry) + "\n");
    // Non-fatal: continue to insert
  }

  // Insert career_snapshots row
  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .insert({
      employee_id: employee.id,
      career_narrative: semantic.career_narrative,
      raw_extraction: rawExtraction,
    })
    .select("id")
    .single();

  if (snapError || !snapshot) {
    const logEntry = {
      type: "db_error",
      step: "insert_career_snapshot",
      employee_id: employee.id,
      error: snapError?.message,
      code: snapError?.code,
      details: snapError?.details,
      hint: snapError?.hint,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(logEntry) + "\n");
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to save career snapshot"
    );
  }

  const snapshotId = snapshot.id;

  // Cleanup helper: delete the snapshot on child insert failure.
  // CASCADE on foreign keys will remove any child rows already inserted.
  async function cleanupSnapshot() {
    await supabase.from("career_snapshots").delete().eq("id", snapshotId);
  }

  // Helper: log DB errors with full context
  function logDbError(step: string, error: { message?: string; code?: string; details?: string; hint?: string } | null) {
    const logEntry = {
      type: "db_error",
      step,
      employee_id: employee.id,
      error: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(logEntry) + "\n");
  }

  // Helper: normalize date strings from AI output to YYYY-MM-DD or null
  function normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Try YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
    // Try parsing with Date constructor
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    } catch {
      // fall through
    }
    return null;
  }

  // Wrap all DB persistence in try/catch to catch any uncaught errors
  try {
    // Insert work_history rows
    const workHistoryRows = structural.work_history.map((wh, index) => ({
      snapshot_id: snapshotId,
      company: wh.company,
      title: wh.title,
      start_date: normalizeDate(wh.start_date),
      end_date: normalizeDate(wh.end_date),
      duration_months: wh.duration_months,
      description: wh.description_bullets.join("\n"),
      is_management_role: false,
      sort_order: index,
    }));

    if (workHistoryRows.length > 0) {
      const { error: whError } = await supabase
        .from("work_history")
        .insert(workHistoryRows);
      if (whError) {
        logDbError("insert_work_history", whError);
        await cleanupSnapshot();
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save work history");
      }
    }

    // Insert skills rows (combining technical and domain)
    const skillRows = [
      ...structural.skills_technical.map((name) => ({
        snapshot_id: snapshotId,
        name,
        category: "technical" as const,
        confidence: 1.0,
      })),
      ...structural.skills_domain.map((name) => ({
        snapshot_id: snapshotId,
        name,
        category: "domain" as const,
        confidence: 1.0,
      })),
    ];

    if (skillRows.length > 0) {
      const { error: skillError } = await supabase
        .from("skills")
        .insert(skillRows);
      if (skillError) {
        logDbError("insert_skills", skillError);
        await cleanupSnapshot();
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save skills");
      }
    }

    // Insert achievements rows
    const achievementRows = achievements.achievements.map((a) => ({
      snapshot_id: snapshotId,
      statement: a.statement,
      source_text: a.source_text,
      impact: a.impact_type,
      has_metric: a.has_metric,
    }));

    if (achievementRows.length > 0) {
      const { error: achError } = await supabase
        .from("achievements")
        .insert(achievementRows);
      if (achError) {
        logDbError("insert_achievements", achError);
        await cleanupSnapshot();
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save achievements");
      }
    }

    // Insert industries rows
    const industryRows = semantic.industries.map((ind) => ({
      snapshot_id: snapshotId,
      name: ind.name,
      confidence: ind.confidence,
    }));

    if (industryRows.length > 0) {
      const { error: indError } = await supabase
        .from("industries")
        .insert(industryRows);
      if (indError) {
        logDbError("insert_industries", indError);
        await cleanupSnapshot();
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save industries");
      }
    }

    // Insert tools_technologies rows
    const toolRows = structural.tools_technologies.map((tool) => ({
      snapshot_id: snapshotId,
      name: tool.name,
      category: tool.category,
      confidence: 1.0,
    }));

    if (toolRows.length > 0) {
      const { error: toolError } = await supabase
        .from("tools_technologies")
        .insert(toolRows);
      if (toolError) {
        logDbError("insert_tools_technologies", toolError);
        await cleanupSnapshot();
        return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save tools and technologies");
      }
    }

    // Update employee profile with years_of_experience and most recent role
    if (structural.work_history.length > 0) {
      const mostRecent = structural.work_history[0];
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (structural.total_years_experience !== null) {
        updatePayload.years_of_experience = structural.total_years_experience;
      }
      if (mostRecent.title) {
        updatePayload.most_recent_role = mostRecent.title;
      }
      if (mostRecent.company) {
        updatePayload.most_recent_company = mostRecent.company;
      }

      const { error: profileUpdateError } = await supabase
        .from("employee_profiles")
        .update(updatePayload)
        .eq("id", employee.id);

      if (profileUpdateError) {
        logDbError("update_employee_profile", profileUpdateError);
        // Non-critical: snapshot data is saved, profile sync is best-effort
      }
    }

    // Fetch inserted rows with IDs for response
    const [workHistoryResult, skillsResult, achievementsResult, industriesResult, toolsResult] =
      await Promise.all([
        supabase
          .from("work_history")
          .select("id, company, title, start_date, end_date, duration_months, is_management_role")
          .eq("snapshot_id", snapshotId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("skills")
          .select("id, name, category, confidence")
          .eq("snapshot_id", snapshotId),
        supabase
          .from("achievements")
          .select("id, statement, impact, has_metric, source_text")
          .eq("snapshot_id", snapshotId),
        supabase
          .from("industries")
          .select("id, name, confidence")
          .eq("snapshot_id", snapshotId),
        supabase
          .from("tools_technologies")
          .select("id, name, category, confidence")
          .eq("snapshot_id", snapshotId),
      ]);

    process.stdout.write(JSON.stringify({ type: "extraction_complete", snapshot_id: snapshotId, timestamp: new Date().toISOString() }) + "\n");

    return NextResponse.json({
      snapshot_id: snapshotId,
      career_narrative: semantic.career_narrative,
      work_history: workHistoryResult.data ?? [],
      skills: skillsResult.data ?? [],
      achievements: achievementsResult.data ?? [],
      industries: industriesResult.data ?? [],
      tools: toolsResult.data ?? [],
    });
  } catch (uncaughtError) {
    const logEntry = {
      type: "uncaught_error",
      step: "db_persistence",
      employee_id: employee.id,
      error: uncaughtError instanceof Error ? uncaughtError.message : String(uncaughtError),
      stack: uncaughtError instanceof Error ? uncaughtError.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    process.stdout.write(JSON.stringify(logEntry) + "\n");
    await cleanupSnapshot();
    return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to save extraction results");
  }
}
