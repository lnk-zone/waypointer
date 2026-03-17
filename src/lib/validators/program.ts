import { z } from "zod";

/**
 * Simplified program schema — programs are organizational containers only.
 * No seats, no tiers, no duration, no feature toggles.
 */
export const programSchema = z.object({
  name: z.string().min(1, "Program name is required").max(200),
  custom_intro_message: z.string().max(2000).default(""),
  is_branded: z.boolean().default(true),
});

export type ProgramInput = z.infer<typeof programSchema>;

/**
 * Seat purchase validation.
 */
export const seatPurchaseSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(10, "Minimum purchase is 10 seats")
    .max(10000, "Maximum 10,000 seats per purchase"),
});

export type SeatPurchaseInput = z.infer<typeof seatPurchaseSchema>;
