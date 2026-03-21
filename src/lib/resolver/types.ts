/**
 * Direct Link Resolver — Type Definitions
 *
 * All TypeScript interfaces for the Direct Link Resolver module.
 * Consumers import from here; never from individual implementation files.
 */

export interface ATSConfig {
  name: string;
  apiUrlTemplate: string;
  detectPatterns: RegExp[];
  parseJobs: (data: unknown, targetTitle: string) => ResolvedJob[];
}

export interface ResolvedJob {
  title: string;
  applyUrl: string;
  location?: string | null;
  atsJobId?: string;
  matchScore?: number;
  llmTokens?: { input: number; output: number };
}

export interface ResolutionResult {
  directUrl: string;
  tier: 1 | 2 | 3 | 4;
  method: string;
  isVerified: boolean;
  isDirect: boolean;
  matchedTitle: string;
  confidence: "high" | "medium" | "low";
  costUsd: number;
}

export interface ATSDetection {
  ats_platform: string | null;
  ats_slug: string | null;
  careers_url: string | null;
  detection_method?: string;
}

export interface JobListingForResolver {
  id: string;
  external_id: string;
  title: string;
  company_name: string;
  employer_website: string | null;
  source_url: string | null;
}
