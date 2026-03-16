import { z } from "zod";

/** Zod schemas for all database enums from MP §8 */

export const seniorityLevelSchema = z.enum([
  "entry_level",
  "mid_level",
  "senior",
  "staff_principal",
  "manager",
  "senior_manager",
  "director",
  "vp_plus",
]);

export const managementExperienceSchema = z.enum([
  "no_direct_reports",
  "1_to_3",
  "4_to_10",
  "10_plus",
]);

export const levelDirectionSchema = z.enum([
  "stay_current",
  "open_to_step_up",
  "open_to_step_down",
]);

export const workPreferenceSchema = z.enum(["remote", "hybrid", "on_site"]);

export const workAuthorizationSchema = z.enum([
  "us_citizen",
  "green_card",
  "h1b",
  "opt",
  "other",
]);

export const fitScoreSchema = z.enum(["high_fit", "stretch", "low_fit"]);

export const jobActionSchema = z.enum([
  "apply_now",
  "reach_out_first",
  "seek_referral",
  "save_for_later",
  "skip",
]);

export const applicationStatusSchema = z.enum([
  "saved",
  "applied",
  "interviewing",
  "offer",
  "closed",
]);

export const seatStatusSchema = z.enum([
  "invited",
  "activated",
  "active",
  "inactive",
  "expired",
]);

export const interviewFormatSchema = z.enum([
  "behavioral",
  "technical",
  "mixed",
]);

export const interviewDifficultySchema = z.enum(["standard", "challenging"]);

export const recipientTypeSchema = z.enum([
  "recruiter",
  "hiring_manager",
  "former_colleague",
  "alumni",
  "referral_request",
  "follow_up",
]);

export const relationshipStrengthSchema = z.enum(["cold", "warm", "close"]);

export const resumeToneSchema = z.enum([
  "professional",
  "confident",
  "conversational",
]);

export const outreachToneSchema = z.enum(["warm", "formal"]);

export const planItemCategorySchema = z.enum([
  "resume",
  "jobs",
  "outreach",
  "interviews",
  "linkedin",
  "other",
]);

export const impactTypeSchema = z.enum([
  "revenue",
  "efficiency",
  "scale",
  "quality",
  "leadership",
]);

export const programTierSchema = z.enum(["standard", "plus", "premium"]);

export const emailTemplateTypeSchema = z.enum([
  "invitation",
  "reengagement_72h",
  "weekly_nudge",
  "thirty_day_checkin",
]);
