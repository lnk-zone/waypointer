/**
 * Zod schemas for AI pipeline output validation.
 * These schemas match the exact output formats defined in the Prompt Registry.
 */

import { z } from "zod";

// ─── EXTRACT_STRUCTURAL (PR Prompt 1) ───────────────────────────────────

export const workHistoryEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  duration_months: z.number().nullable(),
  description_bullets: z.array(z.string()),
});

export const educationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  graduation_year: z.number().nullable(),
});

export const certificationEntrySchema = z.object({
  name: z.string(),
  issuing_body: z.string().nullable(),
});

export const toolEntrySchema = z.object({
  name: z.string(),
  category: z.string(),
});

export const extractStructuralSchema = z.object({
  work_history: z.array(workHistoryEntrySchema),
  education: z.array(educationEntrySchema),
  certifications: z.array(certificationEntrySchema),
  skills_technical: z.array(z.string()),
  skills_domain: z.array(z.string()),
  tools_technologies: z.array(toolEntrySchema),
  languages: z.array(z.string()),
  location_mentioned: z.string().nullable(),
  total_years_experience: z.number().nullable(),
});

// ─── EXTRACT_SEMANTIC (PR Prompt 2) ─────────────────────────────────────

const confidenceField = z.number().min(0).max(1);

export const industryClassificationSchema = z.object({
  name: z.string(),
  confidence: confidenceField,
});

export const functionAreaSchema = z.object({
  name: z.string(),
  confidence: confidenceField,
});

export const domainExpertiseSchema = z.object({
  area: z.string(),
  confidence: confidenceField,
});

export const careerTrajectorySchema = z.object({
  type: z.enum(["ic_track", "management_track", "hybrid", "pivot", "early_career"]),
  confidence: confidenceField,
  description: z.string(),
});

export const extractSemanticSchema = z.object({
  industries: z.array(industryClassificationSchema),
  primary_function_area: functionAreaSchema,
  secondary_function_areas: z.array(functionAreaSchema),
  domain_expertise: z.array(domainExpertiseSchema),
  career_trajectory: careerTrajectorySchema,
  career_narrative: z.string(),
  notable_patterns: z.array(z.string()),
});

// ─── EXTRACT_ACHIEVEMENTS (PR Prompt 3) ─────────────────────────────────

export const achievementSchema = z.object({
  statement: z.string(),
  source_text: z.string(),
  role_company: z.string(),
  impact_type: z.enum(["revenue", "efficiency", "scale", "quality", "leadership"]),
  has_metric: z.boolean(),
  metric_value: z.string().nullable(),
  strength: z.enum(["strong", "moderate", "weak"]),
  stronger_version: z.string().nullable(),
});

export const extractAchievementsSchema = z.object({
  achievements: z.array(achievementSchema),
});

// ─── Type Exports ───────────────────────────────────────────────────────

export type ExtractStructuralOutput = z.infer<typeof extractStructuralSchema>;
export type ExtractSemanticOutput = z.infer<typeof extractSemanticSchema>;
export type ExtractAchievementsOutput = z.infer<typeof extractAchievementsSchema>;

// ─── GENERATE_ROLE_PATHS (PR Prompt 4) ──────────────────────────────

export const rolePathSchema = z
  .object({
    title: z.string().min(1),
    category: z.string().min(1),
    why_it_fits: z.string().min(1),
    salary_band_min: z.number().int().nonnegative(),
    salary_band_max: z.number().int().nonnegative(),
    demand_level: z.enum(["high", "medium", "low"]),
    confidence_score: z.number().min(0).max(1),
    skills_overlap_pct: z.number().int().min(0).max(100),
    gap_analysis: z.string(),
    title_variations: z.array(z.string()),
    core_keywords: z.array(z.string()),
    ideal_company_profile: z.string(),
  })
  .refine((data) => data.salary_band_min <= data.salary_band_max, {
    message: "salary_band_min must not exceed salary_band_max",
  });

export const generateRolePathsSchema = z.object({
  paths: z.array(rolePathSchema).length(3),
});

export const generateSingleRolePathSchema = z.object({
  path: rolePathSchema,
});

export type RolePathOutput = z.infer<typeof rolePathSchema>;
export type GenerateRolePathsOutput = z.infer<typeof generateRolePathsSchema>;
export type GenerateSingleRolePathOutput = z.infer<typeof generateSingleRolePathSchema>;

// ─── GENERATE_TRANSITION_PLAN (PR Prompt 5) ──────────────────────────

export const dailyPlanSchema = z.object({
  day: z.number().int().min(1).max(7),
  tasks: z.array(z.string().min(1)).min(1),
});

export const timelineMilestoneSchema = z.object({
  week: z.number().int().min(1),
  milestone: z.string().min(1),
  description: z.string().min(1),
});

export const readinessBreakdownSchema = z.object({
  resume: z.number().int().min(0).max(100),
  linkedin: z.number().int().min(0).max(100),
  jobs: z.number().int().min(0).max(100),
  outreach: z.number().int().min(0).max(100),
  interviews: z.number().int().min(0).max(100),
});

export const generateTransitionPlanSchema = z.object({
  search_strategy: z.string().min(1),
  readiness_score: z.number().int().min(0).max(100),
  readiness_breakdown: readinessBreakdownSchema,
  first_week_plan: z.array(dailyPlanSchema).length(7),
  suggested_timeline: z.array(timelineMilestoneSchema).min(3),
});

export type DailyPlan = z.infer<typeof dailyPlanSchema>;
export type TimelineMilestone = z.infer<typeof timelineMilestoneSchema>;
export type ReadinessBreakdown = z.infer<typeof readinessBreakdownSchema>;
export type GenerateTransitionPlanOutput = z.infer<typeof generateTransitionPlanSchema>;
