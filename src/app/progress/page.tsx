"use client";

/**
 * Weekly Plan & Progress — Screens 14 + 15
 *
 * Displays the current week's personalized action plan (Screen 14) and the
 * Progress Tracker dashboard (Screen 15) with metrics, charts, milestones,
 * and streak tracking.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Flame,
  Lightbulb,
  Linkedin,
  MessageSquare,
  Mic,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

interface Milestone {
  name: string;
  achieved: boolean;
  achieved_at: string | null;
}

interface ProgressData {
  resumes_completed: number;
  linkedin_updated: boolean;
  applications_tracked: number;
  outreach_sent: number;
  interviews_practiced: number;
  interviews_landed: number;
  current_streak_days: number;
  weekly_activity: { week: number; actions: number }[];
  milestones: Milestone[];
  confidence_history: { week: number; score: number }[];
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

function TrackerSkeleton() {
  return (
    <div className="space-y-4 mt-8 pt-8 border-t border-border">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sublabel,
  achieved,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  achieved?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 transition-default hover:shadow-md hover:border-primary animate-in fade-in slide-in-from-bottom-2 duration-300",
        achieved && "border-[#059669]/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-text-secondary">{label}</span>
        {achieved && (
          <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] ml-auto animate-in zoom-in-50 duration-500" />
        )}
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sublabel && (
        <p className="text-[10px] text-text-secondary mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

// ─── Milestone Timeline ──────────────────────────────────────────────

function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-text-primary">
          Milestone Timeline
        </h3>
      </div>
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {milestones.map((milestone, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  milestone.achieved
                    ? "bg-[#059669] text-white"
                    : "bg-gray-100 border-2 border-gray-300"
                )}
              >
                {milestone.achieved ? (
                  <CheckCircle2 className="h-4 w-4 animate-in zoom-in-50 duration-300" />
                ) : (
                  <Circle className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm",
                    milestone.achieved
                      ? "text-text-primary font-medium"
                      : "text-text-secondary"
                  )}
                >
                  {milestone.name}
                </p>
                {milestone.achieved && milestone.achieved_at && (
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {new Date(milestone.achieved_at).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Progress Readiness Bar ──────────────────────────────────────────

function ReadinessBar({ milestones }: { milestones: Milestone[] }) {
  const achieved = milestones.filter((m) => m.achieved).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-text-primary">
            Transition Readiness
          </h3>
        </div>
        <span className="text-sm font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-text-secondary mt-2">
        {achieved} of {total} milestones reached
      </p>
    </div>
  );
}

// ─── Streak Counter ──────────────────────────────────────────────────

function StreakCounter({ days }: { days: number }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 transition-default hover:shadow-md hover:border-primary animate-in fade-in slide-in-from-bottom-2 duration-300",
        days >= 7 && "border-[#D97706]/30 bg-[#D97706]/[0.02]"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Flame
          className={cn(
            "h-4 w-4 transition-all duration-300",
            days > 0 ? "text-[#D97706]" : "text-gray-400",
            days >= 7 && "animate-pulse"
          )}
        />
        <span className="text-xs text-text-secondary">Streak</span>
      </div>
      <p className="text-2xl font-semibold text-text-primary">
        {days} {days === 1 ? "day" : "days"}
      </p>
      {days > 0 && (
        <p className="text-[10px] text-[#D97706] mt-0.5 animate-in fade-in duration-500">
          {days >= 7 ? "Incredible streak!" : "Keep it going!"}
        </p>
      )}
    </div>
  );
}

// ─── Progress Tracker Section ─────────────────────────────────────────

function ProgressTracker() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/employee/progress");
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to load progress data"
        );
      }
      const json = await res.json();
      setData(json.data as ProgressData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load progress"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return <TrackerSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="mt-8 pt-8 border-t border-border">
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-secondary mb-4">
            {error ?? "Unable to load progress data"}
          </p>
          <Button onClick={fetchProgress} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-border space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">
          Progress Tracker
        </h2>
      </div>

      {/* Readiness bar */}
      <ReadinessBar milestones={data.milestones} />

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<FileText className="h-4 w-4 text-primary" />}
          label="Resumes"
          value={data.resumes_completed}
          sublabel={data.resumes_completed > 0 ? "Completed" : "Not started"}
          achieved={data.resumes_completed > 0}
        />
        <MetricCard
          icon={<Linkedin className="h-4 w-4 text-blue-600" />}
          label="LinkedIn"
          value={data.linkedin_updated ? "Updated" : "Pending"}
          achieved={data.linkedin_updated}
        />
        <MetricCard
          icon={<Briefcase className="h-4 w-4 text-[#059669]" />}
          label="Applications"
          value={data.applications_tracked}
          sublabel="Tracked"
          achieved={data.applications_tracked > 0}
        />
        <MetricCard
          icon={<MessageSquare className="h-4 w-4 text-[#D97706]" />}
          label="Outreach"
          value={data.outreach_sent}
          sublabel="Messages sent"
          achieved={data.outreach_sent > 0}
        />
        <MetricCard
          icon={<Mic className="h-4 w-4 text-purple-600" />}
          label="Mock Interviews"
          value={data.interviews_practiced}
          sublabel="Completed"
          achieved={data.interviews_practiced > 0}
        />
        <MetricCard
          icon={<Award className="h-4 w-4 text-[#059669]" />}
          label="Interviews Landed"
          value={data.interviews_landed}
          achieved={data.interviews_landed > 0}
        />
      </div>

      {/* Streak counter */}
      <StreakCounter days={data.current_streak_days} />

      {/* Weekly activity chart */}
      {data.weekly_activity.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-text-primary">
              Weekly Activity
            </h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.weekly_activity}
                margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(w: number) => `Wk ${w}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value) => [String(value), "Actions"]}
                  labelFormatter={(w) => `Week ${w}`}
                />
                <Bar
                  dataKey="actions"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Confidence history chart */}
      {data.confidence_history.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[#059669]" />
            <h3 className="text-sm font-medium text-text-primary">
              Confidence Over Time
            </h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.confidence_history}
                margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(w: number) => `Wk ${w}`}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value) => [
                    `${value}/5`,
                    "Confidence",
                  ]}
                  labelFormatter={(w) => `Week ${w}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#059669" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Milestone timeline */}
      <MilestoneTimeline milestones={data.milestones} />
    </div>
  );
}

// ─── Weekly Plan Content ─────────────────────────────────────────────

function WeeklyPlanSection() {
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

  // Computed values
  const activeItems = plan?.items.filter((i) => !i.is_deferred) ?? [];
  const completedCount = activeItems.filter((i) => i.is_completed).length;
  const totalActive = activeItems.length;
  const progressPct =
    totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;

  // Loading
  if (loading) {
    return <PlanSkeleton />;
  }

  // Error with no plan
  if (error && !plan) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-secondary mb-4">{error}</p>
        <Button onClick={fetchPlan} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // No plan yet — generate CTA
  if (!plan) {
    return (
      <>
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
      </>
    );
  }

  // Plan display
  return (
    <div className="space-y-6">
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
                        CATEGORY_COLORS[item.category] ??
                          CATEGORY_COLORS.other
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
        <div className="max-w-2xl mx-auto px-4 py-8">
          <WeeklyPlanSection />
          <ProgressTracker />
        </div>
      </DashboardLayout>
    </EmployeeRoute>
  );
}
