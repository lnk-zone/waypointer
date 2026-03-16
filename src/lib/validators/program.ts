import { z } from "zod";

/**
 * Shared Zod schema for transition program creation/validation.
 * Used by both the API route and the frontend form.
 */
export const programSchema = z.object({
  name: z.string().min(1, "Program name is required").max(200),
  tier: z.enum(["standard", "plus", "premium"]).default("standard"),
  total_seats: z.number().int().min(1, "At least 1 seat required").max(10000),
  access_duration_days: z.number().int().min(7).max(365).default(90),
  is_branded: z.boolean().default(true),
  custom_intro_message: z.string().max(2000).default(""),
  interview_coaching_enabled: z.boolean().default(true),
  outreach_builder_enabled: z.boolean().default(true),
});

export type ProgramInput = z.infer<typeof programSchema>;
