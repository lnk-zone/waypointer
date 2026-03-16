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

// ─── Component ────────────────────────────────────────────────────────

function OutreachContent() {
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
            // Default to primary path
            const primary = selected.find(
              (p: RolePath) => p.is_primary
            );
            if (primary) setRolePathId(primary.id);
          }
        }
      } catch {
        // Non-critical
      }
    }
    fetchPaths();
  }, []);

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
                    <span className="text-text-secondary/60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={companyContext}
                    onChange={(e) => {
                      setCompanyContext(e.target.value);
                      setResult(null);
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
                    <span className="text-text-secondary/60">(optional)</span>
                  </label>
                  <textarea
                    value={personalContext}
                    onChange={(e) => {
                      setPersonalContext(e.target.value);
                      setResult(null);
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
                    Personalizing for {RECIPIENT_OPTIONS.find((o) => o.value === recipient)?.label ?? "your recipient"}
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
