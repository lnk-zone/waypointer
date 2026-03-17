"use client";

/**
 * Employer Dashboard — Screen E4
 *
 * Aggregated usage analytics. No individual employee data.
 * Metric cards, activations chart, engagement chart, activity heatmap,
 * inactive user count with re-engagement button.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  Mic,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";

const ActivationsChart = dynamic(
  () =>
    import("@/components/charts/employer-dashboard-charts").then(
      (m) => m.ActivationsChart
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> }
);
const EngagementChart = dynamic(
  () =>
    import("@/components/charts/employer-dashboard-charts").then(
      (m) => m.EngagementChart
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> }
);

function DashboardChartSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="h-4 w-40 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] mb-4" />
      <div className="h-[200px] animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────

interface DashboardData {
  seats_purchased: number;
  seats_activated: number;
  onboarding_completion_rate: number;
  resume_completion_rate: number;
  interview_practice_rate: number;
  weekly_active_rate: number;
  avg_satisfaction_score: number;
  activations_by_day: Array<{ date: string; count: number }>;
  engagement_by_module: Array<{ module: string; usage_count: number }>;
  inactive_count: number;
  activity_heatmap: Record<string, number>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <div className="h-64 animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  subtext,
  Icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-xl font-semibold text-text-primary">{value}</p>
      {subtext && (
        <p className="text-[10px] text-text-secondary mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────

const HEATMAP_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const HEATMAP_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div className="flex items-end gap-2">
      {HEATMAP_DAYS.map((day) => {
        const count = data[day] ?? 0;
        const intensity = maxVal > 0 ? count / maxVal : 0;

        return (
          <div key={day} className="flex-1 text-center">
            <div
              className="mx-auto rounded-sm transition-default"
              style={{
                width: "100%",
                maxWidth: "48px",
                height: "32px",
                backgroundColor:
                  intensity === 0
                    ? "#F3F4F6"
                    : `rgba(37, 99, 235, ${0.2 + intensity * 0.8})`,
              }}
              title={`${HEATMAP_LABELS[day]}: ${count} actions`}
            />
            <p className="text-[9px] text-text-secondary mt-1">
              {HEATMAP_LABELS[day]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dashboard Content ────────────────────────────────────────────────

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reengaging, setReengaging] = useState(false);
  const [reengageResult, setReengageResult] = useState<string | null>(null);
  const [reengageSuccess, setReengageSuccess] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      // Get program ID first
      const programRes = await fetch("/api/v1/employer/program/active");
      if (!programRes.ok) {
        setError("No active program found. Create a program first.");
        return;
      }
      const programData = await programRes.json();
      setProgramId(programData.data.id);

      const res = await fetch("/api/v1/employer/dashboard");
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to load dashboard"
        );
      }
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Polling every 30 seconds per MP §7
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-engage
  const handleReengage = useCallback(async () => {
    if (!programId) return;

    setReengaging(true);
    setReengageResult(null);
    setReengageSuccess(false);

    try {
      const res = await fetch("/api/v1/employer/reengage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programId,
          inactive_days_threshold: 7,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send re-engagement emails");
      }

      const json = await res.json();
      setReengageResult(
        `${json.data.sent} re-engagement email${json.data.sent !== 1 ? "s" : ""} sent`
      );
      setReengageSuccess(true);
    } catch {
      setReengageResult("Failed to send re-engagement emails");
      setReengageSuccess(false);
    } finally {
      setReengaging(false);
    }
  }, [programId]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[#DC2626] mx-auto mb-2" />
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activationPct =
    data.seats_purchased > 0
      ? ((data.seats_activated / data.seats_purchased) * 100).toFixed(1)
      : "0";

  // Empty state: no employees activated
  if (data.seats_activated === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          Dashboard
        </h1>
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <AlertCircle className="h-10 w-10 text-[#D97706] mx-auto mb-3" />
          <h2 className="text-lg font-medium text-text-primary mb-1">
            No employees have activated yet
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-4">
            Consider resending invites or checking spam filters. Employees need
            to click the invitation link and create an account to activate.
          </p>
          <div className="flex items-center justify-center gap-3">
            <MetricCard
              label="Seats Purchased"
              value={String(data.seats_purchased)}
              Icon={Users}
            />
            <MetricCard
              label="Seats Activated"
              value="0"
              subtext="0% activation rate"
              Icon={UserCheck}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">
        Dashboard
      </h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Seats Purchased"
          value={String(data.seats_purchased)}
          Icon={Users}
        />
        <MetricCard
          label="Activated"
          value={String(data.seats_activated)}
          subtext={`${activationPct}% activation rate`}
          Icon={UserCheck}
        />
        <MetricCard
          label="Onboarding"
          value={`${(data.onboarding_completion_rate * 100).toFixed(1)}%`}
          subtext="of activated"
          Icon={ClipboardList}
        />
        <MetricCard
          label="Resume Completion"
          value={`${(data.resume_completion_rate * 100).toFixed(1)}%`}
          subtext="of activated"
          Icon={FileText}
        />
        <MetricCard
          label="Interview Practice"
          value={`${(data.interview_practice_rate * 100).toFixed(1)}%`}
          subtext="of activated"
          Icon={Mic}
        />
        <MetricCard
          label="Weekly Active"
          value={`${(data.weekly_active_rate * 100).toFixed(1)}%`}
          subtext="of activated"
          Icon={TrendingUp}
        />
        <MetricCard
          label="Satisfaction"
          value={data.avg_satisfaction_score > 0 ? `${data.avg_satisfaction_score}/5` : "N/A"}
          Icon={Star}
        />
        <MetricCard
          label="Inactive Users"
          value={String(data.inactive_count)}
          subtext="7+ days inactive"
          Icon={Zap}
        />
      </div>

      {/* Charts Row (lazy-loaded) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ActivationsChart data={data.activations_by_day} />
        <EngagementChart data={data.engagement_by_module} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity Heatmap */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            Activity by Day of Week
          </h3>
          <ActivityHeatmap data={data.activity_heatmap} />
        </div>

        {/* Inactive Users / Re-engagement */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary" />
            Re-engagement
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {data.inactive_count > 0
              ? `${data.inactive_count} user${data.inactive_count > 1 ? "s" : ""} haven't been active in 7+ days.`
              : "All users have been active in the last 7 days."}
          </p>

          {data.inactive_count > 0 && (
            <Button
              onClick={handleReengage}
              disabled={reengaging}
              size="sm"
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {reengaging
                ? "Sending..."
                : "Send re-engagement email"}
            </Button>
          )}

          {reengageResult && (
            <div
              className={cn(
                "mt-3 rounded-md px-3 py-2 flex items-start gap-2",
                reengageSuccess
                  ? "border border-[#059669]/20 bg-[#059669]/5"
                  : "border border-[#DC2626]/20 bg-[#DC2626]/5"
              )}
            >
              {reengageSuccess ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#059669]" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-[#DC2626]" />
              )}
              <p
                className={cn(
                  "text-xs",
                  reengageSuccess ? "text-[#059669]" : "text-[#DC2626]"
                )}
              >
                {reengageResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function EmployerDashboardPage() {
  return (
    <EmployerRoute>
      <EmployerLayout>
        <DashboardContent />
      </EmployerLayout>
    </EmployerRoute>
  );
}
