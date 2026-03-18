"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  ChevronDown,
  Clock,
  DollarSign,
  Lightbulb,
  MessageCircle,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface RolePath {
  id: string;
  title: string;
  is_primary: boolean;
}

interface SavedJob {
  id: string;
  job_match_id: string;
  job_title: string;
  company_name: string;
}

interface PrepQuestion {
  question: string;
  suggested_answer: string;
}

interface PrepData {
  role_path: { id: string; title: string };
  company_context?: { company_name: string; job_title: string };
  common_questions: PrepQuestion[] | string[];
  behavioral_questions: PrepQuestion[] | string[];
  company_specific: PrepQuestion[] | string[];
  strengths_to_emphasize: string[];
  weak_spots_to_prepare: string[];
  compensation_prep: string;
}

interface InterviewSession {
  id: string;
  overall_score: number | null;
  clarity_score: number | null;
  specificity_score: number | null;
  confidence_score: number | null;
  format: string;
  completed_at: string;
  feedback_generated: boolean;
}

interface PerformanceData {
  sessions: InterviewSession[];
  totalCompleted: number;
  averageScore: number | null;
  strongestArea: string | null;
  weakestArea: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "mixed", label: "Mixed" },
] as const;

const DURATION_OPTIONS = [
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "challenging", label: "Challenging" },
] as const;

const SCORE_AREAS = [
  { key: "clarity_score" as const, label: "Clarity" },
  { key: "specificity_score" as const, label: "Specificity" },
  { key: "confidence_score" as const, label: "Confidence" },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function computePerformance(sessions: InterviewSession[]): PerformanceData {
  const completed = sessions.filter((s) => s.overall_score !== null);
  const totalCompleted = completed.length;

  if (totalCompleted === 0) {
    return {
      sessions,
      totalCompleted: 0,
      averageScore: null,
      strongestArea: null,
      weakestArea: null,
    };
  }

  const avgOverall =
    completed.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / totalCompleted;

  // Calculate average per area
  const areaAverages = SCORE_AREAS.map((area) => {
    const scored = completed.filter((s) => s[area.key] !== null);
    if (scored.length === 0) return { label: area.label, avg: 0 };
    const avg =
      scored.reduce((sum, s) => sum + (s[area.key] ?? 0), 0) / scored.length;
    return { label: area.label, avg };
  }).filter((a) => a.avg > 0);

  let strongestArea: string | null = null;
  let weakestArea: string | null = null;

  if (areaAverages.length > 0) {
    const sorted = [...areaAverages].sort((a, b) => b.avg - a.avg);
    strongestArea = sorted[0].label;
    weakestArea = sorted[sorted.length - 1].label;
    // Only differ if there's actually a difference
    if (strongestArea === weakestArea && sorted.length > 1) {
      weakestArea = sorted[1].label;
    }
  }

  return {
    sessions,
    totalCompleted,
    averageScore: Math.round(avgOverall),
    strongestArea,
    weakestArea,
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────

function InterviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role paths
  const [paths, setPaths] = useState<RolePath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>("");

  // Saved/applied jobs for company-specific prep
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobMatchId, setSelectedJobMatchId] = useState<string>("");

  // Prep data
  const [prep, setPrep] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Performance sidebar
  const [performance, setPerformance] = useState<PerformanceData | null>(null);

  // Mock interview config modal
  const [showModal, setShowModal] = useState(false);
  const [interviewType, setInterviewType] = useState<"general" | "company">(
    "general"
  );
  const [interviewJobId, setInterviewJobId] = useState<string>("");
  const [interviewFormat, setInterviewFormat] = useState<string>("behavioral");
  const [interviewDuration, setInterviewDuration] = useState<number>(15);
  const [interviewDifficulty, setInterviewDifficulty] =
    useState<string>("standard");
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

  // Fetch role paths, saved/applied jobs, and performance data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch role paths
        const pathsRes = await fetch("/api/v1/employee/paths");
        if (pathsRes.ok) {
          const json = await pathsRes.json();
          const pathList = json.data ?? json;
          if (Array.isArray(pathList)) {
            const selected = pathList.filter(
              (p: RolePath & { is_selected?: boolean }) =>
                p.is_selected === true
            );
            const mapped = selected.map((p: RolePath) => ({
              id: p.id,
              title: p.title,
              is_primary: p.is_primary,
            }));
            setPaths(mapped);
            const primary = mapped.find((p: RolePath) => p.is_primary);
            if (primary) setSelectedPathId(primary.id);
          }
        }

        // Fetch saved and applied jobs from applications table
        const appsRes = await fetch("/api/v1/employee/applications?limit=50");
        if (appsRes.ok) {
          const json = await appsRes.json();
          const apps = json.data ?? [];
          const jobs: SavedJob[] = apps
            .filter(
              (a: { job_title?: string; company_name?: string; job_match_id?: string }) =>
                a.job_title && a.company_name && a.job_match_id
            )
            .map(
              (a: {
                id: string;
                job_match_id: string;
                job_title: string;
                company_name: string;
              }) => ({
                id: a.id,
                job_match_id: a.job_match_id,
                job_title: a.job_title,
                company_name: a.company_name,
              })
            );
          setSavedJobs(jobs);
        }
      } catch {
        // Non-critical
      }
    }
    fetchData();
  }, []);

  // Fetch interview performance data
  useEffect(() => {
    async function fetchPerformance() {
      try {
        const res = await fetch("/api/v1/employee/interviews/performance");
        if (res.ok) {
          const json = await res.json();
          const sessions: InterviewSession[] = json.data ?? [];
          setPerformance(computePerformance(sessions));
        }
      } catch {
        // Non-critical — sidebar simply won't show
      }
    }
    fetchPerformance();
  }, []);

  // Auto-open mock interview modal when navigated with ?start_mock=true
  useEffect(() => {
    if (searchParams.get("start_mock") === "true" && paths.length > 0) {
      const pathIdParam = searchParams.get("path_id");
      if (pathIdParam && paths.some((p) => p.id === pathIdParam)) {
        setSelectedPathId(pathIdParam);
      }
      setShowModal(true);
    }
  }, [searchParams, paths]);

  // Check ElevenLabs availability when modal opens
  useEffect(() => {
    if (!showModal) return;
    setVoiceAvailable(null);
    fetch("/api/v1/employee/interviews/health")
      .then((r) => r.json())
      .then((json) => {
        setVoiceAvailable(json?.data?.available === true);
      })
      .catch(() => {
        setVoiceAvailable(false);
      });
  }, [showModal]);

  // Fetch interview prep (with optional regenerate flag)
  const fetchPrep = useCallback(
    async (forceRegenerate = false) => {
      if (!selectedPathId) return;

      setLoading(true);
      setError(null);
      setIsCached(false);

      try {
        const params = new URLSearchParams();
        params.set("path_id", selectedPathId);
        if (selectedJobMatchId) {
          params.set("job_match_id", selectedJobMatchId);
        }
        if (forceRegenerate) {
          params.set("regenerate", "true");
        }

        const res = await fetch(
          `/api/v1/employee/interviews/prep?${params.toString()}`
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ??
              "Failed to generate interview prep materials"
          );
        }

        const json = await res.json();
        setPrep(json.data as PrepData);
        setIsCached(json.cached === true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate interview prep materials"
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedPathId, selectedJobMatchId]
  );

  // Auto-fetch prep when path or job context changes
  const [lastFetchKey, setLastFetchKey] = useState<string>("");
  useEffect(() => {
    if (!selectedPathId) return;
    const fetchKey = `${selectedPathId}:${selectedJobMatchId}`;
    if (fetchKey !== lastFetchKey) {
      setLastFetchKey(fetchKey);
      fetchPrep();
    }
  }, [selectedPathId, selectedJobMatchId, lastFetchKey, fetchPrep]);

  return (
    <div className="flex gap-6 max-w-6xl mx-auto px-4 md:px-8 py-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Interview Prep Hub
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Role-specific preparation to ace your interviews
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            disabled={!selectedPathId || loading}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Mock Interview
          </Button>
        </div>

        {/* Path and Context selectors */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Role path selector */}
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">
              Role Path
            </label>
            <div className="relative">
              <select
                value={selectedPathId}
                onChange={(e) => {
                  setSelectedPathId(e.target.value);
                  setPrep(null);
                }}
                className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">Select a role path</option>
                {paths.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.is_primary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Context dropdown (General + saved/applied jobs) */}
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">
              Context{" "}
              <span className="text-text-secondary/60">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={selectedJobMatchId}
                onChange={(e) => {
                  setSelectedJobMatchId(e.target.value);
                  setPrep(null);
                }}
                className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">General</option>
                {savedJobs.map((j) => (
                  <option key={j.id} value={j.job_match_id}>
                    {j.company_name} — {j.job_title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Regenerate button (shown when content is loaded from cache) */}
        {!loading && prep && isCached && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              Loaded from cache
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPrep(true)}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-surface p-5">
              <div className="rounded-sm bg-primary-light p-4 text-center">
                <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-primary">
                  Preparing your interview materials...
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Analyzing your profile and target role
                </p>
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-surface p-5 space-y-3"
              >
                <div className="h-5 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 p-5">
            <p className="text-sm text-[#DC2626] font-medium mb-1">{error}</p>
            <p className="text-xs text-text-secondary">
              Check your selections and try again.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !prep && !selectedPathId && (
          <div className="rounded-md border border-border bg-surface p-8 text-center">
            <BookOpen className="h-10 w-10 text-primary/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Start your first mock interview to practice
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Select a role path above and we&apos;ll generate personalized
              interview prep materials to help you prepare.
            </p>
          </div>
        )}

        {/* Prep content */}
        {prep && !loading && (
          <div className="space-y-4">
            {/* Role path header */}
            <div className="rounded-md border border-primary/20 bg-primary-light p-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Prep for: {prep.role_path.title}
                </p>
                {prep.company_context && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Company: {prep.company_context.company_name} ·{" "}
                    {prep.company_context.job_title}
                  </p>
                )}
              </div>
            </div>

            {/* Common questions */}
            <PrepSection
              icon={<MessageCircle className="h-4 w-4" />}
              title="Common Questions"
              description="Questions frequently asked for this role type"
            >
              <QuestionList items={prep.common_questions} />
            </PrepSection>

            {/* Behavioral questions */}
            <PrepSection
              icon={<Brain className="h-4 w-4" />}
              title="Behavioral Questions"
              description="'Tell me about a time...' questions relevant to your experience"
            >
              <QuestionList items={prep.behavioral_questions} />
            </PrepSection>

            {/* Company-specific questions */}
            {prep.company_specific.length > 0 && (
              <PrepSection
                icon={<Building2 className="h-4 w-4" />}
                title="Company-Specific Questions"
                description={`Tailored for ${prep.company_context?.company_name ?? "this company"}`}
              >
                <QuestionList items={prep.company_specific} />
              </PrepSection>
            )}

            {/* Strengths to emphasize */}
            <PrepSection
              icon={<Lightbulb className="h-4 w-4" />}
              title="Strengths to Emphasize"
              description="Key strengths to highlight during your interview"
            >
              <StrengthsList items={prep.strengths_to_emphasize} />
            </PrepSection>

            {/* Weak spots */}
            <PrepSection
              icon={<Shield className="h-4 w-4" />}
              title="Weak Spots to Prepare For"
              description="Areas the interviewer might probe — with guidance on how to address them"
            >
              <WeakSpotsList items={prep.weak_spots_to_prepare} />
            </PrepSection>

            {/* Compensation prep */}
            <PrepSection
              icon={<DollarSign className="h-4 w-4" />}
              title="Compensation Conversation"
              description="Guidance on discussing salary and benefits"
            >
              <div className="rounded-sm bg-background p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {prep.compensation_prep}
              </div>
            </PrepSection>
          </div>
        )}

        {/* Mock Interview Configuration Modal */}
        {showModal && (
          <MockInterviewModal
            paths={paths}
            selectedPathId={selectedPathId}
            savedJobs={savedJobs}
            interviewType={interviewType}
            interviewJobId={interviewJobId}
            interviewFormat={interviewFormat}
            interviewDuration={interviewDuration}
            interviewDifficulty={interviewDifficulty}
            onChangeType={setInterviewType}
            onChangeJobId={setInterviewJobId}
            onChangeFormat={setInterviewFormat}
            onChangeDuration={setInterviewDuration}
            onChangeDifficulty={setInterviewDifficulty}
            voiceAvailable={voiceAvailable}
            onClose={() => setShowModal(false)}
            onBegin={() => {
              const params = new URLSearchParams();
              params.set("path_id", selectedPathId);
              params.set("format", interviewFormat);
              params.set("difficulty", interviewDifficulty);
              params.set("duration", String(interviewDuration));
              if (interviewType === "company" && interviewJobId) {
                params.set("job_match_id", interviewJobId);
              }
              router.push(`/interviews/session?${params.toString()}`);
            }}
          />
        )}
      </div>

      {/* Performance Sidebar */}
      <PerformanceSidebar performance={performance} />
    </div>
  );
}

// ─── Performance Sidebar ──────────────────────────────────────────────

function PerformanceSidebar({
  performance,
}: {
  performance: PerformanceData | null;
}) {
  if (!performance) {
    // Loading skeleton for sidebar
    return (
      <aside className="hidden lg:block w-[300px] flex-shrink-0">
        <div className="rounded-md border border-border bg-surface p-5 space-y-4 sticky top-8">
          <div className="h-5 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-[300px] flex-shrink-0">
      <div className="rounded-md border border-border bg-surface p-5 sticky top-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Mock Interview Performance
          </h3>
        </div>

        {performance.totalCompleted === 0 ? (
          <div className="text-center py-4">
            <Mic className="h-8 w-8 text-primary/20 mx-auto mb-2" />
            <p className="text-xs text-text-secondary">
              Complete a mock interview to see your performance stats here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary">Sessions</p>
                <p className="text-lg font-semibold text-text-primary">
                  {performance.totalCompleted}
                </p>
              </div>
              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary">Avg Score</p>
                <p className="text-lg font-semibold text-primary">
                  {performance.averageScore ?? "—"}
                  {performance.averageScore !== null && (
                    <span className="text-xs text-text-secondary font-normal">
                      /100
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Strongest / Weakest */}
            {performance.strongestArea && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-sm bg-[#059669]/5 border border-[#059669]/10 p-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#059669] flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-text-secondary">Strongest</p>
                    <p className="text-xs font-medium text-text-primary">
                      {performance.strongestArea}
                    </p>
                  </div>
                </div>
                {performance.weakestArea &&
                  performance.weakestArea !== performance.strongestArea && (
                    <div className="flex items-center gap-2 rounded-sm bg-[#D97706]/5 border border-[#D97706]/10 p-2.5">
                      <TrendingDown className="h-3.5 w-3.5 text-[#D97706] flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-text-secondary">
                          Needs work
                        </p>
                        <p className="text-xs font-medium text-text-primary">
                          {performance.weakestArea}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Recent sessions */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">
                Recent Sessions
              </p>
              <div className="space-y-1.5">
                {performance.sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/interviews/feedback/${session.id}`}
                    className="flex items-center justify-between rounded-sm bg-background p-2.5 hover:bg-primary-light transition-default group"
                  >
                    <div>
                      <p className="text-xs font-medium text-text-primary group-hover:text-primary transition-default">
                        {capitalizeFirst(session.format)}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {formatDate(session.completed_at)}
                      </p>
                    </div>
                    {session.overall_score !== null && (
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          session.overall_score >= 70
                            ? "text-[#059669]"
                            : session.overall_score >= 50
                              ? "text-[#D97706]"
                              : "text-[#DC2626]"
                        )}
                      >
                        {session.overall_score}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function PrepSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-xs text-text-secondary mb-4">{description}</p>
      {children}
    </div>
  );
}

function QuestionList({ items }: { items: PrepQuestion[] | string[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const isObject = typeof item === "object" && item !== null;
        const question = isObject ? (item as PrepQuestion).question : (item as string);
        const answer = isObject ? (item as PrepQuestion).suggested_answer : null;
        const isExpanded = expandedIndex === i;

        return (
          <li key={i} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => answer && setExpandedIndex(isExpanded ? null : i)}
              className={cn(
                "w-full flex gap-3 p-3 text-left transition-colors",
                answer ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
              )}
            >
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-text-primary leading-relaxed font-medium">
                {question}
              </span>
              {answer && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted flex-shrink-0 mt-0.5 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
            </button>
            {answer && isExpanded && (
              <div className="px-3 pb-3 pt-0 ml-8 mr-3">
                <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Suggested Answer</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{answer}</p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StrengthsList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li
          key={i}
          className="flex items-start gap-2 rounded-sm bg-[#059669]/5 border border-[#059669]/10 p-3"
        >
          <Lightbulb className="h-3.5 w-3.5 text-[#059669] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{s}</p>
        </li>
      ))}
    </ul>
  );
}

function WeakSpotsList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((w, i) => (
        <li
          key={i}
          className="flex items-start gap-2 rounded-sm bg-[#D97706]/5 border border-[#D97706]/10 p-3"
        >
          <Shield className="h-3.5 w-3.5 text-[#D97706] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{w}</p>
        </li>
      ))}
    </ul>
  );
}

function MockInterviewModal({
  paths,
  selectedPathId,
  savedJobs,
  interviewType,
  interviewJobId,
  interviewFormat,
  interviewDuration,
  interviewDifficulty,
  onChangeType,
  onChangeJobId,
  onChangeFormat,
  onChangeDuration,
  onChangeDifficulty,
  voiceAvailable,
  onClose,
  onBegin,
}: {
  paths: RolePath[];
  selectedPathId: string;
  savedJobs: SavedJob[];
  interviewType: "general" | "company";
  interviewJobId: string;
  interviewFormat: string;
  interviewDuration: number;
  interviewDifficulty: string;
  voiceAvailable: boolean | null;
  onChangeType: (v: "general" | "company") => void;
  onChangeJobId: (v: string) => void;
  onChangeFormat: (v: string) => void;
  onChangeDuration: (v: number) => void;
  onChangeDifficulty: (v: string) => void;
  onClose: () => void;
  onBegin: () => void;
}) {
  const selectedPath = paths.find((p) => p.id === selectedPathId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-default"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-lg border border-border shadow-lg w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Mock Interview Setup
            </h2>
            {selectedPath && (
              <p className="text-xs text-text-secondary mt-0.5">
                For: {selectedPath.title}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-default"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Interview Type */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              Interview Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeType("general")}
                className={cn(
                  "rounded-sm border p-3 text-left transition-default",
                  interviewType === "general"
                    ? "border-primary bg-primary-light"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="block text-sm font-medium text-text-primary">
                  General
                </span>
                <span className="block text-[10px] text-text-secondary mt-0.5">
                  For this role type
                </span>
              </button>
              <button
                onClick={() => onChangeType("company")}
                disabled={savedJobs.length === 0}
                className={cn(
                  "rounded-sm border p-3 text-left transition-default",
                  interviewType === "company"
                    ? "border-primary bg-primary-light"
                    : "border-border hover:border-primary/40",
                  savedJobs.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="block text-sm font-medium text-text-primary">
                  Company-Specific
                </span>
                <span className="block text-[10px] text-text-secondary mt-0.5">
                  {savedJobs.length === 0
                    ? "No saved jobs"
                    : "For a specific company"}
                </span>
              </button>
            </div>

            {/* Company selector */}
            {interviewType === "company" && savedJobs.length > 0 && (
              <div className="mt-2 relative">
                <select
                  value={interviewJobId}
                  onChange={(e) => onChangeJobId(e.target.value)}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">Select a company</option>
                  {savedJobs.map((j) => (
                    <option key={j.id} value={j.job_match_id}>
                      {j.job_title} at {j.company_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            )}
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChangeFormat(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center text-xs font-medium transition-default",
                    interviewFormat === opt.value
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-primary hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChangeDuration(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center transition-default",
                    interviewDuration === opt.value
                      ? "border-primary bg-primary-light"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Clock className="h-3.5 w-3.5 mx-auto mb-0.5 text-text-secondary" />
                  <span className="block text-xs font-medium text-text-primary">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChangeDifficulty(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center text-xs font-medium transition-default",
                    interviewDifficulty === opt.value
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-primary hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Voice unavailable warning */}
        {voiceAvailable === false && (
          <div className="mt-5 rounded-md border border-[#D97706]/20 bg-[#D97706]/5 px-4 py-3 text-center">
            <p className="text-xs text-[#D97706] font-medium">
              Voice interviews are temporarily unavailable. Please try again shortly.
            </p>
          </div>
        )}

        {/* Begin button */}
        <Button
          onClick={onBegin}
          className="w-full mt-6 gap-2"
          disabled={
            voiceAvailable !== true ||
            (interviewType === "company" && !interviewJobId)
          }
        >
          <Mic className="h-4 w-4" />
          {voiceAvailable === null ? "Checking availability..." : "Begin Interview"}
        </Button>
        <p className="text-[10px] text-text-secondary text-center mt-2">
          Microphone access will be requested when the session starts
        </p>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function InterviewsPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <InterviewsContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
