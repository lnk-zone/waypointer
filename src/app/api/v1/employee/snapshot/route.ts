/**
 * GET /api/v1/employee/snapshot — fetch the current career snapshot
 * PATCH /api/v1/employee/snapshot — partial update to the career snapshot
 *
 * PATCH supports: skills_add, skills_remove, achievements_update,
 * achievements_add, achievements_remove, work_history_update,
 * industries_add, industries_remove, tools_add, tools_remove,
 * career_narrative.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "edge";

/**
 * Fetch the full snapshot data for a given snapshot ID.
 */
async function fetchSnapshotData(supabase: SupabaseClient, snapshotId: string) {
  const [
    snapshotResult,
    workHistoryResult,
    skillsResult,
    achievementsResult,
    industriesResult,
    toolsResult,
  ] = await Promise.all([
    supabase
      .from("career_snapshots")
      .select("id, career_narrative")
      .eq("id", snapshotId)
      .single(),
    supabase
      .from("work_history")
      .select(
        "id, company, title, start_date, end_date, duration_months, is_management_role"
      )
      .eq("snapshot_id", snapshotId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("skills")
      .select("id, name, category, confidence, is_user_added")
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

  return {
    snapshot_id: snapshotId,
    career_narrative: snapshotResult.data?.career_narrative ?? "",
    work_history: workHistoryResult.data ?? [],
    skills: skillsResult.data ?? [],
    achievements: achievementsResult.data ?? [],
    industries: industriesResult.data ?? [],
    tools: toolsResult.data ?? [],
  };
}

/**
 * GET /api/v1/employee/snapshot
 * Returns the employee's current career snapshot with all child data.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .select("id")
    .eq("employee_id", employee.id)
    .single();

  if (snapError || !snapshot) {
    return apiError(
      ERROR_CODES.SNAPSHOT_NOT_FOUND,
      "Career snapshot not found. Please complete the resume import first."
    );
  }

  const data = await fetchSnapshotData(supabase, snapshot.id);
  return NextResponse.json(data);
}

const patchSnapshotSchema = z
  .object({
    skills_add: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          category: z.string().min(1).max(100),
        })
      )
      .optional(),
    skills_remove: z.array(z.string().uuid()).optional(),
    achievements_update: z
      .array(
        z.object({
          id: z.string().uuid(),
          statement: z.string().min(1).max(2000),
        })
      )
      .optional(),
    achievements_add: z
      .array(
        z.object({
          statement: z.string().min(1).max(2000),
          impact: z.string().max(50).optional(),
          has_metric: z.boolean().optional(),
        })
      )
      .optional(),
    achievements_remove: z.array(z.string().uuid()).optional(),
    work_history_update: z
      .array(
        z.object({
          id: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          company: z.string().min(1).max(200).optional(),
          start_date: z.string().nullable().optional(),
          end_date: z.string().nullable().optional(),
        })
      )
      .optional(),
    industries_add: z
      .array(z.object({ name: z.string().min(1).max(200) }))
      .optional(),
    industries_remove: z.array(z.string().uuid()).optional(),
    tools_add: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          category: z.string().max(100).optional(),
        })
      )
      .optional(),
    tools_remove: z.array(z.string().uuid()).optional(),
    career_narrative: z.string().min(1).max(5000).optional(),
  })
  .refine(
    (data) =>
      data.skills_add ||
      data.skills_remove ||
      data.achievements_update ||
      data.achievements_add ||
      data.achievements_remove ||
      data.work_history_update ||
      data.industries_add ||
      data.industries_remove ||
      data.tools_add ||
      data.tools_remove ||
      data.career_narrative,
    { message: "At least one update field is required" }
  );

export async function PATCH(request: NextRequest) {
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

  const parsed = patchSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = createServiceClient();
  const data = parsed.data;

  // Get the employee's snapshot
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  const { data: snapshot, error: snapError } = await supabase
    .from("career_snapshots")
    .select("id")
    .eq("employee_id", employee.id)
    .single();

  if (snapError || !snapshot) {
    return apiError(
      ERROR_CODES.SNAPSHOT_NOT_FOUND,
      "Career snapshot not found. Please complete the resume import first."
    );
  }

  const snapshotId = snapshot.id;

  // Update career narrative
  if (data.career_narrative !== undefined) {
    const { error } = await supabase
      .from("career_snapshots")
      .update({
        career_narrative: data.career_narrative,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId);

    if (error) {
      return apiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update career narrative"
      );
    }
  }

  // Add new skills
  if (data.skills_add && data.skills_add.length > 0) {
    const rows = data.skills_add.map((skill) => ({
      snapshot_id: snapshotId,
      name: skill.name,
      category: skill.category,
      confidence: 1.0,
      is_user_added: true,
    }));

    const { error } = await supabase.from("skills").insert(rows);
    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to add skills");
    }
  }

  // Remove skills
  if (data.skills_remove && data.skills_remove.length > 0) {
    const { error } = await supabase
      .from("skills")
      .delete()
      .in("id", data.skills_remove)
      .eq("snapshot_id", snapshotId);

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to remove skills");
    }
  }

  // Update achievements
  if (data.achievements_update && data.achievements_update.length > 0) {
    for (const ach of data.achievements_update) {
      const { error } = await supabase
        .from("achievements")
        .update({
          statement: ach.statement,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ach.id)
        .eq("snapshot_id", snapshotId);

      if (error) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to update achievement"
        );
      }
    }
  }

  // Update work history
  if (data.work_history_update && data.work_history_update.length > 0) {
    for (const wh of data.work_history_update) {
      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (wh.title !== undefined) updateFields.title = wh.title;
      if (wh.company !== undefined) updateFields.company = wh.company;
      if (wh.start_date !== undefined) updateFields.start_date = wh.start_date;
      if (wh.end_date !== undefined) updateFields.end_date = wh.end_date;

      const { error } = await supabase
        .from("work_history")
        .update(updateFields)
        .eq("id", wh.id)
        .eq("snapshot_id", snapshotId);

      if (error) {
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to update work history"
        );
      }
    }
  }

  // Add achievements
  if (data.achievements_add && data.achievements_add.length > 0) {
    const rows = data.achievements_add.map((a) => ({
      snapshot_id: snapshotId,
      statement: a.statement,
      impact: a.impact ?? null,
      has_metric: a.has_metric ?? false,
    }));

    const { error } = await supabase.from("achievements").insert(rows);
    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to add achievements");
    }
  }

  // Remove achievements
  if (data.achievements_remove && data.achievements_remove.length > 0) {
    const { error } = await supabase
      .from("achievements")
      .delete()
      .in("id", data.achievements_remove)
      .eq("snapshot_id", snapshotId);

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to remove achievements");
    }
  }

  // Add industries
  if (data.industries_add && data.industries_add.length > 0) {
    const rows = data.industries_add.map((ind) => ({
      snapshot_id: snapshotId,
      name: ind.name,
      confidence: 1.0,
    }));

    const { error } = await supabase.from("industries").insert(rows);
    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to add industries");
    }
  }

  // Remove industries
  if (data.industries_remove && data.industries_remove.length > 0) {
    const { error } = await supabase
      .from("industries")
      .delete()
      .in("id", data.industries_remove)
      .eq("snapshot_id", snapshotId);

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to remove industries");
    }
  }

  // Add tools
  if (data.tools_add && data.tools_add.length > 0) {
    const rows = data.tools_add.map((tool) => ({
      snapshot_id: snapshotId,
      name: tool.name,
      category: tool.category ?? null,
      confidence: 1.0,
    }));

    const { error } = await supabase.from("tools_technologies").insert(rows);
    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to add tools");
    }
  }

  // Remove tools
  if (data.tools_remove && data.tools_remove.length > 0) {
    const { error } = await supabase
      .from("tools_technologies")
      .delete()
      .in("id", data.tools_remove)
      .eq("snapshot_id", snapshotId);

    if (error) {
      return apiError(ERROR_CODES.INTERNAL_ERROR, "Failed to remove tools");
    }
  }

  // Fetch and return updated snapshot data
  const updatedData = await fetchSnapshotData(supabase, snapshotId);
  return NextResponse.json(updatedData);
}
