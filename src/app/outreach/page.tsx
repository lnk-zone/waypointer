"use client";

import { useCallback, useEffect, useState } from "react";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Clock,
  History,
  Info,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface RolePath {
  id: string;
  title: string;
  is_primary: boolean;
}

interface OutreachGuidance {
  when_to_use: string;
  follow_up_timing: string;
  what_not_to_say: string;
}

interface OutreachResult {
  outreach_id: string;
  linkedin_message: string;
  email_message: string;
  followup_message: string;
  guidance: OutreachGuidance;
  created_at: string;
}

interface OutreachHistoryItem {
  id: string;
  recipient: string;
  role_path_title: string | null;
  relationship: string;
  tone: string;
  linkedin_message: string;
  email_message: string;
  followup_message: string;
  guidance: OutreachGuidance | null;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const RECIPIENT_OPTIONS = [
  { value: "recruiter", label: "Recruiter" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "former_colleague", label: "Former Colleague" },
  { value: "alumni", label: "Alumni Network Contact" },
  { value: "referral_request", label: "Referral Request" },
  { value: "follow_up", label: "Follow-up After Application" },
] as const;

const RELATIONSHIP_OPTIONS = [
  { value: "cold", label: "Cold", description: "No prior connection" },
  { value: "warm", label: "Warm", description: "Some prior interaction" },
  { value: "close", label: "Close", description: "Strong relationship" },
] as const;

const TONE_OPTIONS = [
  { value: "warm", label: "Warmer" },
  { value: "formal", label: "More Formal" },
] as const;

const RECIPIENT_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  former_colleague: "Former Colleague",
  alumni: "Alumni Network Contact",
  referral_request: "Referral Request",
  follow_up: "Follow-up After Application",
};

// ─── Component ────────────────────────────────────────────────────────

type Tab = "generate" | "history";

function OutreachContent() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");

  // Role paths for dropdown
  const [paths, setPaths] = useState<RolePath[]>([]);

  // Form state
  const [recipient, setRecipient] = useState<string>("");
  const [rolePathId, setRolePathId] = useState<string>("");
  const [companyContext, setCompanyContext] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("cold");
  const [personalContext, setPersonalContext] = useState<string>("");
  const [tone, setTone] = useState<string>("warm");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mark as sent state
  const [markingSent, setMarkingSent] = useState(false);
  const [sentConfirmed, setSentConfirmed] = useState(false);

  // History state
  const [history, setHistory] = useState<OutreachHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null
  );
  const [markSentErrorId, setMarkSentErrorId] = useState<string | null>(null);

  // Fetch role paths
  useEffect(() => {
    async function fetchPaths() {
      try {
        const res = await fetch("/api/v1/employee/paths");
        if (res.ok) {
          const json = await res.json();
          const pathList = json.data ?? json;
          if (Array.isArray(pathList)) {
            const selected = pathList.filter(
              (p: RolePath & { is_selected?: boolean }) =>
                p.is_selected !== false
            );
            setPaths(
              selected.map((p: RolePath) => ({
                id: p.id,
                title: p.title,
                is_primary: p.is_primary,
              }))
            );
            const primary = selected.find((p: RolePath) => p.is_primary);
            if (primary) setRolePathId(primary.id);
          }
        }
      } catch {
        // Non-critical
      }
    }
    fetchPaths();
  }, []);

  // Fetch history when tab switches to history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/v1/employee/outreach");
      if (!res.ok) {
        throw new Error("Failed to load outreach history");
      }
      const json = await res.json();
      setHistory((json.data as OutreachHistoryItem[]) ?? []);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Failed to load outreach history"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Generate outreach messages (accepts optional tone override to avoid stale closure)
  const handleGenerate = useCallback(
    async (toneOverride?: string) => {
      if (!recipient) {
        setError("Select a recipient type to continue.");
        return;
      }
      if (!rolePathId) {
        setError(
          "Select a role you're pursuing so we can personalize the message."
        );
        return;
      }

      setGenerating(true);
      setError(null);
      setSentConfirmed(false);

      try {
        const res = await fetch("/api/v1/employee/outreach/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient,
            role_path_id: rolePathId,
            company_or_job_context: companyContext,
            relationship,
            personal_context: personalContext,
            tone: toneOverride ?? tone,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ?? "Failed to generate outreach messages"
          );
        }

        const json = await res.json();
        setResult(json.data as OutreachResult);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate outreach messages"
        );
      } finally {
        setGenerating(false);
      }
    },
    [recipient, rolePathId, companyContext, relationship, personalContext, tone]
  );

  // Regenerate with new tone (auto-regenerate if a result already exists)
  const handleToneToggle = (newTone: string) => {
    setTone(newTone);
    if (result) {
      handleGenerate(newTone);
    }
  };

  // Mark current generated message as sent
  const handleMarkSent = async () => {
    if (!result) return;
    setMarkingSent(true);
    try {
      const res = await fetch(
        `/api/v1/employee/outreach/${result.outreach_id}/mark-sent`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to mark as sent"
        );
      }
      setSentConfirmed(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark as sent"
      );
    } finally {
      setMarkingSent(false);
    }
  };

  // Mark a history item as sent
  const handleMarkHistorySent = async (outreachId: string) => {
    setMarkingSentId(outreachId);
    setMarkSentErrorId(null);
    try {
      const res = await fetch(
        `/api/v1/employee/outreach/${outreachId}/mark-sent`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error("Failed to mark as sent");
      }
      // Update local history state
      setHistory((prev) =>
        prev.map((item) =>
          item.id === outreachId
            ? { ...item, is_sent: true, sent_at: new Date().toISOString() }
            : item
        )
      );
    } catch {
      setMarkSentErrorId(outreachId);
    } finally {
      setMarkingSentId(null);
    }
  };

  // Copy to clipboard
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const showStep2 = !!recipient;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Outreach Builder
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Generate personalized outreach messages for your job search
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => {
            setActiveTab("generate");
            setCopiedField(null);
          }}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-default border-b-2 -mb-px",
            activeTab === "generate"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            setCopiedField(null);
          }}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-default border-b-2 -mb-px",
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </div>
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left pane — Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: Recipient type */}
            <div className="rounded-md border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-3">
                Step 1: Who are you reaching out to?
              </h2>
              <div className="space-y-2">
                {RECIPIENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-3 rounded-sm border p-3 cursor-pointer transition-default",
                      recipient === opt.value
                        ? "border-primary bg-primary-light"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="recipient"
                      value={opt.value}
                      checked={recipient === opt.value}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setResult(null);
                        setSentConfirmed(false);
                      }}
                      className="accent-primary"
                    />
                    <span className="text-sm text-text-primary">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Context (conditional) */}
            {showStep2 && (
              <div className="rounded-md border border-border bg-surface p-5 transition-default">
                <h2 className="text-sm font-semibold text-text-primary mb-3">
                  Step 2: Context
                </h2>
                <div className="space-y-3">
                  {/* Role path */}
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">
                      Role Pursuing
                    </label>
                    <div className="relative">
                      <select
                        value={rolePathId}
                        onChange={(e) => {
                          setRolePathId(e.target.value);
                          setResult(null);
                          setSentConfirmed(false);
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

                  {/* Company / job context */}
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">
                      Company or Job{" "}
                      <span className="text-text-secondary/60">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={companyContext}
                      onChange={(e) => {
                        setCompanyContext(e.target.value);
                        setResult(null);
                        setSentConfirmed(false);
                      }}
                      placeholder="e.g., Product Manager at Stripe"
                      className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Relationship strength */}
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">
                      Relationship Strength
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setRelationship(opt.value);
                            setResult(null);
                            setSentConfirmed(false);
                          }}
                          className={cn(
                            "rounded-sm border p-2 text-center transition-default",
                            relationship === opt.value
                              ? "border-primary bg-primary-light"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <span className="block text-xs font-medium text-text-primary">
                            {opt.label}
                          </span>
                          <span className="block text-[10px] text-text-secondary mt-0.5">
                            {opt.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Personal context */}
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">
                      Personal Context{" "}
                      <span className="text-text-secondary/60">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={personalContext}
                      onChange={(e) => {
                        setPersonalContext(e.target.value);
                        setResult(null);
                        setSentConfirmed(false);
                      }}
                      placeholder='e.g., "We met at SaaStr 2024"'
                      rows={2}
                      className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none resize-none"
                    />
                  </div>

                  {/* Tone selector */}
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">
                      Tone
                    </label>
                    <div className="flex gap-2">
                      {TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleToneToggle(opt.value)}
                          className={cn(
                            "flex-1 rounded-sm border py-2 text-xs font-medium transition-default",
                            tone === opt.value
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

                {/* Generate button */}
                <Button
                  onClick={() => handleGenerate()}
                  disabled={generating || !recipient || !rolePathId}
                  className="w-full mt-4 gap-2"
                >
                  {generating ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Generate Messages
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Right pane — Generated messages */}
          <div className="lg:col-span-3 space-y-4">
            {/* Generation loading skeleton */}
            {generating && (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-surface p-5">
                  <div className="rounded-sm bg-primary-light p-4 text-center">
                    <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-primary">
                      Crafting your outreach messages...
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Personalizing for{" "}
                      {RECIPIENT_OPTIONS.find((o) => o.value === recipient)
                        ?.label ?? "your recipient"}
                    </p>
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-surface p-5 space-y-2"
                  >
                    <div className="h-4 w-32 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                    <div className="h-20 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && !generating && (
              <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 p-5">
                <p className="text-sm text-[#DC2626] font-medium mb-1">
                  {error}
                </p>
                {result === null && (
                  <p className="text-xs text-text-secondary">
                    Check your selections and try again.
                  </p>
                )}
              </div>
            )}

            {/* Empty state — no messages yet */}
            {!generating && !result && !error && (
              <div className="rounded-md border border-border bg-surface p-8 text-center">
                <MessageSquare className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  No messages generated yet
                </h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Select a recipient type and fill in the context to generate
                  personalized outreach messages.
                </p>
              </div>
            )}

            {/* Generated messages */}
            {result && !generating && (
              <div className="space-y-4">
                {/* LinkedIn message */}
                <MessageCard
                  label="LinkedIn Message"
                  hint={`${result.linkedin_message.length} / 300 characters`}
                  text={result.linkedin_message}
                  fieldName="linkedin"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  charWarning={result.linkedin_message.length > 300}
                />

                {/* Email message */}
                <MessageCard
                  label="Email Version"
                  text={result.email_message}
                  fieldName="email"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                />

                {/* Follow-up message */}
                <MessageCard
                  label="Follow-up Message"
                  hint="Send 5-7 days later if no response"
                  text={result.followup_message}
                  fieldName="followup"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                />

                {/* Mark as sent */}
                <div className="rounded-md border border-border bg-surface p-4">
                  {sentConfirmed ? (
                    <div className="flex items-center gap-2 text-[#059669]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Marked as sent — tracked in your progress
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={handleMarkSent}
                      disabled={markingSent}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {markingSent ? (
                        <>
                          <Clock className="h-4 w-4 animate-pulse" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Sent
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Tone toggle for regeneration */}
                <div className="rounded-md border border-border bg-surface p-4">
                  <p className="text-xs text-text-secondary mb-2">
                    Want a different tone?
                  </p>
                  <div className="flex gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={tone === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setTone(opt.value);
                          handleGenerate(opt.value);
                        }}
                        disabled={generating}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Guidance box */}
                {result.guidance && (
                  <div className="rounded-md border border-primary/20 bg-primary-light p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Outreach Guidance
                    </h3>
                    <div className="space-y-3">
                      <GuidanceItem
                        label="When to use"
                        text={result.guidance.when_to_use}
                      />
                      <GuidanceItem
                        label="Follow-up timing"
                        text={result.guidance.follow_up_timing}
                      />
                      <GuidanceItem
                        label="What not to say"
                        text={result.guidance.what_not_to_say}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Loading skeleton */}
          {historyLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-surface p-5 space-y-2"
                >
                  <div className="flex justify-between">
                    <div className="h-4 w-40 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                    <div className="h-4 w-16 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  </div>
                  <div className="h-3 w-24 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {historyError && !historyLoading && (
            <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 p-5">
              <p className="text-sm text-[#DC2626] font-medium">
                {historyError}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!historyLoading && !historyError && history.length === 0 && (
            <div className="rounded-md border border-border bg-surface p-8 text-center">
              <History className="h-10 w-10 text-primary/30 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-text-primary mb-1">
                No outreach messages yet
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto mb-4">
                Generate your first outreach message to start tracking your
                networking activity.
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab("generate")}
                className="gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Messages
              </Button>
            </div>
          )}

          {/* History list */}
          {!historyLoading &&
            history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                isExpanded={expandedHistoryId === item.id}
                onToggleExpand={() =>
                  setExpandedHistoryId(
                    expandedHistoryId === item.id ? null : item.id
                  )
                }
                onMarkSent={() => handleMarkHistorySent(item.id)}
                isMarkingSent={markingSentId === item.id}
                markSentFailed={markSentErrorId === item.id}
                copiedField={copiedField}
                onCopy={handleCopy}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function MessageCard({
  label,
  hint,
  text,
  fieldName,
  copiedField,
  onCopy,
  charWarning,
}: {
  label: string;
  hint?: string;
  text: string;
  fieldName: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
  charWarning?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-text-primary">{label}</h3>
          {hint && (
            <p
              className={cn(
                "text-[10px] mt-0.5",
                charWarning ? "text-[#DC2626]" : "text-text-secondary"
              )}
            >
              {hint}
            </p>
          )}
        </div>
        <button
          onClick={() => onCopy(text, fieldName)}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-default"
        >
          {copiedField === fieldName ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="rounded-sm bg-background p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

function GuidanceItem({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-primary mb-0.5">{label}</p>
      <p className="text-sm text-text-primary">{text}</p>
    </div>
  );
}

function HistoryCard({
  item,
  isExpanded,
  onToggleExpand,
  onMarkSent,
  isMarkingSent,
  markSentFailed,
  copiedField,
  onCopy,
}: {
  item: OutreachHistoryItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMarkSent: () => void;
  isMarkingSent: boolean;
  markSentFailed: boolean;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
}) {
  const createdDate = new Date(item.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const sentDate = item.sent_at
    ? new Date(item.sent_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden transition-default">
      {/* Summary row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-background/50 transition-default"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex-shrink-0 h-2 w-2 rounded-full",
              item.is_sent ? "bg-[#059669]" : "bg-[#D97706]"
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {RECIPIENT_LABELS[item.recipient] ?? item.recipient}
              {item.role_path_title && (
                <span className="text-text-secondary font-normal">
                  {" "}
                  · {item.role_path_title}
                </span>
              )}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {createdDate}
              {item.is_sent && sentDate && (
                <span className="text-[#059669]"> · Sent {sentDate}</span>
              )}
              {!item.is_sent && (
                <span className="text-[#D97706]"> · Not sent</span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-secondary transition-default flex-shrink-0",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-background text-xs text-text-secondary">
              {item.relationship} outreach
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-background text-xs text-text-secondary">
              {item.tone} tone
            </span>
          </div>

          {/* Messages */}
          {item.linkedin_message && (
            <MessageCard
              label="LinkedIn Message"
              hint={`${item.linkedin_message.length} / 300 characters`}
              text={item.linkedin_message}
              fieldName={`history-linkedin-${item.id}`}
              copiedField={copiedField}
              onCopy={onCopy}
              charWarning={item.linkedin_message.length > 300}
            />
          )}
          {item.email_message && (
            <MessageCard
              label="Email Version"
              text={item.email_message}
              fieldName={`history-email-${item.id}`}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          )}
          {item.followup_message && (
            <MessageCard
              label="Follow-up Message"
              hint="Send 5-7 days later if no response"
              text={item.followup_message}
              fieldName={`history-followup-${item.id}`}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          )}

          {/* Guidance */}
          {item.guidance && (
            <div className="rounded-md border border-primary/20 bg-primary-light p-4">
              <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                Guidance
              </h4>
              <div className="space-y-2">
                <GuidanceItem
                  label="When to use"
                  text={item.guidance.when_to_use}
                />
                <GuidanceItem
                  label="Follow-up timing"
                  text={item.guidance.follow_up_timing}
                />
                <GuidanceItem
                  label="What not to say"
                  text={item.guidance.what_not_to_say}
                />
              </div>
            </div>
          )}

          {/* Mark as sent (if not already) */}
          {!item.is_sent && (
            <div className="space-y-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkSent();
                }}
                disabled={isMarkingSent}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isMarkingSent ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark as Sent
                  </>
                )}
              </Button>
              {markSentFailed && (
                <p className="text-xs text-[#DC2626]">
                  Failed to mark as sent. Please try again.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function OutreachPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <OutreachContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
