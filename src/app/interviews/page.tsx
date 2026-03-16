"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  Building2,
  ChevronDown,
  Clock,
  DollarSign,
  Lightbulb,
  MessageCircle,
  Mic,
  Shield,
  Sparkles,
  Target,
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
  job_title: string;
  company_name: string;
}

interface PrepData {
  role_path: { id: string; title: string };
  company_context?: { company_name: string; job_title: string };
  common_questions: string[];
  behavioral_questions: string[];
  company_specific: string[];
  strengths_to_emphasize: string[];
  weak_spots_to_prepare: string[];
  compensation_prep: string;
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

// ─── Component ────────────────────────────────────────────────────────

function InterviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role paths
  const [paths, setPaths] = useState<RolePath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>("");

  // Saved jobs for company-specific prep
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobMatchId, setSelectedJobMatchId] = useState<string>("");

  // Prep data
  const [prep, setPrep] = useState<PrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch role paths and saved jobs
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
                p.is_selected !== false
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

        // Fetch saved jobs (applied or saved)
        const jobsRes = await fetch(
          "/api/v1/employee/jobs?page=1&per_page=50&sort=fit"
        );
        if (jobsRes.ok) {
          const json = await jobsRes.json();
          const matches = json.data ?? [];
          const jobs: SavedJob[] = matches
            .filter(
              (m: { job_title?: string; company_name?: string }) =>
                m.job_title && m.company_name
            )
            .map(
              (m: {
                id: string;
                job_title: string;
                company_name: string;
              }) => ({
                id: m.id,
                job_title: m.job_title,
                company_name: m.company_name,
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

  // Fetch interview prep
  const fetchPrep = useCallback(async () => {
    if (!selectedPathId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("path_id", selectedPathId);
      if (selectedJobMatchId) {
        params.set("job_match_id", selectedJobMatchId);
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate interview prep materials"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPathId, selectedJobMatchId]);

  // Auto-fetch prep when path is first selected (initial load only)
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    if (selectedPathId && !initialLoadDone) {
      setInitialLoadDone(true);
      fetchPrep();
    }
  }, [selectedPathId, initialLoadDone, fetchPrep]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
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

      {/* Path and Job selectors */}
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

        {/* Company-specific prep selector */}
        {savedJobs.length > 0 && (
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">
              Company-Specific Prep{" "}
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
                <option value="">General prep only</option>
                {savedJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.job_title} at {j.company_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Generate prep button (shown when selections change after initial load) */}
      {!loading && selectedPathId && initialLoadDone && !prep && !error && (
        <div className="mb-4">
          <Button onClick={fetchPrep} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Interview Prep
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
            Select a role path to get started
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Choose a target role above and we&apos;ll generate personalized
            interview prep materials.
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

function QuestionList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((q, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-text-primary leading-relaxed">{q}</p>
        </li>
      ))}
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
                    <option key={j.id} value={j.id}>
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
