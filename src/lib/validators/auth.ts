import { z } from "zod";

export const activateEmployeeSchema = z.object({
  seat_token: z.string().min(1, "Seat token is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  google_oauth_token: z.string().optional(),
}).refine(
  (data) => data.password || data.google_oauth_token,
  { message: "Either password or Google OAuth token is required" }
);

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type ActivateEmployeeInput = z.infer<typeof activateEmployeeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
