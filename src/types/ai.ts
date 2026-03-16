/**
 * TypeScript types for all AI output shapes.
 * Derived from the Prompt Registry output format specifications.
 * Used by the AI pipeline for Zod validation of Claude responses.
 */

import type {
  FitScore,
  ImpactType,
  JobAction,
  PlanItemCategory,
} from "./enums";

// ─── Prompt Registry Row ────────────────────────────────────────────────

export interface PromptRegistryRow {
  id: string;
  prompt_id: string;
  version: number;
  system_prompt: string;
  user_prompt_template: string;
  output_format: string;
  model: string;
  max_tokens: number;
  temperature: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pipeline Config ────────────────────────────────────────────────────

export interface AIModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AICallLog {
  promptId: string;
  durationMs: number;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  retried?: boolean;
}

// ─── Module 1: Career Snapshot ──────────────────────────────────────────

/** EXTRACT_STRUCTURAL output — Pass 1 (PR Prompt 1) */
export interface StructuralExtraction {
  work_history: WorkHistoryEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  skills_technical: string[];
  skills_domain: string[];
  tools_technologies: ToolEntry[];
  languages: string[];
  location_mentioned: string | null;
  total_years_experience: number | null;
}

export interface WorkHistoryEntry {
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  description_bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  graduation_year: number | null;
}

export interface CertificationEntry {
  name: string;
  issuing_body: string | null;
}

export interface ToolEntry {
  name: string;
  category: string;
}

/** EXTRACT_SEMANTIC output — Pass 2 (PR Prompt 2) */
export interface SemanticEnrichment {
  industries: IndustryClassification[];
  primary_function_area: FunctionArea;
  secondary_function_areas: FunctionArea[];
  domain_expertise: DomainExpertise[];
  career_trajectory: CareerTrajectory;
  career_narrative: string;
  notable_patterns: string[];
}

export interface IndustryClassification {
  name: string;
  confidence: number;
}

export interface FunctionArea {
  name: string;
  confidence: number;
}

export interface DomainExpertise {
  area: string;
  confidence: number;
}

export interface CareerTrajectory {
  type: "ic_track" | "management_track" | "hybrid" | "pivot" | "early_career";
  confidence: number;
  description: string;
}

/** EXTRACT_ACHIEVEMENTS output — Pass 3 (PR Prompt 3) */
export interface AchievementExtraction {
  achievements: Achievement[];
}

export interface Achievement {
  statement: string;
  source_text: string;
  role_company: string;
  impact_type: ImpactType;
  has_metric: boolean;
  metric_value: string | null;
  strength: "strong" | "moderate" | "weak";
  stronger_version: string | null;
}

/** Combined career snapshot (assembled from 3 passes + user inputs) */
export interface CareerSnapshot {
  structural: StructuralExtraction;
  semantic: SemanticEnrichment;
  achievements: AchievementExtraction;
}

// ─── Module 2: Role Path Recommendation ─────────────────────────────────

/** GENERATE_ROLE_PATHS output */
export interface RolePathsOutput {
  role_paths: RolePath[];
}

export interface RolePath {
  title: string;
  category: string;
  why_it_fits: string;
  salary_band: SalaryBand;
  demand_level: "High" | "Medium" | "Low";
  confidence: number;
  skills_overlap_pct: number;
  gap_analysis: GapAnalysisItem[];
  title_variations: string[];
  keywords: string[];
  ideal_company_profile: string;
}

export interface SalaryBand {
  min: number;
  max: number;
  currency: string;
}

export interface GapAnalysisItem {
  skill: string;
  importance: "critical" | "nice_to_have";
  suggestion: string;
}

// ─── Module 3: Resume Generation ────────────────────────────────────────

/** GENERATE_RESUME output */
export interface ResumeContent {
  summary_statement: string;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  certifications: string[];
  ats_keywords: string[];
}

export interface ResumeSkill {
  skill: string;
  relevance: "primary" | "secondary";
}

export interface ResumeExperience {
  job_title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  graduation_year: number | null;
}

/** SCORE_RESUME output */
export interface ResumeScore {
  ats_score: number;
  clarity_score: number;
  specificity_score: number;
  ats_feedback: string;
  clarity_feedback: string;
  specificity_feedback: string;
  missing_metrics: string[];
  weak_bullets: WeakBullet[];
  suggestions: string[];
}

export interface WeakBullet {
  original: string;
  rewrite: string;
  reason: string;
}

// ─── Module 4: LinkedIn Optimization ────────────────────────────────────

/** GENERATE_LINKEDIN output */
export interface LinkedInContent {
  headline: string;
  about_section: string;
  experience_bullets: LinkedInExperienceBullet[];
  featured_suggestions: string[];
  skill_recommendations: string[];
  open_to_work_guidance: string;
  recruiter_tips: string;
}

export interface LinkedInExperienceBullet {
  company: string;
  role: string;
  bullets: string[];
}

// ─── Module 5: Job Matching ─────────────────────────────────────────────

/** SCORE_JOB_BATCH output */
export interface JobScoreBatchOutput {
  scored_jobs: JobScore[];
}

export interface JobScore {
  job_id: string;
  fit_level: FitScore;
  match_explanation: string;
  competition_level: "low" | "medium" | "high";
  recommended_action: JobAction;
}

// ─── Module 6: Application Kit ──────────────────────────────────────────

/** GENERATE_APPLICATION_KIT output */
export interface ApplicationKit {
  intro_paragraph: string;
  recruiter_message: string;
  hiring_manager_message: string;
  referral_request: string;
  resume_edits: ResumeEdit[];
  interview_themes: InterviewTheme[];
}

export interface ResumeEdit {
  section: string;
  change: string;
  reason: string;
}

export interface InterviewTheme {
  question: string;
  why_likely: string;
  preparation_tip: string;
}

// ─── Module 7: Outreach ─────────────────────────────────────────────────

/** GENERATE_OUTREACH output */
export interface OutreachKit {
  linkedin_message: string;
  email_message: string;
  followup_message: string;
  guidance: OutreachGuidance;
}

export interface OutreachGuidance {
  when_to_use: string;
  timing: string;
  what_not_to_say: string;
}

// ─── Module 8: Interview ────────────────────────────────────────────────

/** ANALYZE_INTERVIEW output */
export interface InterviewFeedback {
  overall_score: number;
  clarity_score: number;
  specificity_score: number;
  confidence_score: number;
  clarity_notes: string;
  specificity_notes: string;
  confidence_notes: string;
  filler_word_count: number;
  answer_analyses: AnswerAnalysis[];
  strongest_stories: string[];
  weak_answers: WeakAnswer[];
  next_recommendation: string;
}

export interface AnswerAnalysis {
  question: string;
  quality: "strong" | "adequate" | "needs_work";
  feedback: string;
}

export interface WeakAnswer {
  question: string;
  original_response_summary: string;
  coaching_notes: string;
  suggested_approach: string;
}

/** GENERATE_INTERVIEW_PREP output */
export interface InterviewPrep {
  common_questions: PrepQuestion[];
  behavioral_questions: PrepQuestion[];
  company_specific_questions: PrepQuestion[];
  strengths_to_emphasize: string[];
  weak_spots_to_prepare: string[];
  compensation_guidance: string;
}

export interface PrepQuestion {
  question: string;
  why_asked: string;
  suggested_approach: string;
}

// ─── Module 9: Weekly Plan ──────────────────────────────────────────────

/** GENERATE_WEEKLY_PLAN output */
export interface WeeklyPlan {
  items: PlanItem[];
  week_focus: string;
  encouragement: string;
}

export interface PlanItem {
  description: string;
  category: PlanItemCategory;
  priority: "high" | "medium" | "low";
  estimated_minutes: number;
}

// ─── Module 10: Transition Plan ─────────────────────────────────────────

/** GENERATE_TRANSITION_PLAN output */
export interface TransitionPlan {
  search_strategy: string;
  readiness_score: number;
  readiness_breakdown: ReadinessBreakdown;
  first_week_plan: DailyPlanItem[];
  suggested_timeline: TimelineMilestone[];
}

export interface ReadinessBreakdown {
  resume_readiness: number;
  network_strength: number;
  interview_preparedness: number;
  market_alignment: number;
  personal_branding: number;
}

export interface DailyPlanItem {
  day: number;
  tasks: string[];
}

export interface TimelineMilestone {
  week: number;
  milestone: string;
  description: string;
}
