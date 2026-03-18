"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  FileText,
  Briefcase,
  Mic,
  Linkedin,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import type {
  DailyPlan,
  TimelineMilestone,
  ReadinessBreakdown,
} from "@/lib/validators/ai";

// ─── Types ────────────────────────────────────────────────────────────

interface TransitionPlan {
  plan_id: string;
  search_strategy: string;
  readiness_score: number;
  readiness_breakdown: ReadinessBreakdown;
  first_week_plan: DailyPlan[];
  suggested_timeline: TimelineMilestone[];
}

interface SelectedPath {
  id: string;
  title: string;
  is_primary: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────

const CONTEXTUAL_MESSAGES = [
  { text: "Building your transition plan...", delay: 0 },
  { text: "Analyzing your career trajectory...", delay: 4000 },
  { text: "Designing your first week...", delay: 8000 },
  { text: "Mapping your 90-day timeline...", delay: 12000 },
];

const LONG_WAIT_THRESHOLD = 18000;
const LONG_WAIT_MESSAGE = "Almost there...";

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const READINESS_AREAS: { key: keyof ReadinessBreakdown; label: string }[] = [
  { key: "resume", label: "Resume" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "jobs", label: "Job Search" },
  { key: "outreach", label: "Outreach" },
  { key: "interviews", label: "Interviews" },
];

const QUICK_ACTIONS = [
  { label: "Build my resumes", href: "/resumes", Icon: FileText },
  { label: "Update my LinkedIn", href: "/linkedin", Icon: Linkedin },
  { label: "See recommended jobs", href: "/jobs", Icon: Briefcase },
  { label: "Practice interviews", href: "/interviews", Icon: Mic },
] as const;

// ─── Loading Skeleton ─────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className={cn("h-8 w-72", SKELETON_CLASS)} />
        <div className="flex gap-2">
          <div className={cn("h-7 w-40 rounded-full", SKELETON_CLASS)} />
          <div className={cn("h-7 w-48 rounded-full", SKELETON_CLASS)} />
        </div>
        <div className="space-y-2">
          <div className={cn("h-4 w-full", SKELETON_CLASS)} />
          <div className={cn("h-4 w-4/5", SKELETON_CLASS)} />
        </div>
      </div>

      {/* Readiness + Week plan row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-md border border-border p-6 space-y-4">
          <div className={cn("h-6 w-40", SKELETON_CLASS)} />
          <div className={cn("h-24 w-24 rounded-full mx-auto", SKELETON_CLASS)} />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("h-3 w-full", SKELETON_CLASS)} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-md border border-border p-6 space-y-4">
          <div className={cn("h-6 w-48", SKELETON_CLASS)} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className={cn("h-8 w-8 rounded-full shrink-0", SKELETON_CLASS)} />
              <div className="flex-1 space-y-1.5">
                <div className={cn("h-4 w-full", SKELETON_CLASS)} />
                <div className={cn("h-4 w-3/4", SKELETON_CLASS)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-md border border-border p-6 space-y-4">
        <div className={cn("h-6 w-48", SKELETON_CLASS)} />
        <div className={cn("h-2 w-full rounded-full", SKELETON_CLASS)} />
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn("h-4 w-20", SKELETON_CLASS)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Readiness Score Ring ─────────────────────────────────────────────

function ReadinessRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#2563EB"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-semibold text-text-primary">
          {score}%
        </span>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contextualMessage, setContextualMessage] = useState(CONTEXTUAL_MESSAGES[0].text);
  const [showLongWait, setShowLongWait] = useState(false);
  const [progressPhase, setProgressPhase] = useState(0);

  const [plan, setPlan] = useState<TransitionPlan | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<SelectedPath[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [liveReadiness, setLiveReadiness] = useState<{ score: number; breakdown: ReadinessBreakdown } | null>(null);

  const generationStarted = useRef(false);
  const messageTimers = useRef<NodeJS.Timeout[]>([]);
  const longWaitTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch live readiness from progress API (single source of truth)
  useEffect(() => {
    async function fetchReadiness() {
      try {
        const res = await fetch("/api/v1/employee/progress");
        if (!res.ok) return;
        const json = await res.json();
        const d = json.data;
        if (d && typeof d.readiness_score === "number") {
          setLiveReadiness({
            score: d.readiness_score,
            breakdown: {
              resume: d.resumes_completed > 0 ? 100 : 0,
              linkedin: d.linkedin_updated ? 100 : 0,
              jobs: d.applications_tracked > 0 ? 100 : 0,
              outreach: d.outreach_sent > 0 ? 100 : 0,
              interviews: d.interviews_practiced > 0 ? 100 : 0,
            },
          });
        }
      } catch {
        // Non-critical
      }
    }
    fetchReadiness();
  }, []);

  const clearTimers = useCallback(() => {
    messageTimers.current.forEach(clearTimeout);
    messageTimers.current = [];
    if (longWaitTimer.current) {
      clearTimeout(longWaitTimer.current);
      longWaitTimer.current = null;
    }
  }, []);

  // Parse plan response data (shared between fetch and generate)
  const handlePlanResponse = useCallback((planData: Record<string, unknown>) => {
    setPlan({
      plan_id: planData.plan_id as string,
      search_strategy: planData.search_strategy as string,
      readiness_score: planData.readiness_score as number,
      readiness_breakdown: planData.readiness_breakdown as ReadinessBreakdown,
      first_week_plan: planData.first_week_plan as DailyPlan[],
      suggested_timeline: planData.suggested_timeline as TimelineMilestone[],
    });

    if (planData.selected_paths) {
      setSelectedPaths(planData.selected_paths as SelectedPath[]);
    }
  }, []);

  // Generate a new plan via AI
  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowLongWait(false);
    setProgressPhase(0);
    setContextualMessage(CONTEXTUAL_MESSAGES[0].text);

    // Contextual message rotation
    for (let i = 1; i < CONTEXTUAL_MESSAGES.length; i++) {
      const timer = setTimeout(() => {
        setContextualMessage(CONTEXTUAL_MESSAGES[i].text);
        setProgressPhase(i);
      }, CONTEXTUAL_MESSAGES[i].delay);
      messageTimers.current.push(timer);
    }

    longWaitTimer.current = setTimeout(() => {
      setShowLongWait(true);
      setProgressPhase(CONTEXTUAL_MESSAGES.length);
    }, LONG_WAIT_THRESHOLD);

    try {
      const planRes = await fetch("/api/v1/employee/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      clearTimers();

      if (!planRes.ok) {
        const json = await planRes.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to generate transition plan");
        setLoading(false);
        return;
      }

      handlePlanResponse(await planRes.json());
      setLoading(false);
    } catch {
      clearTimers();
      setError("Something went wrong while generating your plan. Please try again.");
      setLoading(false);
    }
  }, [clearTimers, handlePlanResponse]);

  // On mount: fetch existing plan first, generate only if none exists
  useEffect(() => {
    if (generationStarted.current) return;
    generationStarted.current = true;

    async function loadPlan() {
      setLoading(true);

      // Try fetching an existing plan first
      try {
        const existingRes = await fetch("/api/v1/employee/plan");
        if (existingRes.ok) {
          handlePlanResponse(await existingRes.json());
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to generate
      }

      // No existing plan — generate one
      await generatePlan();
    }

    loadPlan();

    return () => {
      clearTimers();
    };
  }, [generatePlan, clearTimers, handlePlanResponse]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await generatePlan();
    setRetrying(false);
  }, [generatePlan]);

  // ─── Error State ───────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="space-y-6 text-center max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
            <AlertCircle className="h-8 w-8 text-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="text-h1 text-text-primary">
              Couldn&rsquo;t build your plan
            </h1>
            <p className="text-body text-text-secondary">{error}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full rounded-sm"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "Retrying..." : "Try again"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/onboarding/paths")}
            >
              Back to role paths
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-h1 text-text-primary transition-default">
              {contextualMessage}
            </h1>
            <p className="text-body text-text-secondary">
              {showLongWait ? LONG_WAIT_MESSAGE : "This usually takes 10\u201320 seconds"}
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: ["25%", "45%", "65%", "80%", "90%"][progressPhase] ?? "90%",
                  transition: "width 2s ease-out",
                }}
              />
            </div>
          </div>

          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!plan) return null;

  // ─── Results State ─────────────────────────────────────────────────

  const primaryPath = selectedPaths.find((p) => p.is_primary);
  const secondaryPathsList = selectedPaths.filter((p) => !p.is_primary);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* ── Header Section ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <h1 className="text-h1 text-text-primary">Your transition plan</h1>

        {/* Selected paths pills */}
        {selectedPaths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {primaryPath && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {primaryPath.title}
              </span>
            )}
            {secondaryPathsList.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full bg-muted/10 px-3 py-1.5 text-sm font-medium text-text-secondary"
              >
                {p.title}
              </span>
            ))}
          </div>
        )}

        {/* Search strategy */}
        <p className="text-body text-text-secondary leading-relaxed">
          {plan.search_strategy}
        </p>
      </div>

      {/* ── Readiness + Week Plan Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Score Card */}
        <div className="rounded-md border border-border bg-surface p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Readiness score
          </h2>

          <div className="flex justify-center">
            <ReadinessRing score={liveReadiness?.score ?? plan.readiness_score} />
          </div>

          {/* Breakdown bars */}
          <div className="space-y-3">
            {READINESS_AREAS.map(({ key, label }) => {
              const breakdown = liveReadiness?.breakdown ?? plan.readiness_breakdown;
              const value = breakdown[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-medium text-text-primary">{value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        value === 0 ? "bg-border" : "bg-primary"
                      )}
                      style={{ width: `${Math.max(value, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* First 7-Day Plan */}
        <div className="lg:col-span-2 rounded-md border border-border bg-surface p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Your first 7 days
          </h2>

          <div className="space-y-4">
            {plan.first_week_plan.map((day) => (
              <div key={day.day} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {DAY_LABELS[day.day - 1] ?? `D${day.day}`}
                </div>
                <div className="flex-1 space-y-1 pt-1">
                  {day.tasks.map((task, idx) => (
                    <p
                      key={idx}
                      className="text-sm text-text-secondary leading-5"
                    >
                      {task}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold text-text-primary">
          Get started
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, href, Icon }) => (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className={cn(
                "flex items-center gap-3 rounded-md border border-border bg-surface p-4",
                "text-left transition-default",
                "hover:border-primary/30 hover:shadow-sm"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-text-primary">
                {label}
              </span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </button>
          ))}
        </div>
      </div>

      {/* ── 90-Day Timeline ────────────────────────────────────────── */}
      <div className="rounded-md border border-border bg-surface p-6 space-y-6">
        <h2 className="text-[15px] font-semibold text-text-primary">
          90-day timeline
        </h2>

        {/* Timeline visual */}
        <div className="relative">
          {/* Track */}
          <div className="h-1 w-full rounded-full bg-border" />

          {/* Milestones */}
          <div className="mt-4 space-y-0">
            {plan.suggested_timeline.map((milestone, idx) => {
              const isLast = idx === plan.suggested_timeline.length - 1;

              return (
                <div
                  key={milestone.week}
                  className="relative flex items-start gap-3 pb-6 last:pb-0"
                >
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />
                  )}

                  {/* Dot */}
                  <div
                    className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      idx === 0
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface"
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        idx === 0 ? "bg-primary" : "bg-muted"
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-muted">
                        Week {milestone.week}
                      </span>
                      <span className="text-sm font-semibold text-text-primary">
                        {milestone.milestone}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
