"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Brain,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Eye,
  Lightbulb,
  Loader2,
  MessageCircle,
  Mic,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface SavedJob {
  id: string;
  job_match_id: string;
  job_title: string;
  company_name: string;
  description?: string;
}

interface InterviewerLens {
  title: string;
  focus: string;
  they_want_to_know: string[];
}

interface Alignment {
  your_experience: string;
  jd_requirement: string;
}

interface Gap {
  gap: string;
  bridging_strategy: string;
}

interface BehavioralQuestion {
  question: string;
  situation: string;
  action: string;
  result: string;
  tip?: string;
}

interface TechnicalQuestion {
  question: string;
  suggested_answer: string;
  talking_points?: string[];
  tip?: string;
}

interface SmartQuestion {
  question: string;
  for_interviewer?: string;
}

interface PrepGuideData {
  id: string;
  job_title: string;
  company_name: string;
  interview_stage: string;
  format: string;
  created_at?: string;
  interviewer_lenses: InterviewerLens[];
  alignments: Alignment[];
  gaps_to_address: Gap[];
  opening_statement: string;
  closing_statement: string;
  behavioral_questions: BehavioralQuestion[];
  technical_questions: TechnicalQuestion[];
  smart_questions_to_ask: SmartQuestion[];
  preparation_checklist: {
    day_before: string[];
    day_of: string[];
  };
}

interface SavedPrepSummary {
  id: string;
  job_title: string;
  company_name: string;
  interview_stage: string;
  format: string;
  created_at: string;
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

const STAGE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "phone_screen", label: "Phone Screen" },
  { value: "first_round", label: "First Round" },
  { value: "second_round", label: "Second Round" },
  { value: "final_round", label: "Final Round" },
] as const;

const FORMAT_OPTIONS = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "mixed", label: "Mixed" },
] as const;

const SCORE_AREAS = [
  { key: "clarity_score" as const, label: "Clarity" },
  { key: "specificity_score" as const, label: "Specificity" },
  { key: "confidence_score" as const, label: "Confidence" },
];

const MAX_INTERVIEWERS = 5;
const MIN_JOB_DESCRIPTION_LENGTH = 50;

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
    completed.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) /
    totalCompleted;

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
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stageLabel(stage: string): string {
  const found = STAGE_OPTIONS.find((s) => s.value === stage);
  return found ? found.label : stage;
}

// ─── Main Content Component ──────────────────────────────────────────

function InterviewsContent() {
  const searchParams = useSearchParams();

  // View state
  const [view, setView] = useState<"form" | "loading" | "results">("form");

  // Form inputs
  const [jobTitleInput, setJobTitleInput] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobMatchId, setJobMatchId] = useState<string>("");
  const [interviewerTitles, setInterviewerTitles] = useState<string[]>([""]);
  const [interviewStage, setInterviewStage] = useState("");
  const [format, setFormat] = useState("mixed");

  // Saved jobs dropdown
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  // Prep results
  const [prepData, setPrepData] = useState<PrepGuideData | null>(null);
  const [prepId, setPrepId] = useState<string | null>(null);

  // Saved preps list
  const [savedPreps, setSavedPreps] = useState<SavedPrepSummary[]>([]);
  const [savedPrepsLoading, setSavedPrepsLoading] = useState(true);

  // Accordion state
  const [expandedBehavioral, setExpandedBehavioral] = useState<number | null>(
    null
  );
  const [expandedTechnical, setExpandedTechnical] = useState<number | null>(
    null
  );

  // Performance sidebar
  const [performance, setPerformance] = useState<PerformanceData | null>(null);

  // Mock interview state (simplified for Task 8)
  const [practicePrep, setPracticePrep] = useState<{
    prepId: string;
    jobTitle: string;
    companyName: string;
  } | null>(null);

  // Delete confirmation
  const [deletingPrepId, setDeletingPrepId] = useState<string | null>(null);

  // Generating state for button
  const [generating, setGenerating] = useState(false);

  // ─── Fetch saved jobs ───────────────────────────────────────────────

  const fetchSavedJobs = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/v1/employee/jobs?app_status=saved&per_page=50"
      );
      if (res.ok) {
        const json = await res.json();
        const jobs = json.data ?? [];
        setSavedJobs(
          jobs
            .filter(
              (j: {
                job_title?: string;
                company_name?: string;
                id?: string;
              }) => j.job_title && j.company_name
            )
            .map(
              (j: {
                id: string;
                job_match_id?: string;
                job_title: string;
                company_name: string;
                description?: string;
              }) => ({
                id: j.id,
                job_match_id: j.job_match_id ?? j.id,
                job_title: j.job_title,
                company_name: j.company_name,
                description: j.description,
              })
            )
        );
      }
    } catch {
      // Non-critical
    }
  }, []);

  // ─── Fetch saved prep guides ────────────────────────────────────────

  const fetchSavedPreps = useCallback(async () => {
    setSavedPrepsLoading(true);
    try {
      const res = await fetch("/api/v1/employee/interviews/prep?list=true");
      if (res.ok) {
        const json = await res.json();
        setSavedPreps(json.data ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setSavedPrepsLoading(false);
    }
  }, []);

  // ─── Fetch performance ──────────────────────────────────────────────

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
        // Non-critical
      }
    }
    fetchPerformance();
  }, []);

  // ─── Initial data fetch ─────────────────────────────────────────────

  useEffect(() => {
    fetchSavedJobs();
    fetchSavedPreps();
  }, [fetchSavedJobs, fetchSavedPreps]);

  // ─── Auto-open prep from query params ───────────────────────────────

  useEffect(() => {
    const prepIdParam = searchParams.get("prep_id");
    if (prepIdParam) {
      viewPrepGuide(prepIdParam);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Generate interview guide ───────────────────────────────────────

  const generateGuide = useCallback(async () => {
    if (!jobTitleInput.trim() || jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) return;

    setGenerating(true);
    setView("loading");

    try {
      const filteredTitles = interviewerTitles.filter(
        (t) => t.trim().length > 0
      );

      const body: Record<string, unknown> = {
        job_title: jobTitleInput.trim(),
        job_description: jobDescription,
        format,
      };

      if (companyNameInput.trim()) {
        body.company_name = companyNameInput.trim();
      }

      if (jobMatchId) {
        body.job_match_id = jobMatchId;
      }
      if (filteredTitles.length > 0) {
        body.interviewer_titles = filteredTitles;
      }
      if (interviewStage) {
        body.interview_stage = interviewStage;
      }

      const res = await fetch("/api/v1/employee/interviews/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ??
            "Failed to generate interview guide. Please try again."
        );
      }

      const json = await res.json();
      const data = json.data as PrepGuideData;
      setPrepData(data);
      setPrepId(data.id);
      setExpandedBehavioral(null);
      setExpandedTechnical(null);
      setView("results");

      // Refresh saved preps list
      fetchSavedPreps();
    } catch (err) {
      toast.error({
        title: "Generation Failed",
        description:
          err instanceof Error
            ? err.message
            : "Failed to generate interview guide. Please try again.",
      });
      setView("form");
    } finally {
      setGenerating(false);
    }
  }, [
    jobTitleInput,
    companyNameInput,
    jobDescription,
    jobMatchId,
    interviewerTitles,
    interviewStage,
    format,
    fetchSavedPreps,
  ]);

  // ─── View saved prep guide ──────────────────────────────────────────

  const viewPrepGuide = useCallback(
    async (id: string) => {
      setView("loading");

      try {
        const res = await fetch(
          `/api/v1/employee/interviews/prep?prep_id=${id}`
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ?? "Failed to load interview guide."
          );
        }

        const json = await res.json();
        const data = json.data as PrepGuideData;
        setPrepData(data);
        setPrepId(data.id);
        setExpandedBehavioral(null);
        setExpandedTechnical(null);
        setView("results");
      } catch (err) {
        toast.error({
          title: "Load Failed",
          description:
            err instanceof Error
              ? err.message
              : "Failed to load interview guide.",
        });
        setView("form");
      }
    },
    []
  );

  // ─── Delete prep guide ──────────────────────────────────────────────

  const deletePrepGuide = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/v1/employee/interviews/prep", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prep_id: id }),
        });

        if (!res.ok) {
          throw new Error("Failed to delete interview guide.");
        }

        toast.success({
          title: "Guide Deleted",
          description: "The interview guide has been removed.",
        });

        setSavedPreps((prev) => prev.filter((p) => p.id !== id));
        setDeletingPrepId(null);

        // If we were viewing this prep, go back to form
        if (prepId === id) {
          setPrepData(null);
          setPrepId(null);
          setView("form");
        }
      } catch (err) {
        toast.error({
          title: "Delete Failed",
          description:
            err instanceof Error
              ? err.message
              : "Failed to delete interview guide.",
        });
        setDeletingPrepId(null);
      }
    },
    [prepId]
  );

  // ─── Saved job selection handler ────────────────────────────────────

  const handleSavedJobSelect = useCallback(
    (jobId: string) => {
      if (!jobId) {
        setJobMatchId("");
        return;
      }
      const job = savedJobs.find(
        (j) => j.job_match_id === jobId || j.id === jobId
      );
      if (job) {
        setJobMatchId(job.job_match_id);
        setJobTitleInput(job.job_title);
        setCompanyNameInput(job.company_name);
        if (job.description) {
          setJobDescription(job.description);
        }
      }
    },
    [savedJobs]
  );

  // ─── Interviewer management ─────────────────────────────────────────

  const addInterviewer = useCallback(() => {
    if (interviewerTitles.length < MAX_INTERVIEWERS) {
      setInterviewerTitles((prev) => [...prev, ""]);
    }
  }, [interviewerTitles.length]);

  const removeInterviewer = useCallback(
    (index: number) => {
      if (interviewerTitles.length <= 1) {
        setInterviewerTitles([""]);
        return;
      }
      setInterviewerTitles((prev) => prev.filter((_, i) => i !== index));
    },
    [interviewerTitles.length]
  );

  const updateInterviewer = useCallback((index: number, value: string) => {
    setInterviewerTitles((prev) =>
      prev.map((t, i) => (i === index ? value : t))
    );
  }, []);

  // ─── Back to form ───────────────────────────────────────────────────

  const backToForm = useCallback(() => {
    setPrepData(null);
    setPrepId(null);
    setExpandedBehavioral(null);
    setExpandedTechnical(null);
    setView("form");
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 max-w-6xl mx-auto px-4 md:px-8 py-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* ─── FORM VIEW ──────────────────────────────────────────── */}
        {view === "form" && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">
                Interview Preparation
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Prepare for your next interview with a personalized guide
                tailored to the job and your experience.
              </p>
            </div>

            {/* Input Form */}
            <Card className="p-6 space-y-6">
              {/* Job Title & Company Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-title-input">
                    Job Title <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="job-title-input"
                    value={jobTitleInput}
                    onChange={(e) => setJobTitleInput(e.target.value)}
                    placeholder="e.g., Senior Data Analyst"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name-input">Company Name</Label>
                  <Input
                    id="company-name-input"
                    value={companyNameInput}
                    onChange={(e) => setCompanyNameInput(e.target.value)}
                    placeholder="e.g., GreenShield"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="job-description">
                  Job Description <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    setJobMatchId("");
                  }}
                  placeholder="Paste the full job description here..."
                  rows={8}
                  className="resize-y"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary">
                    {jobDescription.length} characters
                  </p>
                  {jobDescription.length > 0 &&
                    jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH && (
                      <p className="text-xs text-danger">
                        Minimum {MIN_JOB_DESCRIPTION_LENGTH} characters required
                      </p>
                    )}
                </div>

                {/* Or select from saved jobs */}
                {savedJobs.length > 0 && (
                  <div className="pt-2">
                    <Label
                      htmlFor="saved-job-select"
                      className="text-xs text-text-secondary font-normal"
                    >
                      Or select from your saved jobs
                    </Label>
                    <Select
                      value={jobMatchId || "none"}
                      onValueChange={(val) =>
                        handleSavedJobSelect(val === "none" ? "" : val)
                      }
                    >
                      <SelectTrigger
                        id="saved-job-select"
                        className="mt-1"
                      >
                        <SelectValue placeholder="Select a saved job..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Select a saved job...
                        </SelectItem>
                        {savedJobs.map((j) => (
                          <SelectItem
                            key={j.id}
                            value={j.job_match_id || j.id}
                          >
                            {j.job_title} at {j.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Interviewer Titles */}
              <div className="space-y-2">
                <div>
                  <Label>Who are you interviewing with? (optional)</Label>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Add their titles to get interviewer-specific insights
                  </p>
                </div>
                <div className="space-y-2">
                  {interviewerTitles.map((title, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={title}
                        onChange={(e) =>
                          updateInterviewer(index, e.target.value)
                        }
                        placeholder="e.g., VP Engineering, HR Manager"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInterviewer(index)}
                        className="flex-shrink-0 h-10 w-10 text-text-secondary hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {interviewerTitles.length < MAX_INTERVIEWERS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addInterviewer}
                      className="gap-1.5 text-text-secondary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add interviewer
                    </Button>
                  )}
                </div>
              </div>

              {/* Interview Stage + Format row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Interview Stage */}
                <div className="space-y-2">
                  <Label htmlFor="interview-stage">Interview Stage</Label>
                  <Select
                    value={interviewStage || "not_specified"}
                    onValueChange={(val) =>
                      setInterviewStage(val === "not_specified" ? "" : val)
                    }
                  >
                    <SelectTrigger id="interview-stage">
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">
                        Not specified
                      </SelectItem>
                      {STAGE_OPTIONS.filter((s) => s.value !== "").map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Interview Format */}
                <div className="space-y-2">
                  <Label>Interview Format</Label>
                  <div className="flex rounded-sm border border-border overflow-hidden">
                    {FORMAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormat(opt.value)}
                        className={cn(
                          "flex-1 py-2 text-sm font-medium transition-all duration-200 ease-out",
                          format === opt.value
                            ? "bg-primary text-white"
                            : "bg-surface text-text-primary hover:bg-primary-light"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateGuide}
                disabled={
                  generating ||
                  !jobTitleInput.trim() ||
                  jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH
                }
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating your interview guide...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Interview Guide
                  </>
                )}
              </Button>
            </Card>

            {/* ─── MY PREP GUIDES ────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-text-primary">
                  My Prep Guides
                </h2>
                {savedPreps.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {savedPreps.length}
                  </span>
                )}
              </div>

              {savedPrepsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-surface p-4 space-y-2"
                    >
                      <div className="h-4 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                      <div className="h-3 w-32 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                    </div>
                  ))}
                </div>
              ) : savedPreps.length === 0 ? (
                <div className="rounded-md border border-border bg-surface p-8 text-center">
                  <ClipboardCheck className="h-10 w-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">
                    No interview prep guides yet. Generate your first one above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedPreps.map((prep) => (
                    <Card key={prep.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {prep.job_title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {prep.company_name}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {prep.interview_stage && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {stageLabel(prep.interview_stage)}
                              </span>
                            )}
                            {prep.format && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                                {capitalizeFirst(prep.format)}
                              </span>
                            )}
                            <span className="text-[11px] text-text-secondary">
                              Generated {formatDate(prep.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewPrepGuide(prep.id)}
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          {deletingPrepId === prep.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deletePrepGuide(prep.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingPrepId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingPrepId(prep.id)}
                              className="h-8 w-8 text-text-secondary hover:text-danger hover:bg-danger/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── LOADING VIEW ───────────────────────────────────────── */}
        {view === "loading" && (
          <div className="space-y-4">
            {/* Loading banner */}
            <div className="rounded-md border border-border bg-surface p-5">
              <div className="rounded-sm bg-primary-light p-6 text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-primary">
                  Building your personalized interview guide...
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Analyzing the job description and your experience
                </p>
              </div>
            </div>

            {/* Skeleton sections */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-surface p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  <div className="h-5 w-40 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                </div>
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
                    style={{ width: `${85 - j * 15}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ─── RESULTS VIEW ───────────────────────────────────────── */}
        {view === "results" && prepData && (
          <div className="space-y-6">
            {/* Top bar */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={backToForm}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-text-primary">
                    {prepData.job_title}
                  </h1>
                  <p className="text-sm text-text-secondary">
                    {prepData.company_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {prepData.interview_stage && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {stageLabel(prepData.interview_stage)}
                      </span>
                    )}
                    {prepData.format && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        {capitalizeFirst(prepData.format)}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() =>
                    setPracticePrep({
                      prepId: prepData.id,
                      jobTitle: prepData.job_title,
                      companyName: prepData.company_name,
                    })
                  }
                  className="gap-2"
                >
                  <Mic className="h-4 w-4" />
                  Practice These Questions
                </Button>
              </div>

              {/* Advice banner */}
              <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Use these as frameworks to internalize your answers, not
                  scripts to memorize.
                </p>
              </div>
            </div>

            {/* Section 1: Know Your Interviewers */}
            {prepData.interviewer_lenses &&
              prepData.interviewer_lenses.length > 0 && (
                <ResultSection
                  icon={<Users className="h-4 w-4" />}
                  title="Know Your Interviewers"
                  sectionNumber={1}
                >
                  <div className="space-y-3">
                    {prepData.interviewer_lenses.map((lens, i) => (
                      <Card key={i} className="p-4">
                        <p className="text-sm font-semibold text-text-primary">
                          {lens.title}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {lens.focus}
                        </p>
                        <div className="mt-3">
                          <p className="text-xs font-medium text-text-secondary mb-1.5">
                            They want to know:
                          </p>
                          <ul className="space-y-1">
                            {lens.they_want_to_know.map((item, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-2 text-sm text-text-primary"
                              >
                                <span className="text-primary mt-1 flex-shrink-0">
                                  &bull;
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ResultSection>
              )}

            {/* Section 2: Role Snapshot & Strongest Alignments */}
            {prepData.alignments && prepData.alignments.length > 0 && (
              <ResultSection
                icon={<Target className="h-4 w-4" />}
                title="Role Snapshot & Strongest Alignments"
                sectionNumber={2}
              >
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] gap-3 px-3 pb-2">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Your Experience
                    </p>
                    <div className="w-6" />
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                      JD Requirement
                    </p>
                  </div>
                  {prepData.alignments.map((alignment, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 rounded-sm border border-border bg-background p-3 items-center"
                    >
                      <p className="text-sm text-text-primary">
                        <span className="sm:hidden text-xs font-medium text-text-secondary block mb-0.5">
                          Your Experience
                        </span>
                        {alignment.your_experience}
                      </p>
                      <div className="hidden sm:flex items-center justify-center w-6 h-6 rounded-full bg-[#059669]/10">
                        <svg
                          className="h-3.5 w-3.5 text-[#059669]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-text-primary">
                        <span className="sm:hidden text-xs font-medium text-text-secondary block mb-0.5">
                          JD Requirement
                        </span>
                        {alignment.jd_requirement}
                      </p>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Section 3: The Gap(s) to Address */}
            {prepData.gaps_to_address && prepData.gaps_to_address.length > 0 && (
              <ResultSection
                icon={<AlertTriangle className="h-4 w-4" />}
                title="The Gap(s) to Address"
                sectionNumber={3}
              >
                <div className="space-y-3">
                  {prepData.gaps_to_address.map((gap, i) => (
                    <div
                      key={i}
                      className="rounded-sm border border-[#D97706]/20 bg-[#D97706]/5 p-4"
                    >
                      <p className="text-sm font-semibold text-text-primary">
                        {gap.gap}
                      </p>
                      <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                        {gap.bridging_strategy}
                      </p>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Section 4: Opening & Closing Positioning */}
            {(prepData.opening_statement || prepData.closing_statement) && (
              <ResultSection
                icon={<MessageCircle className="h-4 w-4" />}
                title="Opening & Closing Positioning"
                sectionNumber={4}
              >
                <div className="space-y-4">
                  {prepData.opening_statement && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                        &ldquo;Tell Me About Yourself&rdquo;
                      </p>
                      <div className="rounded-sm bg-blue-50 border border-blue-100 p-4">
                        <p className="text-sm text-blue-900 leading-relaxed">
                          {prepData.opening_statement}
                        </p>
                      </div>
                    </div>
                  )}
                  {prepData.closing_statement && (
                    <div>
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                        Closing Statement
                      </p>
                      <div className="rounded-sm bg-[#059669]/5 border border-[#059669]/10 p-4">
                        <p className="text-sm text-[#059669]/90 leading-relaxed">
                          {prepData.closing_statement}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ResultSection>
            )}

            {/* Section 5: Behavioral Questions & STAR Answers */}
            {prepData.behavioral_questions &&
              prepData.behavioral_questions.length > 0 && (
                <ResultSection
                  icon={<Brain className="h-4 w-4" />}
                  title="Behavioral Questions & STAR Answers"
                  sectionNumber={5}
                >
                  <div className="space-y-2">
                    {prepData.behavioral_questions.map((q, i) => {
                      const isExpanded = expandedBehavioral === i;
                      return (
                        <div
                          key={i}
                          className="rounded-sm border border-border overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBehavioral(isExpanded ? null : i)
                            }
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-all duration-200 ease-out"
                          >
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm text-text-primary font-medium leading-relaxed">
                              {q.question}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted flex-shrink-0 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 ml-8 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                                  Situation
                                </p>
                                <p className="text-sm text-text-primary leading-relaxed">
                                  {q.situation}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                                  Action
                                </p>
                                <p className="text-sm text-text-primary leading-relaxed">
                                  {q.action}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                                  Result
                                </p>
                                <p className="text-sm text-text-primary leading-relaxed">
                                  {q.result}
                                </p>
                              </div>
                              {q.tip && (
                                <div className="rounded-sm bg-yellow-50 border border-yellow-100 p-3">
                                  <p className="text-xs font-medium text-yellow-800">
                                    Tip: {q.tip}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ResultSection>
              )}

            {/* Section 6: Technical & Situational Questions */}
            {prepData.technical_questions &&
              prepData.technical_questions.length > 0 && (
                <ResultSection
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="Technical & Situational Questions"
                  sectionNumber={6}
                >
                  <div className="space-y-2">
                    {prepData.technical_questions.map((q, i) => {
                      const isExpanded = expandedTechnical === i;
                      return (
                        <div
                          key={i}
                          className="rounded-sm border border-border overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTechnical(isExpanded ? null : i)
                            }
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-all duration-200 ease-out"
                          >
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm text-text-primary font-medium leading-relaxed">
                              {q.question}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted flex-shrink-0 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 ml-8 space-y-3">
                              {q.suggested_answer && (
                                <p className="text-sm text-text-primary leading-relaxed">
                                  {q.suggested_answer}
                                </p>
                              )}
                              {q.talking_points && q.talking_points.length > 0 && (
                                <ul className="space-y-1.5">
                                  {q.talking_points.map((point, j) => (
                                    <li
                                      key={j}
                                      className="flex items-start gap-2 text-sm text-text-primary"
                                    >
                                      <span className="text-primary mt-1 flex-shrink-0">
                                        &bull;
                                      </span>
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {q.tip && (
                                <div className="rounded-sm bg-yellow-50 border border-yellow-100 p-3">
                                  <p className="text-xs font-medium text-yellow-800">
                                    Tip: {q.tip}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ResultSection>
              )}

            {/* Section 7: Smart Questions to Ask */}
            {prepData.smart_questions_to_ask &&
              prepData.smart_questions_to_ask.length > 0 && (
                <ResultSection
                  icon={<Lightbulb className="h-4 w-4" />}
                  title="Smart Questions to Ask"
                  sectionNumber={7}
                >
                  <SmartQuestionsSection
                    questions={prepData.smart_questions_to_ask}
                  />
                </ResultSection>
              )}

            {/* Section 8: Final Preparation Checklist */}
            {((prepData.preparation_checklist?.day_before &&
              prepData.preparation_checklist?.day_before.length > 0) ||
              (prepData.preparation_checklist?.day_of &&
                prepData.preparation_checklist?.day_of.length > 0)) && (
              <ResultSection
                icon={<CheckSquare className="h-4 w-4" />}
                title="Final Preparation Checklist"
                sectionNumber={8}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {prepData.preparation_checklist?.day_before &&
                    prepData.preparation_checklist?.day_before.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                          Day Before
                        </p>
                        <div className="space-y-2">
                          {prepData.preparation_checklist?.day_before.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2.5 p-2"
                            >
                              <div className="flex-shrink-0 mt-0.5 h-4 w-4 rounded border border-border bg-surface" />
                              <p className="text-sm text-text-primary leading-relaxed">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {prepData.preparation_checklist?.day_of &&
                    prepData.preparation_checklist?.day_of.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                          Day Of
                        </p>
                        <div className="space-y-2">
                          {prepData.preparation_checklist?.day_of.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2.5 p-2"
                            >
                              <div className="flex-shrink-0 mt-0.5 h-4 w-4 rounded border border-border bg-surface" />
                              <p className="text-sm text-text-primary leading-relaxed">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </ResultSection>
            )}
          </div>
        )}

        {/* Mock Interview Modal (simplified — accepts prepId, refined in Task 8) */}
        {practicePrep && (
          <MockInterviewModal
            prepId={practicePrep.prepId}
            jobTitle={practicePrep.jobTitle}
            companyName={practicePrep.companyName}
            onClose={() => setPracticePrep(null)}
          />
        )}
      </div>

      {/* Performance Sidebar */}
      <PerformanceSidebar performance={performance} />
    </div>
  );
}

// ─── Result Section Wrapper ──────────────────────────────────────────

function ResultSection({
  icon,
  title,
  sectionNumber,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sectionNumber: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-text-primary">
          <span className="text-text-secondary font-normal mr-1">
            {sectionNumber}.
          </span>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── Smart Questions Section ─────────────────────────────────────────

function SmartQuestionsSection({
  questions,
}: {
  questions: SmartQuestion[];
}) {
  // Group by interviewer if for_interviewer is set
  const hasInterviewerGrouping = questions.some((q) => q.for_interviewer);

  if (hasInterviewerGrouping) {
    const grouped: Record<string, SmartQuestion[]> = {};
    const ungrouped: SmartQuestion[] = [];

    questions.forEach((q) => {
      if (q.for_interviewer) {
        if (!grouped[q.for_interviewer]) {
          grouped[q.for_interviewer] = [];
        }
        grouped[q.for_interviewer].push(q);
      } else {
        ungrouped.push(q);
      }
    });

    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([interviewer, qs]) => (
          <div key={interviewer}>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              For {interviewer}
            </p>
            <ul className="space-y-2">
              {qs.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-sm bg-background p-3"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-primary">{q.question}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              General
            </p>
            <ul className="space-y-2">
              {ungrouped.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-sm bg-background p-3"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-primary">{q.question}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {questions.map((q, i) => (
        <li
          key={i}
          className="flex items-start gap-2 rounded-sm bg-background p-3"
        >
          <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{q.question}</p>
        </li>
      ))}
    </ul>
  );
}

// ─── Performance Sidebar ─────────────────────────────────────────────

function PerformanceSidebar({
  performance,
}: {
  performance: PerformanceData | null;
}) {
  if (!performance) {
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
                  {performance.averageScore ?? "\u2014"}
                  {performance.averageScore !== null && (
                    <span className="text-xs text-text-secondary font-normal">
                      /100
                    </span>
                  )}
                </p>
              </div>
            </div>

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

            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">
                Recent Sessions
              </p>
              <div className="space-y-1.5">
                {performance.sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/interviews/feedback/${session.id}`}
                    className="flex items-center justify-between rounded-sm bg-background p-2.5 hover:bg-primary-light transition-all duration-200 ease-out group"
                  >
                    <div>
                      <p className="text-xs font-medium text-text-primary group-hover:text-primary transition-all duration-200 ease-out">
                        {capitalizeFirst(session.format)}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {formatDateShort(session.completed_at)}
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

// ─── Mock Interview Modal (simplified for Task 8) ────────────────────

function MockInterviewModal({
  prepId,
  jobTitle,
  companyName,
  onClose,
}: {
  prepId: string;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [interviewFormat, setInterviewFormat] = useState("behavioral");
  const [interviewDuration, setInterviewDuration] = useState(15);
  const [interviewDifficulty, setInterviewDifficulty] = useState("standard");
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setVoiceAvailable(null);
    fetch("/api/v1/employee/interviews/health")
      .then((r) => r.json())
      .then((json) => {
        setVoiceAvailable(json?.data?.available === true);
      })
      .catch(() => {
        setVoiceAvailable(false);
      });
  }, []);

  const handleBegin = () => {
    const params = new URLSearchParams();
    params.set("prep_id", prepId);
    params.set("format", interviewFormat);
    params.set("difficulty", interviewDifficulty);
    params.set("duration", String(interviewDuration));
    router.push(`/interviews/session?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-all duration-200 ease-out"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-lg border border-border shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Practice Interview
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {jobTitle} at {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-all duration-200 ease-out"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Format */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-2 block">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInterviewFormat(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center text-xs font-medium transition-all duration-200 ease-out",
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
              {[
                { value: 10, label: "10 min" },
                { value: 15, label: "15 min" },
                { value: 20, label: "20 min" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInterviewDuration(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center text-xs font-medium transition-all duration-200 ease-out",
                    interviewDuration === opt.value
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-text-primary hover:border-primary/40"
                  )}
                >
                  {opt.label}
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
              {[
                { value: "standard", label: "Standard" },
                { value: "challenging", label: "Challenging" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInterviewDifficulty(opt.value)}
                  className={cn(
                    "rounded-sm border py-2 text-center text-xs font-medium transition-all duration-200 ease-out",
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

        {voiceAvailable === false && (
          <div className="mt-5 rounded-md border border-[#D97706]/20 bg-[#D97706]/5 px-4 py-3 text-center">
            <p className="text-xs text-[#D97706] font-medium">
              Voice interviews are temporarily unavailable. Please try again
              shortly.
            </p>
          </div>
        )}

        <Button
          onClick={handleBegin}
          className="w-full mt-6 gap-2"
          disabled={voiceAvailable !== true}
        >
          <Mic className="h-4 w-4" />
          {voiceAvailable === null
            ? "Checking availability..."
            : "Begin Interview"}
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
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-shimmer rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
                />
              ))}
            </div>
          }
        >
          <InterviewsContent />
        </Suspense>
      </DashboardLayout>
    </EmployeeRoute>
  );
}
