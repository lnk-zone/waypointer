"use client";

/**
 * Weekly Plan & Progress — Screen 14
 *
 * Displays the current week's personalized action plan with checkable items,
 * defer functionality, and regeneration. The progress tracker section (E10-02)
 * will be added below the weekly plan.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Lightbulb,
  RefreshCcw,
  Sparkles,
  Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface PlanItem {
  description: string;
  category: string;
  priority: string;
  estimated_minutes: number;
  is_completed: boolean;
  is_deferred: boolean;
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  week_start: string;
  items: PlanItem[];
  week_focus: string | null;
  encouragement: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  resume: "Resume",
  jobs: "Jobs",
  outreach: "Outreach",
  interviews: "Interviews",
  linkedin: "LinkedIn",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  resume: "bg-primary/10 text-primary",
  jobs: "bg-[#059669]/10 text-[#059669]",
  outreach: "bg-[#D97706]/10 text-[#D97706]",
  interviews: "bg-purple-100 text-purple-700",
  linkedin: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

const PRIORITY_INDICATOR: Record<string, string> = {
  high: "border-l-primary",
  medium: "border-l-[#D97706]",
  low: "border-l-gray-300",
};

// ─── Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-4 flex items-center gap-3"
        >
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Progress Content ─────────────────────────────────────────────────

function ProgressContent() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);

  // Fetch current week's plan
  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/employee/plan/weekly");
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to load your weekly plan"
        );
      }

      const json = await res.json();
      setPlan(json.data ?? null);
      if (json.meta?.week_number) {
        setWeekNumber(json.meta.week_number);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load weekly plan"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Generate a new plan
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/employee/plan/weekly/generate", {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to generate your weekly plan"
        );
      }

      const json = await res.json();
      setPlan(json.data as WeeklyPlan);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate plan"
      );
    } finally {
      setGenerating(false);
    }
  }, []);

  // Toggle item completion
  const handleToggleComplete = useCallback(
    async (index: number) => {
      if (!plan || updatingItem !== null) return;
      setUpdatingItem(index);

      const item = plan.items[index];
      const newCompleted = !item.is_completed;

      // Optimistic update
      setPlan((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, items: [...prev.items] };
        updated.items[index] = {
          ...updated.items[index],
          is_completed: newCompleted,
        };
        return updated;
      });

      try {
        const res = await fetch(
          `/api/v1/employee/plan/weekly/${plan.id}/items`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_index: index,
              is_completed: newCompleted,
            }),
          }
        );

        if (!res.ok) {
          // Revert optimistic update
          setPlan((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, items: [...prev.items] };
            updated.items[index] = {
              ...updated.items[index],
              is_completed: !newCompleted,
            };
            return updated;
          });
        }
      } catch {
        // Revert on network error
        setPlan((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, items: [...prev.items] };
          updated.items[index] = {
            ...updated.items[index],
            is_completed: !newCompleted,
          };
          return updated;
        });
      } finally {
        setUpdatingItem(null);
      }
    },
    [plan, updatingItem]
  );

  // Defer item
  const handleDefer = useCallback(
    async (index: number) => {
      if (!plan || updatingItem !== null) return;
      setUpdatingItem(index);

      // Optimistic update
      setPlan((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, items: [...prev.items] };
        updated.items[index] = {
          ...updated.items[index],
          is_deferred: true,
        };
        return updated;
      });

      try {
        const res = await fetch(
          `/api/v1/employee/plan/weekly/${plan.id}/items`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_index: index,
              is_deferred: true,
            }),
          }
        );

        if (!res.ok) {
          setPlan((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, items: [...prev.items] };
            updated.items[index] = {
              ...updated.items[index],
              is_deferred: false,
            };
            return updated;
          });
        }
      } catch {
        setPlan((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, items: [...prev.items] };
          updated.items[index] = {
            ...updated.items[index],
            is_deferred: false,
          };
          return updated;
        });
      } finally {
        setUpdatingItem(null);
      }
    },
    [plan, updatingItem]
  );

  // ─── Computed values ────────────────────────────────────────────────

  const activeItems = plan?.items.filter((i) => !i.is_deferred) ?? [];
  const completedCount = activeItems.filter((i) => i.is_completed).length;
  const totalActive = activeItems.length;
  const progressPct =
    totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;

  // ─── Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PlanSkeleton />
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────

  if (error && !plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <Button onClick={fetchPlan} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ─── No plan yet — generate CTA ────────────────────────────────────

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            Weekly Plan
          </h1>
          <p className="text-sm text-text-secondary">
            Week {weekNumber} of your transition
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            No plan for this week yet
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Generate a personalized action plan based on your progress and
            where you are in your transition.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                Building your plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Weekly Plan
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Plan display ───────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            Weekly Plan
          </h1>
          <p className="text-sm text-text-secondary">
            Week {plan.week_number} · {plan.week_start}
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {generating ? (
            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Regenerate
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-2">
          <p className="text-xs text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* Week focus */}
      {plan.week_focus && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              This week&apos;s focus
            </span>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">
            {plan.week_focus}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#059669] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
          {completedCount}/{totalActive} completed
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {plan.items.map((item, i) => {
          if (item.is_deferred) {
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-gray-50 px-4 py-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-4 w-4 text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary line-through">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-text-secondary/60 mt-0.5">
                      Deferred to next week
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border border-border bg-surface px-4 py-3 border-l-4 transition-default",
                PRIORITY_INDICATOR[item.priority] ?? "border-l-gray-200",
                item.is_completed && "bg-[#059669]/[0.02]"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(i)}
                  disabled={updatingItem !== null}
                  className="mt-0.5 shrink-0 transition-default"
                >
                  {item.is_completed ? (
                    <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 hover:text-primary transition-default" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm text-text-primary",
                      item.is_completed && "line-through text-text-secondary"
                    )}
                  >
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other
                      )}
                    >
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                      <Clock className="h-3 w-3" />
                      {item.estimated_minutes} min
                    </span>
                  </div>
                </div>

                {/* Defer button */}
                {!item.is_completed && (
                  <button
                    onClick={() => handleDefer(i)}
                    disabled={updatingItem !== null}
                    className="text-[10px] text-text-secondary hover:text-[#D97706] transition-default whitespace-nowrap mt-1"
                    title="Defer to next week"
                  >
                    Defer →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Encouragement */}
      {plan.encouragement && (
        <div className="rounded-lg border border-[#059669]/20 bg-[#059669]/5 px-5 py-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-[#059669] mt-0.5 shrink-0" />
            <p className="text-sm text-text-primary leading-relaxed">
              {plan.encouragement}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function ProgressPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <ProgressContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
