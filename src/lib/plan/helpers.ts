/**
 * Shared helpers for weekly plan operations.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface PlanItemStored {
  description: string;
  category: string;
  priority: string;
  estimated_minutes: number;
  is_completed: boolean;
  is_deferred: boolean;
}

// ─── Week Number ──────────────────────────────────────────────────────

/**
 * Compute the current week number of the employee's transition.
 * Week 1 starts on the employee's created_at date.
 */
export function getWeekNumber(createdAt: string): number {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Returns the ISO date string for the Monday of the current week.
 */
export function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // Offset to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split("T")[0];
}
