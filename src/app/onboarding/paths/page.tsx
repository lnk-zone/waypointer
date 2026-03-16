"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface RolePath {
  id: string;
  title: string;
  category: string;
  why_it_fits: string;
  salary_band_min: number;
  salary_band_max: number;
  demand_level: "high" | "medium" | "low";
  confidence_score: number;
  skills_overlap_pct: number;
  gap_analysis: string;
  title_variations?: string[];
  core_keywords?: string[];
  ideal_company_profile?: string;
  is_primary: boolean;
  is_custom: boolean;
  is_selected: boolean;
  sort_order: number;
}

interface SelectionState {
  primaryId: string | null;
  selectedIds: Set<string>;
}

// ─── Constants ────────────────────────────────────────────────────────

const CONTEXTUAL_MESSAGES = [
  { text: "Analyzing your career options...", delay: 0 },
  { text: "Matching your skills to market demand...", delay: 4000 },
  { text: "Evaluating compensation ranges...", delay: 8000 },
];

const LONG_WAIT_THRESHOLD = 15000;
const LONG_WAIT_MESSAGE = "This is taking a bit longer than usual...";
const ESTIMATED_TIME_MESSAGE = "This usually takes 10\u201315 seconds";

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

const DEMAND_CONFIG = {
  high: {
    label: "High Demand",
    color: "text-success",
    bgColor: "bg-success/10",
    Icon: TrendingUp,
  },
  medium: {
    label: "Medium Demand",
    color: "text-warning",
    bgColor: "bg-warning/10",
    Icon: Minus,
  },
  low: {
    label: "Low Demand",
    color: "text-danger",
    bgColor: "bg-danger/10",
    Icon: TrendingDown,
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────

function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────

function PathsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-md border border-border p-6 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className={cn("h-6 w-64", SKELETON_CLASS)} />
              <div className={cn("h-4 w-24", SKELETON_CLASS)} />
            </div>
            <div className={cn("h-8 w-20 rounded-full", SKELETON_CLASS)} />
          </div>
          <div className="space-y-1.5">
            <div className={cn("h-4 w-full", SKELETON_CLASS)} />
            <div className={cn("h-4 w-3/4", SKELETON_CLASS)} />
          </div>
          <div className="flex gap-6">
            <div className={cn("h-4 w-32", SKELETON_CLASS)} />
            <div className={cn("h-4 w-24", SKELETON_CLASS)} />
            <div className={cn("h-4 w-28", SKELETON_CLASS)} />
          </div>
          <div className="space-y-1">
            <div className={cn("h-3 w-24", SKELETON_CLASS)} />
            <div className={cn("h-2 w-full rounded-full", SKELETON_CLASS)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Role Path Card ───────────────────────────────────────────────────

function RolePathCard({
  path,
  isPrimary,
  isSelected,
  onSelect,
}: {
  path: RolePath;
  isPrimary: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const demand = DEMAND_CONFIG[path.demand_level];
  const DemandIcon = demand.Icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-md border-2 p-6 space-y-4 transition-default",
        "hover:border-primary/50 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isPrimary
          ? "border-primary bg-primary/5"
          : isSelected
            ? "border-primary/40 bg-primary/[0.02]"
            : "border-border bg-surface"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-semibold leading-6 text-text-primary">
              {path.title}
            </h3>
            {isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3 w-3" />
                Primary
              </span>
            )}
            {isSelected && !isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Selected
              </span>
            )}
            {path.is_custom && (
              <span className="inline-flex items-center rounded-full bg-muted/20 px-2.5 py-0.5 text-xs font-medium text-muted">
                Custom
              </span>
            )}
          </div>
          <p className="text-sm text-muted capitalize">{path.category.replace(/_/g, " ")}</p>
        </div>

        {/* Confidence badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[15px] font-semibold text-text-primary">
            {Math.round(path.confidence_score * 100)}%
          </span>
          <span className="text-xs text-muted">match</span>
        </div>
      </div>

      {/* Why it fits */}
      <p className="text-[15px] leading-6 text-text-secondary">
        {path.why_it_fits}
      </p>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {/* Salary band */}
        <div className="text-text-secondary">
          <span className="font-medium text-text-primary">
            {formatSalary(path.salary_band_min)} &ndash; {formatSalary(path.salary_band_max)}
          </span>{" "}
          salary range
        </div>

        {/* Demand level */}
        <div className={cn("flex items-center gap-1", demand.color)}>
          <DemandIcon className="h-3.5 w-3.5" />
          <span className="font-medium">{demand.label}</span>
        </div>
      </div>

      {/* Skills overlap bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Skills overlap</span>
          <span className="font-medium text-text-primary">
            {path.skills_overlap_pct}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-default"
            style={{ width: `${path.skills_overlap_pct}%` }}
          />
        </div>
      </div>

      {/* Gap analysis */}
      {path.gap_analysis && (
        <div className="rounded-sm bg-background px-3 py-2.5 text-sm text-text-secondary leading-5">
          <span className="font-medium text-text-primary">Missing pieces: </span>
          {path.gap_analysis}
        </div>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

function PathsContent() {
  const router = useRouter();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [contextualMessage, setContextualMessage] = useState(
    CONTEXTUAL_MESSAGES[0].text
  );
  const [showLongWait, setShowLongWait] = useState(false);
  const [progressPhase, setProgressPhase] = useState(0);

  // Data state
  const [paths, setPaths] = useState<RolePath[]>([]);
  const [selection, setSelection] = useState<SelectionState>({
    primaryId: null,
    selectedIds: new Set(),
  });

  // Custom path form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  // Regeneration state
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs
  const generationStarted = useRef(false);
  const messageTimers = useRef<NodeJS.Timeout[]>([]);
  const longWaitTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    messageTimers.current.forEach(clearTimeout);
    messageTimers.current = [];
    if (longWaitTimer.current) {
      clearTimeout(longWaitTimer.current);
      longWaitTimer.current = null;
    }
  }, []);

  // Generate role paths
  const generatePaths = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowLongWait(false);
    setProgressPhase(0);
    setContextualMessage(CONTEXTUAL_MESSAGES[0].text);
    setSelection({ primaryId: null, selectedIds: new Set() });

    // Set up contextual message rotation
    for (let i = 1; i < CONTEXTUAL_MESSAGES.length; i++) {
      const timer = setTimeout(() => {
        setContextualMessage(CONTEXTUAL_MESSAGES[i].text);
        setProgressPhase(i);
      }, CONTEXTUAL_MESSAGES[i].delay);
      messageTimers.current.push(timer);
    }

    // Set up long wait message
    longWaitTimer.current = setTimeout(() => {
      setShowLongWait(true);
      setProgressPhase(CONTEXTUAL_MESSAGES.length);
    }, LONG_WAIT_THRESHOLD);

    try {
      const res = await fetch("/api/v1/employee/paths/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      clearTimers();

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const errMsg = json?.error?.message ?? "Failed to generate role paths";
        setError(errMsg);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const generatedPaths: RolePath[] = data.paths ?? [];
      setPaths(generatedPaths);
      setLoading(false);
    } catch {
      clearTimers();
      setError("Something went wrong while generating role paths. Please try again.");
      setLoading(false);
    }
  }, [clearTimers]);

  // Start generation on mount
  useEffect(() => {
    if (generationStarted.current) return;
    generationStarted.current = true;
    generatePaths();

    return () => {
      clearTimers();
    };
  }, [generatePaths, clearTimers]);

  // Handle path selection (uses functional updater to avoid stale closures)
  const handleSelect = useCallback((pathId: string) => {
    setSelection((prev) => {
      const { primaryId: prevPrimary, selectedIds: prevSelected } = prev;

      // Clicking the current primary → deselect entirely
      if (prevPrimary === pathId) {
        return { primaryId: null, selectedIds: prevSelected };
      }

      // Clicking a secondary → toggle it off
      if (prevSelected.has(pathId)) {
        const next = new Set(prevSelected);
        next.delete(pathId);
        return { primaryId: prevPrimary, selectedIds: next };
      }

      // Clicking an unselected path when no primary → make it primary
      if (!prevPrimary) {
        return { primaryId: pathId, selectedIds: prevSelected };
      }

      // Clicking an unselected path when primary exists → add as secondary
      const next = new Set(prevSelected);
      next.add(pathId);
      return { primaryId: prevPrimary, selectedIds: next };
    });
  }, []);

  // Save selections and navigate
  const handleBuildPlan = useCallback(async () => {
    if (!selection.primaryId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/employee/paths/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_path_id: selection.primaryId,
          secondary_path_ids: Array.from(selection.selectedIds),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to save selections");
        setSaving(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to save your selections. Please try again.");
      setSaving(false);
    }
  }, [selection, router]);

  // Handle retry (initial load error)
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await generatePaths();
    setRetrying(false);
  }, [generatePaths]);

  // Handle regeneration (suggest different paths)
  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setError(null);

    // All current non-selected path IDs are "rejected"
    const rejectedIds = paths
      .filter(
        (p) =>
          p.id !== selection.primaryId &&
          !selection.selectedIds.has(p.id)
      )
      .map((p) => p.id);

    if (rejectedIds.length === 0) {
      // All paths are selected — nothing to regenerate
      setRegenerating(false);
      return;
    }

    const feedback = regenerateFeedback.trim() || undefined;

    try {
      const res = await fetch("/api/v1/employee/paths/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejected_path_ids: rejectedIds,
          ...(feedback ? { feedback } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to regenerate paths");
        setRegenerating(false);
        return;
      }

      const data = await res.json();
      const newPaths: RolePath[] = data.paths ?? [];
      setPaths(newPaths);

      // Keep existing selections for paths that still exist
      setSelection((prev) => {
        const newIds = new Set(newPaths.map((p) => p.id));
        const newSelectedIds = new Set<string>();
        prev.selectedIds.forEach((id) => {
          if (newIds.has(id)) newSelectedIds.add(id);
        });
        return {
          primaryId: prev.primaryId && newIds.has(prev.primaryId) ? prev.primaryId : null,
          selectedIds: newSelectedIds,
        };
      });

      setRegenerateFeedback("");
      setShowRegenerateForm(false);
      setRegenerating(false);
    } catch {
      setError("Failed to regenerate paths. Please try again.");
      setRegenerating(false);
    }
  }, [paths, selection, regenerateFeedback]);

  // Handle custom path submission
  const handleAddCustomPath = useCallback(async () => {
    const trimmed = customTitle.trim();
    if (!trimmed) return;

    setAddingCustom(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/employee/paths/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to create custom path");
        setAddingCustom(false);
        return;
      }

      const newPath: RolePath = await res.json();
      setPaths((prev) => [...prev, newPath]);
      setCustomTitle("");
      setShowCustomForm(false);
      setAddingCustom(false);
    } catch {
      setError("Failed to create custom path. Please try again.");
      setAddingCustom(false);
    }
  }, [customTitle]);

  // Count selected paths (primary + secondary)
  const totalSelected = (selection.primaryId ? 1 : 0) + selection.selectedIds.size;

  // ─── Error State ─────────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-12">
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
              <AlertCircle className="h-8 w-8 text-danger" />
            </div>

            <div className="space-y-2">
              <h1 className="text-h1 text-text-primary">
                Couldn&rsquo;t generate paths
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
                onClick={() => router.push("/onboarding/snapshot")}
              >
                Back to snapshot review
              </Button>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 pb-8 text-center">
          <p className="text-caption text-muted">Powered by Waypointer</p>
        </footer>
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-12">
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-h1 text-text-primary transition-default">
                {contextualMessage}
              </h1>
              <p className="text-body text-text-secondary">
                {showLongWait
                  ? LONG_WAIT_MESSAGE
                  : ESTIMATED_TIME_MESSAGE}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mx-auto w-full max-w-md">
              <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: ["30%", "55%", "70%", "85%"][progressPhase] ?? "85%",
                    transition: "width 2s ease-out",
                  }}
                />
              </div>
            </div>

            <PathsSkeleton />
          </div>
        </main>

        <footer className="w-full px-6 pb-8 text-center">
          <p className="text-caption text-muted">Powered by Waypointer</p>
        </footer>
      </div>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────────

  if (paths.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-12">
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-h1 text-text-primary">No paths generated</h1>
              <p className="text-body text-text-secondary">
                We weren&rsquo;t able to generate role paths. Try again or go back to review your snapshot.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full rounded-sm"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? "Generating..." : "Try again"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/onboarding/snapshot")}
              >
                Back to snapshot review
              </Button>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 pb-8 text-center">
          <p className="text-caption text-muted">Powered by Waypointer</p>
        </footer>
      </div>
    );
  }

  // ─── Results State ───────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background animate-fade-in">
      <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
        <span className="text-h2 text-text-secondary">Waypointer</span>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-12">
        <div className="space-y-8">
          {/* Page heading */}
          <div className="space-y-2 text-center">
            <h1 className="text-h1 text-text-primary">
              Your target role paths
            </h1>
            <p className="text-body text-text-secondary">
              Based on your experience, here are 3 career paths we recommend.
              Select at least one to build your search plan.
            </p>
          </div>

          {/* Role path cards */}
          <div className="space-y-4">
            {paths.map((path) => (
              <RolePathCard
                key={path.id}
                path={path}
                isPrimary={selection.primaryId === path.id}
                isSelected={selection.selectedIds.has(path.id)}
                onSelect={() => handleSelect(path.id)}
              />
            ))}
          </div>

          {/* Empty selection hint */}
          {totalSelected === 0 && (
            <p className="text-center text-sm text-muted">
              Select at least one target path to continue.
            </p>
          )}

          {/* Regenerate feedback form */}
          {showRegenerateForm && (
            <div className="mx-auto w-full max-w-md space-y-3">
              <label className="block text-sm font-medium text-text-primary">
                What kind of roles are you looking for instead?{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., more technical roles, higher seniority, different industry"
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !regenerating) {
                    handleRegenerate();
                  }
                }}
                disabled={regenerating}
              />
              <div className="flex gap-2">
                <Button
                  size="default"
                  className="rounded-sm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Suggest different paths"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegenerateForm(false);
                    setRegenerateFeedback("");
                  }}
                  disabled={regenerating}
                  className="text-sm text-muted hover:text-text-secondary transition-default disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Custom path form */}
          {showCustomForm && (
            <div className="mx-auto w-full max-w-md space-y-3">
              <label className="block text-sm font-medium text-text-primary">
                Enter a target role title
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., Product Manager at SaaS companies"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !addingCustom) {
                      handleAddCustomPath();
                    }
                  }}
                  disabled={addingCustom}
                  className="flex-1"
                />
                <Button
                  size="default"
                  className="rounded-sm shrink-0"
                  onClick={handleAddCustomPath}
                  disabled={!customTitle.trim() || addingCustom}
                >
                  {addingCustom ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomTitle("");
                }}
                className="text-sm text-muted hover:text-text-secondary transition-default"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full max-w-md rounded-sm"
              disabled={totalSelected === 0 || saving || regenerating || addingCustom}
              onClick={handleBuildPlan}
            >
              {saving ? "Saving selections..." : "Build my search plan"}
            </Button>

            <div className="flex items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setShowRegenerateForm(true)}
                disabled={regenerating || saving || addingCustom || showRegenerateForm}
                className="font-medium text-primary hover:text-primary/80 transition-default disabled:opacity-50"
              >
                {regenerating ? "Generating..." : "Suggest different paths"}
              </button>
              <span className="text-border">&middot;</span>
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                disabled={saving || showCustomForm || addingCustom}
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-default disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add custom path
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full px-6 pb-8 text-center">
        <p className="text-caption text-muted">Powered by Waypointer</p>
      </footer>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────────

export default function PathsPage() {
  return (
    <EmployeeRoute>
      <PathsContent />
    </EmployeeRoute>
  );
}
