"use client";

/**
 * Transition Outcomes — Screen E5
 *
 * Placement metrics, exports, renewal data.
 * All data is aggregated — no individual employee data.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Heart,
  Info,
  Loader2,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface OutcomeData {
  total_engaged: number;
  pct_engaged: number;
  pct_interview_ready: number;
  avg_time_to_first_interview_days: number;
  avg_confidence_lift: number;
  opt_in_placement_rate: number;
  opt_in_count: number;
  avg_time_to_placement_days: number;
  avg_satisfaction: number;
  note: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────

function MetricCardSkeleton() {
  return (
    <div className="bg-surface rounded-sm border border-border p-5">
      <div className="h-4 w-24 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer mb-3" />
      <div className="h-8 w-16 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer mb-2" />
      <div className="h-3 w-32 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer" />
    </div>
  );
}

function OutcomesSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer mb-2" />
          <div className="h-4 w-64 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer" />
          <div className="h-10 w-32 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer" />
        </div>
      </div>
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
}

function MetricCard({
  label,
  value,
  subtitle,
  icon,
  accentColor = "#2563EB",
}: MetricCardProps) {
  return (
    <div className="bg-surface rounded-sm border border-border p-5 transition-default hover:shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-sm"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          {icon}
        </div>
      </div>
      <p
        className="text-2xl font-bold font-mono"
        style={{ color: accentColor }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

function TransitionOutcomesPage() {
  const [data, setData] = useState<OutcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const fetchOutcomes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/employer/outcomes");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Failed to load outcome data"
        );
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load outcome data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  // ── Export handlers ────────────────────────────────────────────────

  const handleExport = async (format: "pdf" | "csv") => {
    const setExporting = format === "pdf" ? setExportingPdf : setExportingCsv;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/v1/employer/outcomes/export?format=${format}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? `Failed to generate ${format.toUpperCase()} export`
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "pdf"
          ? `transition-summary-${new Date().toISOString().slice(0, 10)}.pdf`
          : `usage-data-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to export ${format.toUpperCase()}`
      );
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <EmployerRoute>
        <EmployerLayout>
          <div className="px-6 py-8 max-w-7xl mx-auto">
            <OutcomesSkeleton />
          </div>
        </EmployerLayout>
      </EmployerRoute>
    );
  }

  if (error) {
    return (
      <EmployerRoute>
        <EmployerLayout>
          <div className="px-6 py-8 max-w-7xl mx-auto">
            <div className="bg-surface rounded-sm border border-border p-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#DC2626]/10 mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-[#DC2626]" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Unable to Load Outcomes
              </h2>
              <p className="text-sm text-text-secondary mb-4">{error}</p>
              <Button onClick={fetchOutcomes} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        </EmployerLayout>
      </EmployerRoute>
    );
  }

  if (!data) return null;

  const hasNoActivity = data.total_engaged === 0 && data.opt_in_count === 0;

  return (
    <EmployerRoute>
      <EmployerLayout>
        <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Transition Outcomes
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Aggregated placement and engagement metrics for your program
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={exportingCsv || hasNoActivity}
                className="gap-2"
              >
                {exportingCsv ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={exportingPdf || hasNoActivity}
                className="gap-2 bg-primary text-white hover:bg-primary/90"
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export PDF Report
              </Button>
            </div>
          </div>

          {/* ── Sample size note ─────────────────────────────────── */}
          {data.note && (
            <div className="flex items-start gap-3 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-sm px-4 py-3">
              <Info className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-sm text-text-secondary">{data.note}</p>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────── */}
          {hasNoActivity && (
            <div className="bg-surface rounded-sm border border-border p-10 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#2563EB]/10 mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-[#2563EB]" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                No Outcome Data Yet
              </h2>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Outcome metrics will appear here as employees activate and
                engage with the transition support program. Encourage employees
                to complete their onboarding and check-ins.
              </p>
            </div>
          )}

          {/* ── Engagement Metrics ───────────────────────────────── */}
          {!hasNoActivity && (
            <>
              <div>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Engagement
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Engaged"
                    value={`${Math.round(data.pct_engaged * 100)}%`}
                    subtitle={`${data.total_engaged} employees logged in 3+ times`}
                    icon={<Users className="h-4 w-4 text-[#2563EB]" />}
                  />
                  <MetricCard
                    label="Interview Ready"
                    value={`${Math.round(data.pct_interview_ready * 100)}%`}
                    subtitle="Completed resume + mock interview"
                    icon={<UserCheck className="h-4 w-4 text-[#059669]" />}
                    accentColor="#059669"
                  />
                  <MetricCard
                    label="Avg. Time to First Interview"
                    value={`${data.avg_time_to_first_interview_days} days`}
                    subtitle="From profile creation"
                    icon={<Clock className="h-4 w-4 text-[#D97706]" />}
                    accentColor="#D97706"
                  />
                  <MetricCard
                    label="Satisfaction"
                    value={`${data.avg_satisfaction}/5`}
                    subtitle="Average self-reported score"
                    icon={<Star className="h-4 w-4 text-[#2563EB]" />}
                  />
                </div>
              </div>

              {/* ── Outcome Metrics ──────────────────────────────── */}
              <div>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Outcomes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Confidence Lift"
                    value={`+${data.avg_confidence_lift}`}
                    subtitle="Average improvement on 1–5 scale"
                    icon={<TrendingUp className="h-4 w-4 text-[#059669]" />}
                    accentColor="#059669"
                  />
                  <MetricCard
                    label="Placement Rate (Opt-in)"
                    value={`${Math.round(data.opt_in_placement_rate * 100)}%`}
                    subtitle={`${data.opt_in_count} self-report${data.opt_in_count !== 1 ? "s" : ""}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-[#2563EB]" />}
                  />
                  <MetricCard
                    label="Time to Placement"
                    value={`${data.avg_time_to_placement_days} days`}
                    subtitle="Of those who self-reported"
                    icon={<Clock className="h-4 w-4 text-[#D97706]" />}
                    accentColor="#D97706"
                  />
                  <MetricCard
                    label="Self-Reports"
                    value={String(data.opt_in_count)}
                    subtitle="Employees sharing outcome data"
                    icon={<Heart className="h-4 w-4 text-[#8B5CF6]" />}
                    accentColor="#8B5CF6"
                  />
                </div>
              </div>

              {/* ── Export CTA ───────────────────────────────────── */}
              <div className="bg-surface rounded-sm border border-border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-[#2563EB]/10 shrink-0">
                      <FileText className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        Board-Ready Summary Report
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Download a formatted PDF with key metrics, outcomes, and
                        module usage — ready to share with leadership.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleExport("pdf")}
                    disabled={exportingPdf}
                    className="gap-2 bg-primary text-white hover:bg-primary/90 shrink-0"
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </EmployerLayout>
    </EmployerRoute>
  );
}

export default TransitionOutcomesPage;
