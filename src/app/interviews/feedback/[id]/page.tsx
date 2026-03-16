"use client";

/**
 * Interview Feedback Report — Screen 13
 *
 * Post-session analysis and coaching. Shows the ANALYZE_INTERVIEW output
 * with overall scores, per-question breakdowns, strongest stories,
 * weak answers with suggested rewrites, and next practice recommendations.
 *
 * CTAs: "Practice again", "Add to weekly plan", "Review transcript"
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  MessageCircle,
  RefreshCcw,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface AnswerAnalysis {
  question: string;
  answer_summary: string;
  quality: "strong" | "adequate" | "weak";
  feedback: string;
}

interface WeakAnswer {
  question: string;
  issue: string;
  suggested_approach: string;
}

interface SessionFeedback {
  overall_score: number;
  overall_summary: string;
  clarity_score: number;
  clarity_notes: string;
  specificity_score: number;
  specificity_notes: string;
  confidence_score: number;
  confidence_notes: string;
  filler_word_count: number;
  filler_words_noted: string[];
  answer_analyses: AnswerAnalysis[];
  strongest_stories: string[];
  weak_answers: WeakAnswer[];
  next_recommendation: string;
}

interface SessionData {
  session_id: string;
  role_path: { id: string; title: string } | null;
  format: string;
  difficulty: string;
  duration_minutes: number;
  transcript: string | null;
  feedback_generated: boolean;
  started_at: string | null;
  completed_at: string | null;
  feedback: SessionFeedback | null;
}

// ─── Score Color Helper ──────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "text-[#059669]";
  if (score >= 60) return "text-[#D97706]";
  // Neutral gray for low scores — coaching tone, not grading (MP §11)
  return "text-text-secondary";
}

function scoreBgColor(score: number): string {
  if (score >= 75) return "bg-[#059669]";
  if (score >= 60) return "bg-[#D97706]";
  // Neutral for low scores — no red per MP §11 emotional design guidance
  return "bg-gray-400";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Solid";
  if (score >= 40) return "Developing";
  return "Early stage";
}

function qualityBadgeClasses(quality: string): string {
  switch (quality) {
    case "strong":
      return "bg-[#059669]/10 text-[#059669] border-[#059669]/20";
    case "adequate":
      return "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20";
    case "weak":
      // Neutral tone for improvement areas — coaching, not grading (MP §11)
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

// ─── Skeleton Blocks ─────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

function FeedbackSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="text-center">
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto mb-4" />
        <Skeleton className="h-20 w-20 mx-auto rounded-full mb-2" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>

      {/* Score cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Feedback Content ─────────────────────────────────────────────────

function FeedbackContent() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [expandedAnswer, setExpandedAnswer] = useState<number | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/employee/interviews/session/${sessionId}`
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to load interview feedback"
        );
      }

      const json = await res.json();
      setData(json.data as SessionData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load feedback"
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, fetchSession]);

  // Loading state
  if (loading) {
    return <FeedbackSkeleton />;
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#DC2626]/10">
            <AlertCircle className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Unable to load feedback
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {error ?? "An unexpected error occurred."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push("/interviews")}
              variant="outline"
            >
              Back to Interviews
            </Button>
            <Button onClick={fetchSession}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // Feedback not yet generated
  if (!data.feedback_generated || !data.feedback) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D97706]/10">
            <RefreshCcw className="h-8 w-8 text-[#D97706]" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Feedback is still processing
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Your interview analysis is being generated. This usually takes a
            moment.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push("/interviews")}
              variant="outline"
            >
              Back to Interviews
            </Button>
            <Button onClick={fetchSession} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Check Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const feedback = data.feedback;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push("/interviews")}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-default"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Interview Prep
      </button>

      {/* Header with overall score */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Interview Feedback Report
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          {data.role_path?.title ?? "General interview"} ·{" "}
          <span className="capitalize">{data.format}</span> ·{" "}
          <span className="capitalize">{data.difficulty}</span> ·{" "}
          {data.duration_minutes} min
        </p>

        {/* Overall score circle */}
        <div className="inline-flex flex-col items-center">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full border-4",
              feedback.overall_score >= 75
                ? "border-[#059669]/30 bg-[#059669]/5"
                : feedback.overall_score >= 60
                  ? "border-[#D97706]/30 bg-[#D97706]/5"
                  : "border-gray-300 bg-gray-50"
            )}
          >
            <span
              className={cn(
                "text-3xl font-bold",
                scoreColor(feedback.overall_score)
              )}
            >
              {feedback.overall_score}
            </span>
          </div>
          <p
            className={cn(
              "text-sm font-medium mt-2",
              scoreColor(feedback.overall_score)
            )}
          >
            {scoreLabel(feedback.overall_score)}
          </p>
        </div>

        {/* Overall summary */}
        <p className="text-sm text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
          {feedback.overall_summary}
        </p>
      </div>

      {/* Score cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Clarity */}
        <ScoreCard
          label="Clarity"
          score={feedback.clarity_score}
          icon={<MessageCircle className="h-4 w-4" />}
          detail={`${feedback.filler_word_count} filler words`}
        />

        {/* Specificity */}
        <ScoreCard
          label="Specificity"
          score={feedback.specificity_score}
          icon={<Target className="h-4 w-4" />}
        />

        {/* Confidence */}
        <ScoreCard
          label="Confidence"
          score={feedback.confidence_score}
          icon={<Shield className="h-4 w-4" />}
        />

        {/* Filler Words */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen className="h-4 w-4 text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary">
              Filler Words
            </span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {feedback.filler_word_count}
          </p>
          {feedback.filler_words_noted.length > 0 && (
            <p className="text-[10px] text-text-secondary mt-0.5 truncate">
              {feedback.filler_words_noted.slice(0, 4).join(", ")}
              {feedback.filler_words_noted.length > 4 ? "…" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Score detail notes */}
      <div className="grid md:grid-cols-3 gap-3">
        <NoteCard
          title="Clarity"
          note={feedback.clarity_notes}
          icon={<MessageCircle className="h-4 w-4 text-text-secondary" />}
        />
        <NoteCard
          title="Specificity"
          note={feedback.specificity_notes}
          icon={<Target className="h-4 w-4 text-text-secondary" />}
        />
        <NoteCard
          title="Confidence"
          note={feedback.confidence_notes}
          icon={<Shield className="h-4 w-4 text-text-secondary" />}
        />
      </div>

      {/* Strongest stories */}
      {feedback.strongest_stories.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-[#D97706]" />
            <h2 className="text-base font-semibold text-text-primary">
              Your Strongest Stories
            </h2>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            These were your best moments — highlight them in real interviews.
          </p>
          <div className="space-y-2">
            {feedback.strongest_stories.map((story, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-[#D97706]/5 border border-[#D97706]/10 px-3 py-2"
              >
                <Sparkles className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                <p className="text-sm text-text-primary">{story}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer-by-answer breakdown */}
      {feedback.answer_analyses.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">
              Answer Breakdown
            </h2>
          </div>
          <div className="space-y-2">
            {feedback.answer_analyses.map((analysis, i) => (
              <div
                key={i}
                className="rounded-md border border-border overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedAnswer(expandedAnswer === i ? null : i)
                  }
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        qualityBadgeClasses(analysis.quality)
                      )}
                    >
                      {analysis.quality}
                    </span>
                    <span className="text-sm text-text-primary truncate">
                      {analysis.question}
                    </span>
                  </div>
                  {expandedAnswer === i ? (
                    <ChevronUp className="h-4 w-4 text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-secondary shrink-0" />
                  )}
                </button>

                {expandedAnswer === i && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">
                        Your answer
                      </p>
                      <p className="text-sm text-text-primary leading-relaxed">
                        {analysis.answer_summary}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">
                        Feedback
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {analysis.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak answers with coaching */}
      {feedback.weak_answers.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">
              Areas to Strengthen
            </h2>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            These answers have room to grow — here are coaching notes for each.
          </p>
          <div className="space-y-3">
            {feedback.weak_answers.map((wa, i) => (
              <div
                key={i}
                className="rounded-md border border-primary/10 bg-primary/[0.02] p-4 space-y-2"
              >
                <p className="text-sm font-medium text-text-primary">
                  &ldquo;{wa.question}&rdquo;
                </p>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-[#D97706] mt-0.5 shrink-0" />
                  <p className="text-xs text-text-secondary">{wa.issue}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-text-primary leading-relaxed">
                    {wa.suggested_approach}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next practice recommendation */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary">
            Next Practice Focus
          </h2>
        </div>
        <p className="text-sm text-text-primary leading-relaxed">
          {feedback.next_recommendation}
        </p>
      </div>

      {/* Transcript expand */}
      {data.transcript && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-default"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">
                Review Transcript
              </span>
            </div>
            {showTranscript ? (
              <ChevronUp className="h-4 w-4 text-text-secondary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            )}
          </button>

          {showTranscript && (
            <div className="px-5 pb-5 border-t border-border pt-4">
              <p className="text-xs text-text-secondary mb-3">
                Questions are annotated with answer quality from the feedback analysis.
              </p>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {data.transcript.split("\n").map((line, i) => {
                  const isInterviewer = line.startsWith("Interviewer:");
                  const isUser = line.startsWith("You:");
                  const content = line
                    .replace(/^Interviewer:\s*/, "")
                    .replace(/^You:\s*/, "");
                  if (!content.trim()) return null;

                  // Annotate interviewer questions with matching answer quality
                  const matchingAnalysis = isInterviewer
                    ? feedback.answer_analyses.find((a) =>
                        content
                          .toLowerCase()
                          .includes(a.question.toLowerCase().slice(0, 30))
                      )
                    : null;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        isUser ? "flex-row-reverse" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                          isInterviewer
                            ? "bg-primary/10 text-primary"
                            : isUser
                              ? "bg-[#059669]/10 text-[#059669]"
                              : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {isInterviewer ? "AI" : isUser ? "You" : "?"}
                      </div>
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 max-w-[80%]",
                          isInterviewer
                            ? "bg-gray-100 text-text-primary"
                            : isUser
                              ? "bg-primary/5 text-text-primary"
                              : "bg-gray-50 text-text-secondary"
                        )}
                      >
                        <p className="text-sm leading-relaxed">{content}</p>
                        {matchingAnalysis && (
                          <span
                            className={cn(
                              "inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
                              qualityBadgeClasses(matchingAnalysis.quality)
                            )}
                          >
                            {matchingAnalysis.quality === "strong"
                              ? "✓ Strong answer"
                              : matchingAnalysis.quality === "adequate"
                                ? "○ Adequate"
                                : "↑ Room to grow"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 justify-center pt-2 pb-8">
        <Button
          onClick={() =>
            router.push(
              `/interviews?start_mock=true${data.role_path ? `&path_id=${data.role_path.id}` : ""}`
            )
          }
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Practice Again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/progress")}
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          Add to Weekly Plan
        </Button>
      </div>
    </div>
  );
}

// ─── Score Card Component ────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  icon,
  detail,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-text-secondary">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className={cn("text-2xl font-bold", scoreColor(score))}>
          {score}
        </span>
        <span className="text-xs text-text-secondary mb-0.5">/100</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", scoreBgColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {detail && (
        <p className="text-[10px] text-text-secondary mt-1">{detail}</p>
      )}
    </div>
  );
}

// ─── Note Card Component ─────────────────────────────────────────────

function NoteCard({
  title,
  note,
  icon,
}: {
  title: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-medium text-text-secondary">
          {title}
        </span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed">{note}</p>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function InterviewFeedbackPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <FeedbackContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
