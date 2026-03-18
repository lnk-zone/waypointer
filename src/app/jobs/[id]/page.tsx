"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Lightbulb,
  MapPin,
  MessageSquare,
  Mic,
  Package,
  Pencil,
  RefreshCw,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface JobListing {
  id: string;
  external_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  location: string | null;
  is_remote: boolean;
  is_hybrid: boolean;
  description_summary: string | null;
  description_full: string | null;
  salary_min: number | null;
  salary_max: number | null;
  requirements: string[] | null;
  posted_at: string | null;
  source_url: string | null;
  is_active: boolean;
}

interface JobMatchDetail {
  id: string;
  fit: "high_fit" | "stretch" | "low_fit";
  match_explanation: string;
  competition_level: "low" | "medium" | "high";
  recommended_action: string;
  role_path_id: string | null;
  created_at: string;
  job_listings: JobListing;
}

interface ResumeEdit {
  section: string;
  current_text: string;
  suggested_edit: string;
  reason: string;
}

interface ApplicationKit {
  id: string;
  job_match_id: string;
  intro_paragraph: string;
  recruiter_message: string;
  hiring_manager_message: string;
  referral_request: string;
  resume_edits: ResumeEdit[];
  interview_themes: string[];
  resume_match_score: number | null;
  resume_match_projected: number | null;
  resume_match_date: string | null;
  resume_recommendation?: string;
  created_at: string;
  updated_at: string;
}

interface ApplicationStatus {
  id: string;
  status: string;
  applied_at: string | null;
}

interface InterviewSession {
  id: string;
  overall_score: number | null;
  completed_at: string | null;
  format: string | null;
  feedback_generated: boolean;
}

interface JobDetailResponse {
  data: {
    match: JobMatchDetail;
    kit: ApplicationKit | null;
    application: ApplicationStatus | null;
    interviews: InterviewSession[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────

const FIT_CONFIG = {
  high_fit: { label: "High Fit", bg: "bg-[#059669]", text: "text-white" },
  stretch: { label: "Stretch", bg: "bg-[#D97706]", text: "text-white" },
  low_fit: { label: "Low Fit", bg: "bg-[#DC2626]", text: "text-white" },
} as const;

const COMPETITION_CONFIG = {
  low: { label: "Low Competition", className: "text-[#059669]" },
  medium: { label: "Medium Competition", className: "text-[#D97706]" },
  high: { label: "High Competition", className: "text-[#DC2626]" },
} as const;

const ACTION_LABELS: Record<string, string> = {
  apply_now: "Apply Now",
  reach_out_first: "Reach Out First",
  seek_referral: "Seek Referral",
  save_for_later: "Save for Later",
  skip: "Skip",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────

function JobDetailContent() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<JobMatchDetail | null>(null);
  const [kit, setKit] = useState<ApplicationKit | null>(null);
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track as applied state
  const [trackSaving, setTrackSaving] = useState(false);

  // Kit generation state
  const [kitLoading, setKitLoading] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Resume match refresh state
  const [refreshingScore, setRefreshingScore] = useState(false);

  // Fetch all detail data from the new consolidated endpoint
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/employee/jobs/${matchId}/detail`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job match not found");
          return;
        }
        throw new Error("Failed to fetch job details");
      }

      const json: JobDetailResponse = await res.json();
      setMatch(json.data.match);
      setKit(json.data.kit);
      setApplication(json.data.application);
      setInterviews(json.data.interviews);
    } catch {
      setError("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Track as applied
  const handleTrackApplied = async () => {
    if (!match) return;
    setTrackSaving(true);

    try {
      const res = await fetch(`/api/v1/employee/jobs/${match.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "applied" }),
      });

      if (res.ok) {
        const json = await res.json();
        setApplication(json.data as ApplicationStatus);
      }
    } catch {
      // Silent failure — toast would be ideal here
    } finally {
      setTrackSaving(false);
    }
  };

  // Save for later
  const handleSave = async () => {
    if (!match) return;
    setTrackSaving(true);

    try {
      const res = await fetch(`/api/v1/employee/jobs/${match.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "saved" }),
      });

      if (res.ok) {
        const json = await res.json();
        setApplication(json.data as ApplicationStatus);
      }
    } catch {
      // Silent failure
    } finally {
      setTrackSaving(false);
    }
  };

  // Generate application kit
  const handleGenerateKit = async () => {
    if (!match) return;
    setKitLoading(true);
    setKitError(null);

    try {
      const res = await fetch(`/api/v1/employee/jobs/${match.id}/kit`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(
          errorJson?.error?.message ?? "Failed to generate application kit"
        );
      }

      const json = await res.json();
      setKit(json.data as ApplicationKit);
    } catch (err) {
      setKitError(
        err instanceof Error ? err.message : "Failed to generate application kit"
      );
    } finally {
      setKitLoading(false);
    }
  };

  // Refresh resume match score (re-generate kit to get updated score)
  const handleRefreshScore = async () => {
    if (!match) return;
    setRefreshingScore(true);
    try {
      // Re-fetch detail to get latest kit data
      const res = await fetch(`/api/v1/employee/jobs/${matchId}/detail`);
      if (res.ok) {
        const json: JobDetailResponse = await res.json();
        setKit(json.data.kit);
      }
    } catch {
      // Silent failure
    } finally {
      setRefreshingScore(false);
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

  // Derived state
  const isApplied =
    application?.status === "applied" || application?.status === "interviewing";
  const isSaved = application?.status === "saved";

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="h-5 w-24 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-md border border-border bg-surface p-6 space-y-3">
              <div className="h-6 w-80 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              <div className="h-4 w-48 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              <div className="h-32 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-md border border-border bg-surface p-6 space-y-3">
              <div className="h-5 w-40 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              <div className="h-24 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !match) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <button
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-default"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="h-12 w-12 text-[#DC2626] mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {error ?? "Job not found"}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            This listing may no longer be active. Check directly on the company site.
          </p>
          <Button variant="outline" onClick={() => router.push("/jobs")}>
            Return to Jobs Feed
          </Button>
        </div>
      </div>
    );
  }

  const listing = match.job_listings;
  const fitConfig = FIT_CONFIG[match.fit];
  const compConfig = COMPETITION_CONFIG[match.competition_level];
  const actionLabel =
    ACTION_LABELS[match.recommended_action] ?? match.recommended_action;

  let locationTag = "On-site";
  if (listing.is_remote) locationTag = "Remote";
  else if (listing.is_hybrid) locationTag = "Hybrid";

  const isInactive = !listing.is_active;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      {/* Back link */}
      <button
        onClick={() => router.push("/jobs")}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-default"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </button>

      {/* Applied banner */}
      {isApplied && application?.applied_at && (
        <div className="mb-4 rounded-md border border-[#059669]/20 bg-[#059669]/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#059669]">
              Applied on {formatDate(application.applied_at)}
            </p>
            {application.status === "interviewing" && (
              <p className="text-xs text-text-secondary mt-0.5">
                Status: Interviewing
              </p>
            )}
          </div>
        </div>
      )}

      {/* Inactive warning */}
      {isInactive && (
        <div className="mb-4 rounded-md border border-[#D97706]/20 bg-[#D97706]/5 p-4">
          <p className="text-sm text-[#D97706] font-medium">
            This listing may no longer be active.
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Check directly on the company&apos;s careers page to confirm availability.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left pane -- Job details + Match analysis */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header card */}
          <div className="rounded-md border border-border bg-surface p-6">
            <div className="flex items-start gap-4">
              {/* Company logo */}
              <div className="hidden md:flex h-12 w-12 shrink-0 rounded-md border border-border bg-background items-center justify-center overflow-hidden">
                {listing.company_logo_url ? (
                  <Image
                    src={listing.company_logo_url}
                    alt={listing.company_name}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-text-secondary" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-semibold text-text-primary">
                      {listing.title}
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                      {listing.company_name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                      fitConfig.bg,
                      fitConfig.text
                    )}
                  >
                    {fitConfig.label}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {listing.location ?? "Location not specified"}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        listing.is_remote
                          ? "bg-[#059669]/10 text-[#059669]"
                          : listing.is_hybrid
                            ? "bg-[#D97706]/10 text-[#D97706]"
                            : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {locationTag}
                    </span>
                  </span>

                  {(listing.salary_min || listing.salary_max) && (
                    <span>
                      {listing.salary_min && listing.salary_max
                        ? `$${(listing.salary_min / 1000).toFixed(0)}K\u2013$${(listing.salary_max / 1000).toFixed(0)}K`
                        : listing.salary_min
                          ? `From $${(listing.salary_min / 1000).toFixed(0)}K`
                          : `Up to $${((listing.salary_max ?? 0) / 1000).toFixed(0)}K`}
                    </span>
                  )}

                  {listing.posted_at && (
                    <span>Posted {formatShortDate(listing.posted_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Match analysis */}
          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Match Analysis
            </h2>

            <div className="mb-4">
              <p className="text-sm text-text-primary leading-relaxed">
                {match.match_explanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">Fit Score</p>
                <span
                  className={cn(
                    "inline-block rounded-full px-2 py-1 text-xs font-medium",
                    fitConfig.bg,
                    fitConfig.text
                  )}
                >
                  {fitConfig.label}
                </span>
              </div>

              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Competition Level
                </p>
                <span className={cn("text-sm font-medium", compConfig.className)}>
                  {compConfig.label}
                </span>
              </div>

              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Recommended Action
                </p>
                <span className="text-sm font-medium text-primary">
                  {actionLabel}
                </span>
              </div>
            </div>

            {(listing.salary_min || listing.salary_max) && (
              <div className="mt-4 rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Compensation Range
                </p>
                <p className="text-sm font-medium text-text-primary">
                  {listing.salary_min && listing.salary_max
                    ? `$${(listing.salary_min / 1000).toFixed(0)}K \u2013 $${(listing.salary_max / 1000).toFixed(0)}K`
                    : listing.salary_min
                      ? `From $${(listing.salary_min / 1000).toFixed(0)}K`
                      : `Up to $${((listing.salary_max ?? 0) / 1000).toFixed(0)}K`}
                </p>
              </div>
            )}

            {listing.requirements && listing.requirements.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-text-secondary mb-2">
                  Key Requirements
                </p>
                <ul className="space-y-1">
                  {listing.requirements.slice(0, 8).map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Job description */}
          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">
              Job Description
            </h2>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {listing.description_summary ??
                listing.description_full ??
                "No description available."}
            </div>
          </div>

          {/* Mock Interview Feedback */}
          {interviews.length > 0 && (
            <div className="rounded-md border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Mock Interview Sessions
              </h2>
              <div className="space-y-3">
                {interviews.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-sm bg-background p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">
                          {session.format
                            ? session.format.charAt(0).toUpperCase() +
                              session.format.slice(1)
                            : "Interview"}{" "}
                          Session
                        </span>
                        {session.completed_at && (
                          <span className="text-xs text-text-secondary">
                            {formatDate(session.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.overall_score !== null && (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            session.overall_score >= 80
                              ? "text-[#059669]"
                              : session.overall_score >= 60
                                ? "text-[#D97706]"
                                : "text-[#DC2626]"
                          )}
                        >
                          {session.overall_score}%
                        </span>
                      )}
                      {session.feedback_generated && (
                        <Link
                          href={`/interviews/feedback/${session.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View Feedback
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right pane -- Actions + Application kit */}
        <div className="lg:col-span-2 space-y-4">
          {/* CTAs */}
          <div className="rounded-md border border-border bg-surface p-6 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary mb-2">
              Actions
            </h2>

            {/* Apply externally */}
            {listing.source_url && (
              <a
                href={listing.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-sm bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-[#1D4ED8] transition-default"
              >
                <ExternalLink className="h-4 w-4" />
                Apply on Company Site
              </a>
            )}

            {/* Track as applied -- only when no application or saved */}
            {!isApplied && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleTrackApplied}
                disabled={trackSaving}
              >
                {trackSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Track as Applied
                  </>
                )}
              </Button>
            )}

            {/* Already applied indicator + advance to interviewing */}
            {application?.status === "applied" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 w-full rounded-sm border border-[#059669]/20 bg-[#059669]/5 px-4 py-2.5 text-sm font-medium text-[#059669]">
                  <CheckCircle2 className="h-4 w-4" />
                  Tracked as Applied
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-[#D97706]/30 text-[#D97706] hover:bg-[#D97706]/5"
                  onClick={async () => {
                    setTrackSaving(true);
                    try {
                      const res = await fetch(`/api/v1/employee/jobs/${match.id}/track`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "interviewing" }),
                      });
                      const json = await res.json();
                      if (res.ok) setApplication(json.data as ApplicationStatus);
                    } finally {
                      setTrackSaving(false);
                    }
                  }}
                  disabled={trackSaving}
                >
                  <MessageSquare className="h-4 w-4" />
                  Mark as Interviewing
                </Button>
              </div>
            )}

            {/* Interviewing indicator */}
            {application?.status === "interviewing" && (
              <div className="flex items-center gap-2 w-full rounded-sm border border-[#D97706]/20 bg-[#D97706]/5 px-4 py-2.5 text-sm font-medium text-[#D97706]">
                <MessageSquare className="h-4 w-4" />
                Interviewing
              </div>
            )}

            {/* Save for later -- only when not already saved or applied */}
            {!isApplied && !isSaved && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSave}
                disabled={trackSaving}
              >
                <Bookmark className="h-4 w-4" />
                Save for Later
              </Button>
            )}

            {/* Already saved indicator */}
            {isSaved && (
              <div className="flex items-center gap-2 w-full rounded-sm border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary">
                <Bookmark className="h-4 w-4" />
                Saved
              </div>
            )}

            {/* Start Mock Interview -- only when kit exists */}
            {kit && (
              <Link
                href={`/interviews?job_match_id=${match.id}`}
                className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-background transition-default"
              >
                <Mic className="h-4 w-4" />
                Start Mock Interview
              </Link>
            )}
          </div>

          {/* Resume match score */}
          {kit && kit.resume_match_score !== null && (
            <div className="rounded-md border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resume Match
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {kit.resume_match_score}%
                  </p>
                  {kit.resume_match_date && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      as of {formatShortDate(kit.resume_match_date)}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleRefreshScore}
                  disabled={refreshingScore}
                >
                  <RefreshCw
                    className={cn(
                      "h-3.5 w-3.5",
                      refreshingScore && "animate-spin"
                    )}
                  />
                  Refresh
                </Button>
              </div>
              {kit.resume_match_projected !== null && (
                <p className="text-xs text-text-secondary mt-2">
                  Projected with edits: {kit.resume_match_projected}%
                </p>
              )}
            </div>
          )}

          {/* Application Kit */}
          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Application Kit
            </h2>

            {/* Kit not yet generated -- show generate button */}
            {!kit && !kitLoading && !kitError && (
              <div className="rounded-sm bg-primary-light p-4 text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-text-primary mb-1">
                  Generate your application kit
                </p>
                <p className="text-xs text-text-secondary mb-3">
                  Tailored intro paragraph, outreach messages, and interview
                  prep for this specific job.
                </p>
                <Button size="sm" onClick={handleGenerateKit} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Application Kit
                </Button>
              </div>
            )}

            {/* Kit loading */}
            {kitLoading && (
              <div className="space-y-3">
                <div className="rounded-sm bg-primary-light p-4 text-center">
                  <Sparkles className="h-6 w-6 text-primary mx-auto mb-2 animate-pulse" />
                  <p className="text-sm font-medium text-primary">
                    Building your tailored application kit...
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    This usually takes 15-30 seconds.
                  </p>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-28 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                    <div className="h-16 w-full animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  </div>
                ))}
              </div>
            )}

            {/* Kit error */}
            {kitError && (
              <div className="rounded-sm border border-[#DC2626]/20 bg-[#DC2626]/5 p-4">
                <p className="text-sm text-[#DC2626] font-medium mb-2">
                  Failed to generate application kit
                </p>
                <p className="text-xs text-text-secondary mb-3">{kitError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateKit}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Kit generated -- show all 6 sections */}
            {kit && !kitLoading && (
              <div className="space-y-4">
                {/* Resume recommendation if no resume */}
                {kit.resume_recommendation && (
                  <div className="rounded-sm border border-[#D97706]/20 bg-[#D97706]/5 p-3">
                    <p className="text-xs text-[#D97706] font-medium mb-1">
                      Resume Not Found
                    </p>
                    <p className="text-xs text-text-secondary">
                      {kit.resume_recommendation}
                    </p>
                    <Link
                      href="/resumes"
                      className="text-xs font-medium text-primary hover:underline mt-1 inline-block"
                    >
                      Build Resume
                    </Link>
                  </div>
                )}

                {/* 1. Intro paragraph */}
                <KitSection
                  label="Cover Note"
                  icon={<FileText className="h-3.5 w-3.5" />}
                  text={kit.intro_paragraph}
                  fieldName="intro_paragraph"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                />

                {/* 2. Recruiter message */}
                <KitSection
                  label="Recruiter Message"
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  text={kit.recruiter_message}
                  fieldName="recruiter_message"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  hint="Under 300 characters \u2014 ideal for LinkedIn"
                />

                {/* 3. Hiring manager message */}
                <KitSection
                  label="Hiring Manager Message"
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  text={kit.hiring_manager_message}
                  fieldName="hiring_manager_message"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                />

                {/* 4. Referral request */}
                <KitSection
                  label="Referral Request"
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  text={kit.referral_request}
                  fieldName="referral_request"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  hint="For a mutual connection at the company"
                />

                {/* 5. Resume edits */}
                {kit.resume_edits && kit.resume_edits.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-medium text-text-primary">
                        Suggested Resume Edits
                      </p>
                    </div>
                    <div className="space-y-2">
                      {kit.resume_edits.map((edit, i) => (
                        <div
                          key={i}
                          className="rounded-sm bg-background p-3 text-xs space-y-1"
                        >
                          <span className="inline-block rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                            {edit.section}
                          </span>
                          <p className="text-text-secondary line-through">
                            {edit.current_text}
                          </p>
                          <p className="text-text-primary font-medium">
                            {edit.suggested_edit}
                          </p>
                          <p className="text-text-secondary italic">
                            {edit.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Interview themes */}
                {kit.interview_themes && kit.interview_themes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-medium text-text-primary">
                        Likely Interview Topics
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {kit.interview_themes.map((theme, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-text-secondary"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {theme}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resume recommendation */}
          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resume Recommendation
            </h2>
            <p className="text-sm text-text-secondary mb-3">
              Use your tailored resume for the best results when applying.
            </p>
            <Link
              href="/resumes"
              className="text-sm font-medium text-primary hover:underline"
            >
              Go to Resume Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kit Section Subcomponent ──────────────────────────────────────────

function KitSection({
  label,
  icon,
  text,
  fieldName,
  copiedField,
  onCopy,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  text: string;
  fieldName: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          <p className="text-xs font-medium text-text-primary">{label}</p>
        </div>
        <button
          onClick={() => onCopy(text, fieldName)}
          className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-primary transition-default"
        >
          {copiedField === fieldName ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-[#059669]" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      {hint && (
        <p className="text-[10px] text-text-secondary mb-1.5">{hint}</p>
      )}
      <div className="rounded-sm bg-background p-3 text-sm text-text-primary leading-relaxed">
        {text}
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <JobDetailContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
