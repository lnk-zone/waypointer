import { z } from "zod";

export const profileSchema = z.object({
  seniority: z.enum([
    "entry_level",
    "mid_level",
    "senior",
    "staff_principal",
    "manager",
    "senior_manager",
    "director",
    "vp_plus",
  ]),
  management_exp: z.enum([
    "no_direct_reports",
    "1_to_3",
    "4_to_10",
    "10_plus",
  ]),
  level_dir: z.enum([
    "stay_current",
    "open_to_step_up",
    "open_to_step_down",
  ]),
  location_city: z.string().min(1, "City is required"),
  location_state: z.string().min(1, "State is required"),
  work_pref: z.enum(["remote", "hybrid", "on_site"]),
  comp_target_min: z.number().int().min(30000).max(300000),
  comp_target_max: z.number().int().min(30000).max(300000),
  work_auth: z.enum([
    "us_citizen",
    "green_card",
    "h1b",
    "opt",
    "other",
  ]),
  years_of_experience: z.number().int().min(0).max(50).optional(),
  most_recent_role: z.string().min(1).max(200).optional(),
  most_recent_company: z.string().min(1).max(200).optional(),
}).refine(
  (data) => data.comp_target_max >= data.comp_target_min,
  { message: "Maximum compensation must be greater than or equal to minimum", path: ["comp_target_max"] }
);

export type ProfileInput = z.infer<typeof profileSchema>;
