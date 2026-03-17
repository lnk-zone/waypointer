/**
 * Seat pricing logic — per-purchase, not cumulative.
 *
 * 10-49 seats  → $179/seat
 * 50-99 seats  → $149/seat
 * 100+  seats  → $129/seat
 *
 * Minimum purchase: 10 seats.
 */

export const PRICING_TIERS = [
  { min: 100, max: Infinity, pricePerSeat: 129_00, label: "100+" },
  { min: 50, max: 99, pricePerSeat: 149_00, label: "50-99" },
  { min: 10, max: 49, pricePerSeat: 179_00, label: "10-49" },
] as const;

export const MIN_SEAT_PURCHASE = 10;

export function getPricePerSeat(quantity: number): number {
  const tier = PRICING_TIERS.find((t) => quantity >= t.min && quantity <= t.max);
  return tier ? tier.pricePerSeat : PRICING_TIERS[PRICING_TIERS.length - 1].pricePerSeat;
}

export function calculateTotal(quantity: number): {
  quantity: number;
  pricePerSeatCents: number;
  totalCents: number;
  pricePerSeatDisplay: string;
  totalDisplay: string;
} {
  const pricePerSeatCents = getPricePerSeat(quantity);
  const totalCents = pricePerSeatCents * quantity;
  return {
    quantity,
    pricePerSeatCents,
    totalCents,
    pricePerSeatDisplay: `$${(pricePerSeatCents / 100).toFixed(0)}`,
    totalDisplay: `$${(totalCents / 100).toLocaleString()}`,
  };
}
