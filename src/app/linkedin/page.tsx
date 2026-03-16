"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clipboard,
  Linkedin,
  RefreshCw,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface ExperienceBullets {
  role: string;
  bullets: string[];
}

interface LinkedInContent {
  headline: string;
  about_section: string;
  experience_bullets: ExperienceBullets[];
  featured_suggestions: string[];
  skill_recommendations: string[];
  open_to_work_guidance: string;
  recruiter_tips: string;
  is_marked_updated?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────

const CONTEXTUAL_MESSAGES = [
  { text: "Analyzing your career profile for LinkedIn...", delay: 0 },
  { text: "Crafting your headline and about section...", delay: 4000 },
  { text: "Generating experience bullets and recommendations...", delay: 8000 },
  { text: "Almost there...", delay: 15000 },
];

const LONG_WAIT_THRESHOLD = 30000;

// ─── Main Component ──────────────────────────────────────────────────

export default function LinkedInPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <LinkedInOptimizer />
      </DashboardLayout>
    </EmployeeRoute>
  );
}

function LinkedInOptimizer() {
  const router = useRouter();
  const [content, setContent] = useState<LinkedInContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markedUpdated, setMarkedUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMsg, setContextMsg] = useState(CONTEXTUAL_MESSAGES[0].text);
  const [longWait, setLongWait] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasFetched = useRef(false);

  // ─── Copy to clipboard ─────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  }, []);

  // ─── Fetch or generate ─────────────────────────────────────────────

  useEffect(() => {
    if (hasFetched.current && retryCount === 0) return;
    hasFetched.current = true;

    let msgTimers: ReturnType<typeof setTimeout>[] = [];

    async function init() {
      setLoading(true);
      setError(null);

      try {
        // Try fetching existing content
        const existingRes = await fetch("/api/v1/employee/linkedin");
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (existingData.data) {
            setContent(existingData.data);
            setMarkedUpdated(existingData.data.is_marked_updated ?? false);
            setLoading(false);
            return;
          }
        }

        // No existing content — generate
        setGenerating(true);
        msgTimers = CONTEXTUAL_MESSAGES.map(({ text, delay }) =>
          setTimeout(() => setContextMsg(text), delay)
        );
        msgTimers.push(
          setTimeout(() => setLongWait(true), LONG_WAIT_THRESHOLD)
        );

        const genRes = await fetch("/api/v1/employee/linkedin/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!genRes.ok) {
          const body = await genRes.json().catch(() => null);
          throw new Error(
            body?.error?.message ?? "Failed to generate LinkedIn content"
          );
        }

        const genData = await genRes.json();
        setContent(genData.data);
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
  }, [retryCount]);

  // ─── Regenerate ────────────────────────────────────────────────────

  const handleRegenerate = useCallback(async () => {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setContextMsg(CONTEXTUAL_MESSAGES[0].text);

    const msgTimers = CONTEXTUAL_MESSAGES.map(({ text, delay }) =>
      setTimeout(() => setContextMsg(text), delay)
    );

    try {
      const res = await fetch("/api/v1/employee/linkedin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Failed to regenerate LinkedIn content"
        );
      }

      const data = await res.json();
      setContent(data.data);
      setMarkedUpdated(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Regeneration failed"
      );
    } finally {
      setGenerating(false);
      msgTimers.forEach(clearTimeout);
    }
  }, [generating]);

  // ─── Mark profile updated ──────────────────────────────────────────

  const handleMarkUpdated = useCallback(async () => {
    if (marking || markedUpdated) return;

    setMarking(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/employee/linkedin/mark-updated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Failed to mark profile as updated"
        );
      }

      setMarkedUpdated(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark as updated"
      );
    } finally {
      setMarking(false);
    }
  }, [marking, markedUpdated]);

  // ─── Loading skeleton ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 animate-fade-in">
        <div className="mx-auto max-w-4xl space-y-6">
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
                    <div
                      className="h-full animate-pulse rounded-full bg-primary"
                      style={{ width: "60%" }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-shimmer rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────

  if (error && !content) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h2 className="text-lg font-semibold text-text-primary">
            Unable to load LinkedIn content
          </h2>
          <p className="text-sm text-text-secondary">{error}</p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                setRetryCount((c) => c + 1);
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

  // ─── Empty state ───────────────────────────────────────────────────

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Linkedin className="mx-auto h-12 w-12 text-muted" />
          <h2 className="text-lg font-semibold text-text-primary">
            No LinkedIn content yet
          </h2>
          <p className="text-sm text-text-secondary">
            Complete your role targeting to generate LinkedIn optimization
            content.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main content ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              LinkedIn Optimizer
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Copy each section to update your LinkedIn profile
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={generating}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Regenerating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </span>
            )}
          </Button>
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

        {/* Headline */}
        <CopyableSection
          title="Headline"
          description="Your LinkedIn headline (max 220 characters)"
          fieldId="headline"
          copiedField={copiedField}
          onCopy={() => copyToClipboard(content.headline, "headline")}
        >
          <p className="text-sm font-medium text-text-primary">
            {content.headline}
          </p>
        </CopyableSection>

        {/* About Section */}
        <CopyableSection
          title="About"
          description="Your LinkedIn About section (first person)"
          fieldId="about"
          copiedField={copiedField}
          onCopy={() => copyToClipboard(content.about_section, "about")}
        >
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
            {content.about_section}
          </p>
        </CopyableSection>

        {/* Experience Bullets */}
        {content.experience_bullets.map((exp, idx) => (
          <CopyableSection
            key={`exp-${idx}`}
            title={`Experience: ${exp.role}`}
            description="Updated bullet points for this role"
            fieldId={`exp-${idx}`}
            copiedField={copiedField}
            onCopy={() =>
              copyToClipboard(
                exp.bullets.map((b) => `• ${b}`).join("\n"),
                `exp-${idx}`
              )
            }
          >
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
          </CopyableSection>
        ))}

        {/* Featured Suggestions */}
        <CopyableSection
          title="Featured Section"
          description="What to pin in your Featured section"
          fieldId="featured"
          copiedField={copiedField}
          onCopy={() =>
            copyToClipboard(
              content.featured_suggestions.map((s) => `• ${s}`).join("\n"),
              "featured"
            )
          }
        >
          <ul className="space-y-1.5">
            {content.featured_suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="text-sm text-text-primary leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-text-secondary"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </CopyableSection>

        {/* Skill Recommendations */}
        <CopyableSection
          title="Skills to Add"
          description="LinkedIn skills to add or reorder (top 3 most relevant)"
          fieldId="skills"
          copiedField={copiedField}
          onCopy={() =>
            copyToClipboard(content.skill_recommendations.join(", "), "skills")
          }
        >
          <div className="flex flex-wrap gap-2">
            {content.skill_recommendations.map((skill, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                  i < 3
                    ? "bg-primary-light text-primary"
                    : "bg-background text-text-secondary border border-border"
                )}
              >
                {i < 3 && (
                  <span className="mr-1 text-[10px] font-semibold">
                    #{i + 1}
                  </span>
                )}
                {skill}
              </span>
            ))}
          </div>
        </CopyableSection>

        {/* Open to Work Guidance */}
        <CopyableSection
          title="Open to Work Settings"
          description="Whether and how to use LinkedIn's Open to Work feature"
          fieldId="otw"
          copiedField={copiedField}
          onCopy={() =>
            copyToClipboard(content.open_to_work_guidance, "otw")
          }
        >
          <p className="text-sm text-text-primary leading-relaxed">
            {content.open_to_work_guidance}
          </p>
        </CopyableSection>

        {/* Recruiter Tips */}
        <CopyableSection
          title="Recruiter Profile Tips"
          description="What recruiters search for in your target role"
          fieldId="recruiter"
          copiedField={copiedField}
          onCopy={() =>
            copyToClipboard(content.recruiter_tips, "recruiter")
          }
        >
          <p className="text-sm text-text-primary leading-relaxed">
            {content.recruiter_tips}
          </p>
        </CopyableSection>

        {/* Mark Profile Updated */}
        <div className="rounded-lg border border-border bg-surface p-6 text-center space-y-3">
          {markedUpdated ? (
            <>
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <p className="text-sm font-medium text-text-primary">
                LinkedIn profile marked as updated
              </p>
              <p className="text-xs text-text-secondary">
                Your readiness score has been updated on the dashboard.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                After updating your LinkedIn profile with the content above,
                click the button below to track your progress.
              </p>
              <Button onClick={handleMarkUpdated} disabled={marking}>
                {marking ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Marking...
                  </span>
                ) : (
                  "Mark Profile Updated"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Copyable Section ──────────────────────────────────

function CopyableSection({
  title,
  description,
  fieldId,
  copiedField,
  onCopy,
  children,
}: {
  title: string;
  description: string;
  fieldId: string;
  copiedField: string | null;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  const isCopied = copiedField === fieldId;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-2 transition-default">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-default",
            isCopied
              ? "bg-success/10 text-success"
              : "bg-background text-text-secondary hover:text-primary hover:bg-primary/5 border border-border"
          )}
        >
          {isCopied ? (
            <>
              <Check className="h-3 w-3" />
              Copied!
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}
