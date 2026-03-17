"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────

interface WorkHistoryItem {
  id: string;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  is_management_role: boolean;
}

interface SkillItem {
  id: string;
  name: string;
  category: string;
  confidence: number;
  is_user_added?: boolean;
}

interface AchievementItem {
  id: string;
  statement: string;
  impact: string;
  has_metric: boolean;
  source_text: string | null;
  work_history_id: string | null;
}

interface IndustryItem {
  id: string;
  name: string;
  confidence: number;
}

interface ToolItem {
  id: string;
  name: string;
  category: string;
  confidence: number;
}

interface SnapshotData {
  snapshot_id: string;
  career_narrative: string;
  work_history: WorkHistoryItem[];
  skills: SkillItem[];
  achievements: AchievementItem[];
  industries: IndustryItem[];
  tools: ToolItem[];
}

// ─── Constants ──────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  { value: "entry_level", label: "Entry-Level" },
  { value: "mid_level", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "staff_principal", label: "Staff / Principal" },
  { value: "manager", label: "Manager" },
  { value: "senior_manager", label: "Senior Manager" },
  { value: "director", label: "Director" },
  { value: "vp_plus", label: "VP+" },
] as const;

const MANAGEMENT_OPTIONS = [
  { value: "no_direct_reports", label: "No direct reports" },
  { value: "1_to_3", label: "1\u20133 direct reports" },
  { value: "4_to_10", label: "4\u201310 direct reports" },
  { value: "10_plus", label: "10+ direct reports" },
] as const;

const LEVEL_DIRECTION_OPTIONS = [
  { value: "stay_current", label: "Stay at current level" },
  { value: "open_to_step_up", label: "Open to a step up" },
  { value: "open_to_step_down", label: "Open to a step down" },
] as const;

const IMPACT_LABELS: Record<string, string> = {
  revenue: "Revenue",
  efficiency: "Efficiency",
  scale: "Scale",
  quality: "Quality",
  leadership: "Leadership",
};

const IMPACT_COLORS: Record<string, string> = {
  revenue: "bg-emerald-100 text-emerald-700",
  efficiency: "bg-blue-100 text-blue-700",
  scale: "bg-purple-100 text-purple-700",
  quality: "bg-amber-100 text-amber-700",
  leadership: "bg-rose-100 text-rose-700",
};

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

// ─── Skeleton Loading ───────────────────────────────────────────────────

function SnapshotSkeleton() {
  return (
    <div className="space-y-8">
      {/* Identity fields skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className={cn("h-4 w-24", SKELETON_CLASS)} />
            <div className={cn("h-10 w-full", SKELETON_CLASS)} />
          </div>
        ))}
      </div>

      {/* Career narrative skeleton */}
      <div className="space-y-2">
        <div className={cn("h-4 w-32", SKELETON_CLASS)} />
        <div className={cn("h-24 w-full", SKELETON_CLASS)} />
      </div>

      {/* Work history skeleton */}
      <div className="space-y-3">
        <div className={cn("h-4 w-28", SKELETON_CLASS)} />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-md border border-border p-4 space-y-2"
          >
            <div className={cn("h-5 w-48", SKELETON_CLASS)} />
            <div className={cn("h-4 w-32", SKELETON_CLASS)} />
          </div>
        ))}
      </div>

      {/* Skills skeleton */}
      <div className="space-y-3">
        <div className={cn("h-4 w-20", SKELETON_CLASS)} />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn("h-8 w-24 rounded-full", SKELETON_CLASS)} />
          ))}
        </div>
      </div>

      {/* Achievements skeleton */}
      <div className="space-y-3">
        <div className={cn("h-4 w-28", SKELETON_CLASS)} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-16 w-full rounded-md", SKELETON_CLASS)} />
        ))}
      </div>
    </div>
  );
}

// ─── Skill Chip ─────────────────────────────────────────────────────────

function SkillChip({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <span className="group inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-1 text-caption font-medium text-primary transition-default">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-default"
        aria-label={`Remove ${name}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </button>
    </span>
  );
}

// ─── Add Skill Input ────────────────────────────────────────────────────

function AddSkillInput({
  category,
  onAdd,
}: {
  category: string;
  onAdd: (name: string, category: string) => void;
}) {
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed, category);
      setValue("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-caption text-muted hover:border-primary hover:text-primary transition-default"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8" />
        </svg>
        Add
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="inline-flex items-center gap-1"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setIsOpen(false);
          }
        }}
        placeholder="Skill name"
        className="h-7 w-32 text-caption px-2"
      />
    </form>
  );
}

// ─── Add Chip Input (generic for industries/tools) ──────────────────────

function AddChipInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      setValue("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-caption text-muted hover:border-primary hover:text-primary transition-default"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8" />
        </svg>
        Add
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="inline-flex items-center gap-1"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        className="h-7 w-32 text-caption px-2"
      />
    </form>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

function SnapshotContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Identity fields (from employee profile, not snapshot)
  const [seniority, setSeniority] = useState("");
  const [managementExp, setManagementExp] = useState("");
  const [levelDir, setLevelDir] = useState("");

  // Edit states
  const [narrativeValue, setNarrativeValue] = useState("");
  const [narrativeDirty, setNarrativeDirty] = useState(false);
  const [editingWorkHistory, setEditingWorkHistory] = useState<string | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<string | null>(null);
  const [expandedWorkHistory, setExpandedWorkHistory] = useState<Set<string>>(new Set());
  const [addingAchievementFor, setAddingAchievementFor] = useState<string | null>(null);

  // Saving states
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Fetch snapshot data and identity fields on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch snapshot and profile in parallel
        const [snapshotRes, profileRes] = await Promise.all([
          fetch("/api/v1/employee/snapshot"),
          fetch("/api/v1/employee/profile"),
        ]);

        if (!snapshotRes.ok) {
          const json = await snapshotRes.json().catch(() => null);
          setError(json?.error?.message ?? "Failed to load career snapshot");
          return;
        }

        const snapshotData = await snapshotRes.json();
        setSnapshot(snapshotData);
        setNarrativeValue(snapshotData.career_narrative ?? "");

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setSeniority(profile.seniority ?? "");
          setManagementExp(profile.management_exp ?? "");
          setLevelDir(profile.level_dir ?? "");
        }
      } catch {
        setError("Failed to load career snapshot. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    if (!snapshot) return {};
    const grouped: Record<string, SkillItem[]> = {};
    for (const skill of snapshot.skills) {
      const cat = skill.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    }
    return grouped;
  }, [snapshot]);

  const categoryLabels: Record<string, string> = {
    technical: "Technical Skills",
    domain: "Domain Skills",
    soft_skill: "Soft Skills",
  };

  // Save a partial update
  const saveUpdate = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/employee/snapshot", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error?.message ?? "Failed to save changes");
          return null;
        }

        const updated: SnapshotData = await res.json();
        setSnapshot(updated);
        setNarrativeValue(updated.career_narrative ?? "");
        return updated;
      } catch {
        setError("Failed to save changes. Please try again.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Save career narrative on blur
  const handleNarrativeBlur = useCallback(() => {
    if (narrativeDirty && snapshot) {
      saveUpdate({ career_narrative: narrativeValue });
      setNarrativeDirty(false);
    }
  }, [narrativeDirty, narrativeValue, snapshot, saveUpdate]);

  // Add skill
  const handleAddSkill = useCallback(
    (name: string, category: string) => {
      saveUpdate({ skills_add: [{ name, category }] });
    },
    [saveUpdate]
  );

  // Remove skill
  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      saveUpdate({ skills_remove: [skillId] });
    },
    [saveUpdate]
  );

  // Update achievement
  const handleUpdateAchievement = useCallback(
    (id: string, statement: string) => {
      saveUpdate({ achievements_update: [{ id, statement }] });
      setEditingAchievement(null);
    },
    [saveUpdate]
  );

  // Remove achievement
  const handleRemoveAchievement = useCallback(
    (id: string) => {
      saveUpdate({ achievements_remove: [id] });
    },
    [saveUpdate]
  );

  // Add achievement to a specific work history entry
  const handleAddAchievement = useCallback(
    (statement: string, workHistoryId: string | null) => {
      saveUpdate({ achievements_add: [{ statement, work_history_id: workHistoryId }] });
      setAddingAchievementFor(null);
    },
    [saveUpdate]
  );

  // Toggle work history accordion
  const toggleWorkHistory = useCallback((whId: string) => {
    setExpandedWorkHistory((prev) => {
      const next = new Set(prev);
      if (next.has(whId)) {
        next.delete(whId);
      } else {
        next.add(whId);
      }
      return next;
    });
  }, []);

  // Update work history
  const handleUpdateWorkHistory = useCallback(
    (id: string, fields: Record<string, string | null>) => {
      saveUpdate({ work_history_update: [{ id, ...fields }] });
      setEditingWorkHistory(null);
    },
    [saveUpdate]
  );

  // Add/remove industry
  const handleAddIndustry = useCallback(
    (name: string) => {
      saveUpdate({ industries_add: [{ name }] });
    },
    [saveUpdate]
  );

  const handleRemoveIndustry = useCallback(
    (id: string) => {
      saveUpdate({ industries_remove: [id] });
    },
    [saveUpdate]
  );

  // Add/remove tool
  const handleAddTool = useCallback(
    (name: string) => {
      saveUpdate({ tools_add: [{ name }] });
    },
    [saveUpdate]
  );

  const handleRemoveTool = useCallback(
    (id: string) => {
      saveUpdate({ tools_remove: [id] });
    },
    [saveUpdate]
  );

  // Confirm snapshot
  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/employee/snapshot/confirm", {
        method: "POST",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to confirm snapshot");
        return;
      }

      router.push("/onboarding/paths");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }, [router]);

  // Update identity field via PATCH (partial update)
  const handleIdentityUpdate = useCallback(
    async (
      field: "seniority" | "management_exp" | "level_dir",
      value: string,
      revert: () => void
    ) => {
      try {
        const res = await fetch("/api/v1/employee/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });

        if (!res.ok) {
          revert();
          setError("Failed to save identity field. Please try again.");
        }
      } catch {
        revert();
        setError("Failed to save identity field. Please try again.");
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-12">
          <div className="space-y-2 text-center mb-8">
            <h1 className="text-h1 text-text-primary">Loading your career snapshot...</h1>
            <p className="text-body text-text-secondary">Hang tight while we pull up your data.</p>
          </div>
          <SnapshotSkeleton />
        </main>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background animate-fade-in">
        <div className="space-y-4 text-center max-w-md">
          <h1 className="text-h1 text-text-primary">Something went wrong</h1>
          <p className="text-body text-text-secondary">{error}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        {/* Header */}
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>

        {/* Main */}
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-12">
          <div className="space-y-10">
            {/* Page title */}
            <div className="space-y-2 text-center">
              <h1 className="text-h1 text-text-primary">
                Review your career snapshot
              </h1>
              <p className="text-body text-text-secondary">
                We extracted this from your resume. Review each section and make
                any corrections before continuing.
              </p>
            </div>

            {/* Identity fields — confirmed facts, editable dropdowns */}
            <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-h3 text-text-primary mb-4">Your details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <fieldset className="space-y-1">
                  <Label className="text-caption text-text-secondary">
                    Seniority level
                  </Label>
                  <Select
                    value={seniority}
                    onValueChange={(v) => {
                      const prev = seniority;
                      setSeniority(v);
                      handleIdentityUpdate("seniority", v, () => setSeniority(prev));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SENIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </fieldset>

                <fieldset className="space-y-1">
                  <Label className="text-caption text-text-secondary">
                    Management experience
                  </Label>
                  <Select
                    value={managementExp}
                    onValueChange={(v) => {
                      const prev = managementExp;
                      setManagementExp(v);
                      handleIdentityUpdate("management_exp", v, () => setManagementExp(prev));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANAGEMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </fieldset>

                <fieldset className="space-y-1">
                  <Label className="text-caption text-text-secondary">
                    Level direction
                  </Label>
                  <Select
                    value={levelDir}
                    onValueChange={(v) => {
                      const prev = levelDir;
                      setLevelDir(v);
                      handleIdentityUpdate("level_dir", v, () => setLevelDir(prev));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_DIRECTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </fieldset>
              </div>
            </section>

            {/* Career narrative */}
            <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-h3 text-text-primary mb-3">
                Career narrative
              </h2>
              <Textarea
                value={narrativeValue}
                onChange={(e) => {
                  setNarrativeValue(e.target.value);
                  setNarrativeDirty(true);
                }}
                onBlur={handleNarrativeBlur}
                rows={3}
                className="resize-none"
                placeholder="A summary of your career arc..."
              />
              {narrativeDirty && (
                <p className="mt-1 text-caption text-muted">
                  Changes will save when you click away
                </p>
              )}
            </section>

            {/* Work history with collapsible achievements */}
            <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-h3 text-text-primary mb-4">Work history & achievements</h2>
              <div className="space-y-3">
                {snapshot.work_history.map((wh) => {
                  const roleAchievements = snapshot.achievements.filter(
                    (a) => a.work_history_id === wh.id
                  );
                  const isExpanded = expandedWorkHistory.has(wh.id);
                  const isEditing = editingWorkHistory === wh.id;

                  return (
                    <div key={wh.id} className="rounded-md border border-border overflow-hidden">
                      {/* Work history header — click to expand, edit button separate */}
                      {isEditing ? (
                        <WorkHistoryCard
                          item={wh}
                          isEditing
                          onStartEdit={() => {}}
                          onSave={(fields) => handleUpdateWorkHistory(wh.id, fields)}
                          onCancel={() => setEditingWorkHistory(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-4">
                          {/* Expand/collapse toggle */}
                          <button
                            type="button"
                            onClick={() => toggleWorkHistory(wh.id)}
                            className="shrink-0 flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 transition-default"
                            aria-label={isExpanded ? "Collapse achievements" : "Expand achievements"}
                          >
                            <svg
                              width="12" height="12" viewBox="0 0 12 12"
                              fill="none" stroke="currentColor" strokeWidth="2"
                              className={cn("text-muted transition-transform duration-200", isExpanded && "rotate-90")}
                            >
                              <path d="M4 2l4 4-4 4" />
                            </svg>
                          </button>

                          {/* Role info — clicking this also toggles */}
                          <button
                            type="button"
                            onClick={() => toggleWorkHistory(wh.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-body font-medium text-text-primary truncate">{wh.title}</p>
                                <p className="text-body-sm text-text-secondary">{wh.company}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-caption text-text-secondary">
                                  {wh.start_date ?? "?"} — {wh.end_date ?? "Present"}
                                </p>
                                {wh.duration_months != null && wh.duration_months > 0 && (
                                  <p className="text-caption text-muted">
                                    {Math.floor(wh.duration_months / 12) > 0 ? `${Math.floor(wh.duration_months / 12)}yr ` : ""}
                                    {wh.duration_months % 12 > 0 ? `${wh.duration_months % 12}mo` : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                            {roleAchievements.length > 0 && !isExpanded && (
                              <p className="text-caption text-muted mt-1">
                                {roleAchievements.length} achievement{roleAchievements.length !== 1 ? "s" : ""}
                              </p>
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkHistory(wh.id);
                            }}
                            className="shrink-0 flex items-center justify-center h-7 px-2 rounded text-caption text-muted hover:text-primary hover:bg-primary-light transition-default"
                          >
                            Edit
                          </button>
                        </div>
                      )}

                      {/* Collapsible achievements panel */}
                      {isExpanded && !isEditing && (
                        <div className="border-t border-border bg-gray-50/50 px-4 py-3 space-y-2">
                          {roleAchievements.length > 0 ? (
                            roleAchievements.map((ach) => (
                              <AchievementCard
                                key={ach.id}
                                item={ach}
                                isEditing={editingAchievement === ach.id}
                                onStartEdit={() => setEditingAchievement(ach.id)}
                                onSave={(statement) => handleUpdateAchievement(ach.id, statement)}
                                onCancel={() => setEditingAchievement(null)}
                                onRemove={() => handleRemoveAchievement(ach.id)}
                              />
                            ))
                          ) : (
                            <p className="text-caption text-muted py-2 text-center">No achievements for this role yet.</p>
                          )}

                          {/* Add achievement input */}
                          {addingAchievementFor === wh.id ? (
                            <AddAchievementInput
                              onAdd={(statement) => handleAddAchievement(statement, wh.id)}
                              onCancel={() => setAddingAchievementFor(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingAchievementFor(wh.id)}
                              className="inline-flex items-center gap-1.5 text-caption text-muted hover:text-primary transition-default mt-1"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M6 1v10M1 6h10" />
                              </svg>
                              Add achievement
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Unlinked achievements */}
                {snapshot.achievements.filter((a) => !a.work_history_id || !snapshot.work_history.some((wh) => wh.id === a.work_history_id)).length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-caption text-text-secondary font-medium">Other achievements</p>
                    {snapshot.achievements
                      .filter((a) => !a.work_history_id || !snapshot.work_history.some((wh) => wh.id === a.work_history_id))
                      .map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          item={ach}
                          isEditing={editingAchievement === ach.id}
                          onStartEdit={() => setEditingAchievement(ach.id)}
                          onSave={(statement) => handleUpdateAchievement(ach.id, statement)}
                          onCancel={() => setEditingAchievement(null)}
                          onRemove={() => handleRemoveAchievement(ach.id)}
                        />
                      ))}
                  </div>
                )}
                {snapshot.work_history.length === 0 && (
                  <p className="text-body-sm text-muted py-4 text-center">
                    No work history extracted. You can add roles manually after confirmation.
                  </p>
                )}
              </div>
            </section>

            {/* Skills grouped by category */}
            <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-h3 text-text-primary mb-4">Skills</h2>
              <div className="space-y-4">
                {Object.entries(skillsByCategory).map(([category, skills]) => (
                  <div key={category}>
                    <p className="text-caption text-text-secondary font-medium mb-2">
                      {categoryLabels[category] ?? category}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {skills.map((skill) => (
                        <SkillChip
                          key={skill.id}
                          name={skill.name}
                          onRemove={() => handleRemoveSkill(skill.id)}
                        />
                      ))}
                      <AddSkillInput
                        category={category}
                        onAdd={handleAddSkill}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(skillsByCategory).length === 0 && (
                  <div className="space-y-2">
                    <p className="text-body-sm text-muted text-center">
                      No skills extracted yet.
                    </p>
                    <div className="flex justify-center gap-2">
                      <AddSkillInput category="technical" onAdd={handleAddSkill} />
                      <AddSkillInput category="domain" onAdd={handleAddSkill} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Industries & Tools — side by side on desktop */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Industries */}
              <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-h3 text-text-primary mb-3">Industries</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {snapshot.industries.map((ind) => (
                    <SkillChip
                      key={ind.id}
                      name={ind.name}
                      onRemove={() => handleRemoveIndustry(ind.id)}
                    />
                  ))}
                  <AddChipInput
                    placeholder="Industry"
                    onAdd={handleAddIndustry}
                  />
                  {snapshot.industries.length === 0 && (
                    <p className="text-body-sm text-muted">
                      No industries identified.
                    </p>
                  )}
                </div>
              </section>

              {/* Tools & tech stack */}
              <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-h3 text-text-primary mb-3">
                  Tools & tech stack
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {snapshot.tools.map((tool) => (
                    <SkillChip
                      key={tool.id}
                      name={tool.name}
                      onRemove={() => handleRemoveTool(tool.id)}
                    />
                  ))}
                  <AddChipInput
                    placeholder="Tool"
                    onAdd={handleAddTool}
                  />
                  {snapshot.tools.length === 0 && (
                    <p className="text-body-sm text-muted">
                      No tools or technologies identified.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Inline error */}
            {error && (
              <p className="text-body-sm text-danger text-center">{error}</p>
            )}

            {/* Saving indicator */}
            {saving && (
              <p className="text-body-sm text-muted text-center">
                Saving changes...
              </p>
            )}

            {/* Confirm CTA */}
            <div className="pt-2">
              <Button
                size="lg"
                className="w-full rounded-sm"
                onClick={handleConfirm}
                disabled={confirming || saving}
              >
                {confirming ? "Confirming..." : "Looks right"}
              </Button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full px-6 pb-8 text-center">
          <p className="text-caption text-muted">Powered by Waypointer</p>
        </footer>
      </div>
    </TooltipProvider>
  );
}

// ─── Work History Card ──────────────────────────────────────────────────

function WorkHistoryCard({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  item: WorkHistoryItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (fields: Record<string, string | null>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [company, setCompany] = useState(item.company);
  const [startDate, setStartDate] = useState(item.start_date ?? "");
  const [endDate, setEndDate] = useState(item.end_date ?? "");

  useEffect(() => {
    setTitle(item.title);
    setCompany(item.company);
    setStartDate(item.start_date ?? "");
    setEndDate(item.end_date ?? "");
  }, [item.title, item.company, item.start_date, item.end_date]);

  const formatDate = (date: string | null) => {
    if (!date) return "Present";
    return date;
  };

  const formatDuration = (months: number | null) => {
    if (months == null) return null;
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    if (years === 0) return `${remaining}mo`;
    if (remaining === 0) return `${years}yr`;
    return `${years}yr ${remaining}mo`;
  };

  if (isEditing) {
    return (
      <div className="rounded-md border border-primary bg-primary-light/30 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-caption text-text-secondary">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-text-secondary">Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-text-secondary">Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-text-secondary">End date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
              placeholder="Leave empty for current"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              onSave({
                title,
                company,
                start_date: startDate || null,
                end_date: endDate || null,
              })
            }
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group rounded-md border border-border p-4 hover:border-primary/30 transition-default cursor-pointer"
      onClick={onStartEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartEdit();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-body font-medium text-text-primary">
            {item.title}
          </p>
          <p className="text-body-sm text-text-secondary">{item.company}</p>
        </div>
        <div className="text-right">
          <p className="text-caption text-text-secondary">
            {formatDate(item.start_date)} — {formatDate(item.end_date)}
          </p>
          {item.duration_months != null && item.duration_months > 0 && (
            <p className="text-caption text-muted">
              {formatDuration(item.duration_months)}
            </p>
          )}
        </div>
      </div>
      <p className="mt-1 text-caption text-muted opacity-0 group-hover:opacity-100 transition-default">
        Click to edit
      </p>
    </div>
  );
}

// ─── Achievement Card ───────────────────────────────────────────────────

function AchievementCard({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onRemove,
}: {
  item: AchievementItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (statement: string) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [statement, setStatement] = useState(item.statement);

  useEffect(() => {
    setStatement(item.statement);
  }, [item.statement]);

  if (isEditing) {
    return (
      <div className="rounded-md border border-primary bg-primary-light/30 p-4 space-y-3">
        <Textarea
          autoFocus
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(statement)}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-danger hover:text-danger hover:bg-red-50"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  const content = (
    <div
      className="group rounded-md border border-border p-4 hover:border-primary/30 transition-default cursor-pointer"
      onClick={onStartEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStartEdit();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-body text-text-primary">{item.statement}</p>
          <div className="mt-2 flex items-center gap-2">
            {item.impact && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium",
                  IMPACT_COLORS[item.impact] ?? "bg-gray-100 text-gray-700"
                )}
              >
                {IMPACT_LABELS[item.impact] ?? item.impact}
              </span>
            )}
            {item.has_metric && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-caption font-medium text-emerald-600">
                Has metric
              </span>
            )}
          </div>
        </div>
        <p className="text-caption text-muted opacity-0 group-hover:opacity-100 transition-default shrink-0">
          Edit
        </p>
      </div>
    </div>
  );

  if (item.source_text) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <p className="text-caption">
            <span className="font-medium">Source: </span>
            {item.source_text}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ─── Add Achievement Input ───────────────────────────────────────────────

function AddAchievementInput({
  onAdd,
  onCancel,
}: {
  onAdd: (statement: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-md border border-primary bg-primary-light/30 p-3 space-y-2">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        className="resize-none text-body-sm"
        placeholder="Describe your achievement (e.g., Increased revenue by 20% through...)"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (value.trim()) onAdd(value.trim());
          }}
          disabled={!value.trim()}
        >
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────────

export default function SnapshotPage() {
  return (
    <EmployeeRoute>
      <SnapshotContent />
    </EmployeeRoute>
  );
}
