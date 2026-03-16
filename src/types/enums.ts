/**
 * TypeScript types for all database enums from MP §8.
 * These mirror the PostgreSQL enums exactly.
 */

export type SeniorityLevel =
  | "entry_level"
  | "mid_level"
  | "senior"
  | "staff_principal"
  | "manager"
  | "senior_manager"
  | "director"
  | "vp_plus";

export type ManagementExperience =
  | "no_direct_reports"
  | "1_to_3"
  | "4_to_10"
  | "10_plus";

export type LevelDirection =
  | "stay_current"
  | "open_to_step_up"
  | "open_to_step_down";

export type WorkPreference = "remote" | "hybrid" | "on_site";

export type WorkAuthorization =
  | "us_citizen"
  | "green_card"
  | "h1b"
  | "opt"
  | "other";

export type FitScore = "high_fit" | "stretch" | "low_fit";

export type JobAction =
  | "apply_now"
  | "reach_out_first"
  | "seek_referral"
  | "save_for_later"
  | "skip";

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offer"
  | "closed";

export type SeatStatus =
  | "invited"
  | "activated"
  | "active"
  | "inactive"
  | "expired";

export type InterviewFormat = "behavioral" | "technical" | "mixed";

export type InterviewDifficulty = "standard" | "challenging";

export type RecipientType =
  | "recruiter"
  | "hiring_manager"
  | "former_colleague"
  | "alumni"
  | "referral_request"
  | "follow_up";

export type RelationshipStrength = "cold" | "warm" | "close";

export type ResumeTone = "professional" | "confident" | "conversational";

export type OutreachTone = "warm" | "formal";

export type PlanItemCategory =
  | "resume"
  | "jobs"
  | "outreach"
  | "interviews"
  | "linkedin"
  | "other";

export type ImpactType =
  | "revenue"
  | "efficiency"
  | "scale"
  | "quality"
  | "leadership";

export type ProgramTier = "standard" | "plus" | "premium";

export type EmailTemplateType =
  | "invitation"
  | "reengagement_72h"
  | "weekly_nudge"
  | "thirty_day_checkin";
