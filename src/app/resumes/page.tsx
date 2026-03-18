"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileText,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface ExperienceEntry {
  company: string;
  title: string;
  dates: string;
  bullets: string[];
}

interface EducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  year: string | null;
}

interface MissingMetric {
  bullet_text: string;
  role: string;
  suggestion: string;
}

interface WeakBullet {
  bullet_text: string;
  role: string;
  issue: string;
  suggested_rewrite: string;
}

interface ScoreFeedback {
  ats_feedback?: string;
  clarity_feedback?: string;
  specificity_feedback?: string;
  missing_metrics?: MissingMetric[];
  weak_bullets?: WeakBullet[];
  suggestions?: string[];
}

interface ResumeData {
  resume_id: string;
  role_path_id: string;
  role_path_title: string | null;
  is_primary: boolean;
  tone: string;
  version: number;
  summary_statement: string;
  skills_section: string[];
  experience_section: ExperienceEntry[];
  keywords: string[];
  full_content: {
    summary_statement?: string;
    skills_section?: string[];
    experience_section?: ExperienceEntry[];
    education_section?: EducationEntry[];
    certifications_section?: string[];
    keywords?: string[];
  } | null;
  scores: {
    ats: number | null;
    clarity: number | null;
    specificity: number | null;
    feedback: ScoreFeedback | null;
  };
  created_at: string;
}

type Tone = "professional" | "confident" | "conversational";

interface KitSuggestion {
  kit_id: string;
  job_match_id: string;
  job_title: string;
  company_name: string;
  resume_edits: unknown;
}

interface SuggestionItem {
  kit_id: string;
  job_title: string;
  company_name: string;
  text: string;
  index: number;
  dismissed: boolean;
  applied: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────

const CONTEXTUAL_MESSAGES = [
  { text: "Building your tailored resume...", delay: 0 },
  { text: "Optimizing for ATS compatibility...", delay: 4000 },
  { text: "Scoring your resume quality...", delay: 8000 },
  { text: "Almost there...", delay: 15000 },
];

const LONG_WAIT_THRESHOLD = 30000;

const TONES: { value: Tone; label: string; description: string }[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Clean, corporate, straightforward",
  },
  {
    value: "confident",
    label: "Confident",
    description: "Assertive, achievement-forward",
  },
  {
    value: "conversational",
    label: "Conversational",
    description: "Warm, personable, modern",
  },
];

// ─── Helper: Score Color ─────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 75) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-border";
  if (score >= 75) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

// ─── Main Component ──────────────────────────────────────────────────

export default function ResumesPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <Suspense fallback={null}>
          <ResumeWorkspace />
        </Suspense>
      </DashboardLayout>
    </EmployeeRoute>
  );
}

function ResumeWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kitIdParam = searchParams.get("kit_id");
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextMsg, setContextMsg] = useState(CONTEXTUAL_MESSAGES[0].text);
  const [longWait, setLongWait] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);
  const hasFetched = useRef(false);

  // ─── Suggestions state ──────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [activeKitFilter, setActiveKitFilter] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ─── Fetch resumes on mount ───────────────────────────────────────

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employee/resumes");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to load resumes");
      }
      const data = await res.json();
      if (data.employee_name) {
        setEmployeeName(data.employee_name);
      }
      return data.resumes as ResumeData[];
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to load resumes");
    }
  }, []);

  const generateResume = useCallback(
    async (rolePathId: string, tone: Tone = "professional") => {
      const res = await fetch("/api/v1/employee/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_path_id: rolePathId, tone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Resume generation failed");
      }
      return res.json();
    },
    []
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    let msgTimers: ReturnType<typeof setTimeout>[] = [];

    async function init() {
      setLoading(true);
      setError(null);

      try {
        // Try fetching existing resumes
        const existing = await fetchResumes();
        if (existing.length > 0) {
          setResumes(existing);
          setLoading(false);
          return;
        }

        // No resumes — need to generate. Get selected paths first.
        setGenerating(true);
        msgTimers = CONTEXTUAL_MESSAGES.map(({ text, delay }) =>
          setTimeout(() => setContextMsg(text), delay)
        );
        msgTimers.push(
          setTimeout(() => setLongWait(true), LONG_WAIT_THRESHOLD)
        );

        // Fetch selected paths from the transition plan to know what to generate
        const selectedPathsRes = await fetch("/api/v1/employee/plan");
        if (!selectedPathsRes.ok) {
          throw new Error(
            "No transition plan found. Please complete the transition plan first."
          );
        }
        const planData = await selectedPathsRes.json();
        const selectedPaths = planData.selected_paths ?? [];

        if (selectedPaths.length === 0) {
          throw new Error(
            "No role paths selected. Please select role paths first."
          );
        }

        // Generate resumes for all selected paths in parallel
        const results = await Promise.allSettled(
          selectedPaths.map(async (path: { id: string; title: string; is_primary: boolean }) => {
            const result = await generateResume(path.id);
            return {
              resume_id: result.resume_id,
              role_path_id: result.role_path_id,
              role_path_title: path.title,
              is_primary: path.is_primary,
              tone: result.tone ?? "professional",
              version: result.version ?? 1,
              summary_statement: result.summary_statement,
              skills_section: result.skills_section ?? [],
              experience_section: result.experience_section ?? [],
              keywords: result.keywords ?? [],
              full_content: result.full_content ?? null,
              scores: result.scores ?? {
                ats: null,
                clarity: null,
                specificity: null,
                feedback: null,
              },
              created_at: new Date().toISOString(),
            } as ResumeData;
          })
        );
        const generated = results
          .filter((r): r is PromiseFulfilledResult<ResumeData> => r.status === "fulfilled")
          .map((r) => r.value);

        if (generated.length === 0) {
          throw new Error("Failed to generate resumes. Please try again.");
        }

        setResumes(generated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
        setGenerating(false);
        msgTimers.forEach(clearTimeout);
      }
    }

    init();

    return () => {
      msgTimers.forEach(clearTimeout);
    };
  }, [fetchResumes, generateResume]);

  // ─── Fetch suggestions when resumes are loaded ─────────────────────

  useEffect(() => {
    if (resumes.length === 0) return;

    const currentResume = resumes[activeTab];
    if (!currentResume?.role_path_id) return;

    async function fetchSuggestions() {
      try {
        const res = await fetch(
          `/api/v1/employee/resume/suggestions?role_path_id=${currentResume.role_path_id}`
        );
        if (!res.ok) return;

        const body = await res.json();
        const kitSuggestions: KitSuggestion[] = body.data ?? [];

        const items: SuggestionItem[] = [];
        for (const kit of kitSuggestions) {
          const edits = kit.resume_edits;
          if (Array.isArray(edits)) {
            edits.forEach((edit: unknown, idx: number) => {
              const text =
                typeof edit === "string"
                  ? edit
                  : typeof edit === "object" && edit !== null && "suggestion" in edit
                    ? String((edit as Record<string, unknown>).suggestion)
                    : JSON.stringify(edit);
              items.push({
                kit_id: kit.kit_id,
                job_title: kit.job_title,
                company_name: kit.company_name,
                text,
                index: idx,
                dismissed: false,
                applied: false,
              });
            });
          }
        }

        setSuggestions(items);

        // Auto-expand if kit_id param is present
        if (kitIdParam) {
          setActiveKitFilter(kitIdParam);
          setSuggestionsExpanded(true);
          setTimeout(() => {
            suggestionsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        }
      } catch {
        // Suggestions are non-critical — silently fail
      }
    }

    fetchSuggestions();
  }, [resumes, activeTab, kitIdParam]);

  // ─── Re-score resume ────────────────────────────────────────────────

  const handleRescore = useCallback(async () => {
    const resume = resumes[activeTab];
    if (!resume || rescoring) return;

    setRescoring(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/employee/resume/${resume.resume_id}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Re-scoring failed");
      }

      const result = await res.json();
      const newScores = result.data?.scores;

      setResumes((prev) =>
        prev.map((r, i) =>
          i === activeTab
            ? {
                ...r,
                scores: newScores
                  ? {
                      ats: newScores.ats_score,
                      clarity: newScores.clarity_score,
                      specificity: newScores.specificity_score,
                      feedback: {
                        ats_feedback: newScores.ats_feedback ?? "",
                        clarity_feedback: newScores.clarity_feedback ?? "",
                        specificity_feedback: newScores.specificity_feedback ?? "",
                        missing_metrics: newScores.missing_metrics ?? [],
                        weak_bullets: newScores.weak_bullets ?? [],
                        general_suggestions: newScores.general_suggestions ?? [],
                      },
                    }
                  : r.scores,
              }
            : r
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to re-score resume"
      );
    } finally {
      setRescoring(false);
    }
  }, [resumes, activeTab, rescoring]);

  // ─── Suggestion actions ─────────────────────────────────────────────

  const dismissSuggestion = useCallback((kitId: string, index: number) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.kit_id === kitId && s.index === index
          ? { ...s, dismissed: true }
          : s
      )
    );
  }, []);

  const applySuggestion = useCallback((kitId: string, index: number) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.kit_id === kitId && s.index === index
          ? { ...s, applied: true }
          : s
      )
    );
  }, []);

  // ─── Tone change → regenerate ─────────────────────────────────────

  const handleToneChange = useCallback(
    async (tone: Tone) => {
      const resume = resumes[activeTab];
      if (!resume || regenerating) return;

      setRegenerating(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/v1/employee/resume/${resume.resume_id}/regenerate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Regeneration failed");
        }

        const result = await res.json();

        setResumes((prev) =>
          prev.map((r, i) =>
            i === activeTab
              ? {
                  ...r,
                  resume_id: result.resume_id,
                  tone: result.tone,
                  version: result.version,
                  summary_statement: result.summary_statement,
                  skills_section: result.skills_section ?? [],
                  experience_section: result.experience_section ?? [],
                  keywords: result.keywords ?? [],
                  full_content: result.full_content ?? null,
                  scores: result.scores ?? r.scores,
                }
              : r
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to regenerate resume"
        );
      } finally {
        setRegenerating(false);
      }
    },
    [resumes, activeTab, regenerating]
  );

  // ─── Inline Edit Save ─────────────────────────────────────────────

  const saveInlineEdit = useCallback(
    async (field: string, value: unknown) => {
      const resume = resumes[activeTab];
      if (!resume || saving) return;

      setSaving(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/v1/employee/resume/${resume.resume_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? "Save failed");
        }

        const result = await res.json();

        setResumes((prev) =>
          prev.map((r, i) =>
            i === activeTab
              ? {
                  ...r,
                  summary_statement:
                    result.summary_statement ?? r.summary_statement,
                  skills_section: result.skills_section ?? r.skills_section,
                  experience_section:
                    result.experience_section ?? r.experience_section,
                  keywords: result.keywords ?? r.keywords,
                  full_content: result.full_content ?? r.full_content,
                }
              : r
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes");
      } finally {
        setSaving(false);
        setEditingField(null);
      }
    },
    [resumes, activeTab, saving]
  );

  // ─── Apply suggestion ─────────────────────────────────────────────

  const applyBulletSuggestion = useCallback(
    (weakBullet: WeakBullet) => {
      const resume = resumes[activeTab];
      if (!resume) return;

      const updatedExperience = resume.experience_section.map((exp) => ({
        ...exp,
        bullets: exp.bullets.map((b) =>
          b === weakBullet.bullet_text ? weakBullet.suggested_rewrite : b
        ),
      }));

      saveInlineEdit("experience_section", updatedExperience);
    },
    [resumes, activeTab, saveInlineEdit]
  );

  // ─── Inline edit helpers ──────────────────────────────────────────

  const startEditing = useCallback(
    (field: string, currentValue: string) => {
      setEditingField(field);
      setEditValue(currentValue);
      setTimeout(() => editRef.current?.focus(), 50);
    },
    []
  );

  const commitEdit = useCallback(() => {
    if (!editingField || !editValue.trim()) return;
    saveInlineEdit(editingField, editValue.trim());
  }, [editingField, editValue, saveInlineEdit]);

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  // ─── Download handler ──────────────────────────────────────────

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      const resume = resumes[activeTab];
      if (!resume || downloading) return;

      setDownloading(format);
      setError(null);

      try {
        const res = await fetch(
          `/api/v1/employee/resume/${resume.resume_id}/download`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ?? `Failed to generate ${format.toUpperCase()}`
          );
        }

        const data = await res.json();
        const anchor = document.createElement("a");
        anchor.href = data.data.download_url;
        anchor.download = `resume.${format}`;
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Download failed"
        );
      } finally {
        setDownloading(null);
      }
    },
    [resumes, activeTab, downloading]
  );

  // ─── Current resume ──────────────────────────────────────────────

  const currentResume = resumes[activeTab] ?? null;
  const fullContent = currentResume?.full_content;
  const feedback = currentResume?.scores?.feedback;

  // ─── Loading skeleton ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 animate-fade-in">
        <div className="mx-auto max-w-7xl space-y-6">
          {generating && (
            <div className="text-center py-4">
              {longWait ? (
                <>
                  <p className="text-sm text-text-secondary">
                    This is taking longer than usual. We&apos;ll email you when
                    it&apos;s ready.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/dashboard")}
                  >
                    Back to dashboard
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary">{contextMsg}</p>
                  <div className="mt-3 mx-auto h-1 w-48 overflow-hidden rounded-full bg-border">
                    <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: "60%" }} />
                  </div>
                </>
              )}
            </div>
          )}
          {/* Tab skeleton */}
          <div className="flex gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-shimmer rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-shimmer rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────

  if (error && resumes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="text-lg font-semibold text-text-primary">
            Unable to load resumes
          </h2>
          <p className="text-sm text-text-secondary">{error}</p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                hasFetched.current = false;
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
            >
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty state (no selected paths) ──────────────────────────────

  if (resumes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <FileText className="mx-auto h-12 w-12 text-muted" />
          <h2 className="text-lg font-semibold text-text-primary">
            No resumes yet
          </h2>
          <p className="text-sm text-text-secondary">
            Complete your role targeting and transition plan to generate tailored
            resumes.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main workspace ───────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Resume Workspace
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review, edit, and refine your tailored resumes
          </p>
        </div>

        {/* Inline error */}
        {error && (
          <div className="flex items-center gap-3 rounded-md border border-danger/20 bg-danger/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <p className="flex-1 text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-danger/60 hover:text-danger transition-default"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {resumes.map((resume, idx) => (
            <button
              key={resume.resume_id}
              type="button"
              onClick={() => {
                setActiveTab(idx);
                setEditingField(null);
              }}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-default border-b-2 -mb-px",
                idx === activeTab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
              )}
            >
              {resume.role_path_title ?? `Resume ${idx + 1}`}
              {resume.is_primary && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Job-Specific Suggestions ─── */}
        <SuggestionsPanel
          suggestions={suggestions}
          expanded={suggestionsExpanded}
          onToggleExpanded={() => setSuggestionsExpanded((p) => !p)}
          activeKitFilter={activeKitFilter}
          onFilterChange={setActiveKitFilter}
          onApply={applySuggestion}
          onDismiss={dismissSuggestion}
          containerRef={suggestionsRef}
        />

        {/* Content: Preview + Editing panel */}
        {currentResume && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left: Resume Preview ─── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Employee Name */}
              {employeeName && (
                <div className="rounded-lg border border-border bg-surface px-4 py-3">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {employeeName}
                  </h2>
                </div>
              )}

              {/* Summary */}
              <ResumeSection
                title="Summary"
                onEdit={() =>
                  startEditing(
                    "summary_statement",
                    currentResume.summary_statement
                  )
                }
                editing={editingField === "summary_statement"}
              >
                {editingField === "summary_statement" ? (
                  <div className="space-y-2">
                    <textarea
                      ref={editRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={commitEdit}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-primary leading-relaxed">
                    {currentResume.summary_statement}
                  </p>
                )}
              </ResumeSection>

              {/* Skills */}
              <ResumeSection
                title="Key Skills"
                onEdit={() =>
                  startEditing(
                    "skills_section",
                    currentResume.skills_section.join(", ")
                  )
                }
                editing={editingField === "skills_section"}
              >
                {editingField === "skills_section" ? (
                  <div className="space-y-2">
                    <textarea
                      ref={editRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={2}
                      placeholder="Separate skills with commas"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const skills = editValue
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (skills.length > 0) {
                            saveInlineEdit("skills_section", skills);
                          }
                        }}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentResume.skills_section.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-primary-light px-2 py-1 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </ResumeSection>

              {/* Experience */}
              {currentResume.experience_section.map((exp, idx) => (
                <ResumeSection
                  key={`exp-${idx}`}
                  title={`${exp.title} — ${exp.company}`}
                  subtitle={exp.dates}
                  onEdit={() => {
                    setEditingField(`experience-${idx}`);
                    setEditValue(exp.bullets.join("\n"));
                    setTimeout(() => editRef.current?.focus(), 50);
                  }}
                  editing={editingField === `experience-${idx}`}
                >
                  {editingField === `experience-${idx}` ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={Math.max(4, exp.bullets.length + 1)}
                        placeholder="One bullet per line"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const bullets = editValue
                              .split("\n")
                              .map((b) => b.trim())
                              .filter(Boolean);
                            if (bullets.length > 0) {
                              const updated =
                                currentResume.experience_section.map(
                                  (e, i) =>
                                    i === idx ? { ...e, bullets } : e
                                );
                              saveInlineEdit("experience_section", updated);
                            }
                          }}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {exp.bullets.map((bullet, bi) => (
                        <li
                          key={bi}
                          className="text-sm text-text-primary leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-secondary"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </ResumeSection>
              ))}

              {/* Education */}
              {fullContent?.education_section &&
                fullContent.education_section.length > 0 && (
                  <ResumeSection title="Education">
                    <ul className="space-y-2">
                      {fullContent.education_section.map((edu, i) => (
                        <li key={i} className="text-sm text-text-primary">
                          <span className="font-medium">
                            {edu.degree && edu.field
                              ? `${edu.degree} in ${edu.field}`
                              : edu.degree ?? edu.field ?? "Degree"}
                          </span>
                          <span className="text-text-secondary">
                            {" "}
                            — {edu.institution}
                            {edu.year ? `, ${edu.year}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ResumeSection>
                )}

              {/* Certifications */}
              {fullContent?.certifications_section &&
                fullContent.certifications_section.length > 0 && (
                  <ResumeSection title="Certifications">
                    <ul className="space-y-1">
                      {fullContent.certifications_section.map((cert, i) => (
                        <li
                          key={i}
                          className="text-sm text-text-primary"
                        >
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </ResumeSection>
                )}

              {/* Keywords */}
              <ResumeSection title="ATS Keywords">
                <div className="flex flex-wrap gap-1.5">
                  {currentResume.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center rounded bg-background px-2 py-0.5 text-xs text-text-secondary border border-border"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </ResumeSection>
            </div>

            {/* ─── Right: Editing Panel ─── */}
            <div className="space-y-4">
              {/* Quality Scores */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Quality Scores
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRescore}
                    disabled={rescoring}
                    className="text-xs"
                  >
                    {rescoring ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Scoring...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        Re-score Resume
                      </span>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted">
                  Role fit score — how well this resume matches{" "}
                  {currentResume.role_path_title ?? "target role"} positions
                  generally
                </p>

                <ScoreGauge
                  label="ATS Strength"
                  score={currentResume.scores.ats}
                  feedback={feedback?.ats_feedback}
                />
                <ScoreGauge
                  label="Clarity"
                  score={currentResume.scores.clarity}
                  feedback={feedback?.clarity_feedback}
                />
                <ScoreGauge
                  label="Specificity"
                  score={currentResume.scores.specificity}
                  feedback={feedback?.specificity_feedback}
                />
              </div>

              {/* Tone Selector */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Tone
                </h3>
                <div className="space-y-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      disabled={regenerating}
                      onClick={() => {
                        if (t.value !== currentResume.tone) {
                          handleToneChange(t.value);
                        }
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-default",
                        currentResume.tone === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-background"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                          currentResume.tone === t.value
                            ? "border-primary"
                            : "border-border"
                        )}
                      >
                        {currentResume.tone === t.value && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {t.label}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {regenerating && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Regenerating with new tone...
                  </div>
                )}
              </div>

              {/* Download */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Resume
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload("pdf")}
                    disabled={!!downloading}
                    className="flex-1"
                  >
                    {downloading === "pdf" ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      "PDF"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload("docx")}
                    disabled={!!downloading}
                    className="flex-1"
                  >
                    {downloading === "docx" ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      "DOCX"
                    )}
                  </Button>
                </div>
              </div>

              {/* Missing Metrics */}
              {feedback?.missing_metrics &&
                feedback.missing_metrics.length > 0 && (
                  <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Missing Metrics
                    </h3>
                    <ul className="space-y-3">
                      {feedback.missing_metrics.map((mm, i) => {
                        const expIdx = currentResume.experience_section.findIndex(
                          (exp) =>
                            exp.title === mm.role ||
                            exp.company === mm.role ||
                            `${exp.title} — ${exp.company}` === mm.role
                        );
                        return (
                          <li key={i} className="text-xs text-text-secondary">
                            <p className="font-medium text-text-primary">
                              {mm.role}
                            </p>
                            <p className="mt-0.5 italic">
                              &ldquo;{mm.bullet_text}&rdquo;
                            </p>
                            <p className="mt-0.5 text-warning">
                              {mm.suggestion}
                            </p>
                            {expIdx >= 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const exp =
                                    currentResume.experience_section[expIdx];
                                  setEditingField(`experience-${expIdx}`);
                                  setEditValue(exp.bullets.join("\n"));
                                  setTimeout(
                                    () => editRef.current?.focus(),
                                    50
                                  );
                                }}
                                className="mt-1 flex items-center gap-1.5 rounded-md border border-warning/20 bg-warning/5 px-2 py-1 text-xs font-medium text-warning hover:bg-warning/10 transition-default"
                              >
                                <Edit3 className="h-3 w-3" />
                                Edit this bullet
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              {/* Weak Bullets */}
              {feedback?.weak_bullets && feedback.weak_bullets.length > 0 && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Weak Bullets
                  </h3>
                  <ul className="space-y-3">
                    {feedback.weak_bullets.map((wb, i) => (
                      <li key={i} className="text-xs space-y-1">
                        <p className="font-medium text-text-primary">
                          {wb.role}
                        </p>
                        <p className="italic text-text-secondary">
                          &ldquo;{wb.bullet_text}&rdquo;
                        </p>
                        <p className="text-danger text-xs">{wb.issue}</p>
                        <button
                          type="button"
                          onClick={() => applyBulletSuggestion(wb)}
                          disabled={saving}
                          className="mt-1 flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-default"
                        >
                          <Check className="h-3 w-3" />
                          Apply: &ldquo;{wb.suggested_rewrite.slice(0, 60)}
                          {wb.suggested_rewrite.length > 60 ? "..." : ""}
                          &rdquo;
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General Suggestions */}
              {feedback?.suggestions && feedback.suggestions.length > 0 && (
                <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Suggestions
                  </h3>
                  <ul className="space-y-1.5">
                    {feedback.suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="text-xs text-text-secondary flex items-start gap-2"
                      >
                        <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 rotate-[-90deg] text-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Version info */}
              <p className="text-xs text-muted text-center">
                Version {currentResume.version} · {currentResume.tone} tone
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function ResumeSection({
  title,
  subtitle,
  onEdit,
  editing,
  children,
}: {
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  editing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-2 transition-default">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        {onEdit && !editing && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:text-primary hover:bg-primary/5 transition-default"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SuggestionsPanel({
  suggestions,
  expanded,
  onToggleExpanded,
  activeKitFilter,
  onFilterChange,
  onApply,
  onDismiss,
  containerRef,
}: {
  suggestions: SuggestionItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  activeKitFilter: string | null;
  onFilterChange: (kitId: string | null) => void;
  onApply: (kitId: string, index: number) => void;
  onDismiss: (kitId: string, index: number) => void;
  containerRef: React.Ref<HTMLDivElement>;
}) {
  const pending = suggestions.filter((s) => !s.dismissed && !s.applied);
  if (pending.length === 0) return null;

  // Group by kit_id to check how many kits have suggestions
  const kitGroups = new Map<string, SuggestionItem[]>();
  for (const s of pending) {
    const existing = kitGroups.get(s.kit_id) ?? [];
    existing.push(s);
    kitGroups.set(s.kit_id, existing);
  }

  const kitCount = kitGroups.size;
  const filtered = activeKitFilter
    ? pending.filter((s) => s.kit_id === activeKitFilter)
    : pending;

  // Derive label for the notification bar
  const firstPending = pending[0];
  const notificationText =
    kitCount === 1
      ? `${pending.length} suggested edit${pending.length === 1 ? "" : "s"} from your ${firstPending.company_name} ${firstPending.job_title} application kit`
      : `${pending.length} pending edit${pending.length === 1 ? "" : "s"} from ${kitCount} application kits`;

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Notification bar */}
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex items-center gap-3 rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-left transition-default hover:bg-amber-100/60"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="flex-1 text-sm font-medium text-amber-800">
          {notificationText}
        </p>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-amber-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-600" />
        )}
      </button>

      {/* Collapsible suggestions panel */}
      {expanded && (
        <div className="space-y-3 animate-fade-in">
          {/* Kit filter dropdown (only if multiple kits) */}
          {kitCount > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Filter by:</span>
              <select
                value={activeKitFilter ?? ""}
                onChange={(e) =>
                  onFilterChange(e.target.value || null)
                }
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All kits</option>
                {Array.from(kitGroups.entries()).map(([kitId, items]) => (
                  <option key={kitId} value={kitId}>
                    {items[0].company_name} — {items[0].job_title} ({items.length})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Suggestion cards */}
          <div className="space-y-2">
            {filtered.map((suggestion) => (
              <div
                key={`${suggestion.kit_id}-${suggestion.index}`}
                className="rounded-lg border border-amber-200/60 bg-white p-3 space-y-2 transition-default"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-amber-700">
                      {suggestion.company_name} — {suggestion.job_title}
                    </p>
                    <p className="text-sm text-text-primary leading-relaxed">
                      {suggestion.text}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onApply(suggestion.kit_id, suggestion.index)
                    }
                    className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-default"
                  >
                    <Check className="h-3 w-3" />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onDismiss(suggestion.kit_id, suggestion.index)
                    }
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition-default"
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({
  label,
  score,
  feedback,
}: {
  label: string;
  score: number | null;
  feedback?: string;
}) {
  const pct = score ?? 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span
          className={cn("text-sm font-mono font-medium", scoreColor(score))}
        >
          {score !== null ? `${score}%` : "—"}
        </span>
      </div>
      {score !== null ? (
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              scoreBg(score)
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-1 w-full rounded-full bg-border" />
      )}
      {feedback && (
        <p className="text-[11px] text-muted leading-snug">{feedback}</p>
      )}
    </div>
  );
}
