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
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Shield,
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

// ─── Component ────────────────────────────────────────────────────────

function JobDetailContent() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<JobMatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<"idle" | "saving" | "saved" | "applied">("idle");

  // Fetch job match detail via single-match lookup
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/employee/jobs?match_id=${matchId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job match not found");
          return;
        }
        throw new Error("Failed to fetch job details");
      }

      const json = await res.json();
      setMatch(json.data as JobMatchDetail);
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
  const handleTrack = async (status: "saved" | "applied") => {
    if (!match) return;
    setTrackStatus("saving");

    try {
      const res = await fetch(`/api/v1/employee/jobs/${match.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setTrackStatus(status);
      } else {
        setTrackStatus("idle");
      }
    } catch {
      setTrackStatus("idle");
    }
  };

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
  const actionLabel = ACTION_LABELS[match.recommended_action] ?? match.recommended_action;

  let locationTag = "On-site";
  if (listing.is_remote) locationTag = "Remote";
  else if (listing.is_hybrid) locationTag = "Hybrid";

  // Check if listing is inactive
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
        {/* Left pane — Job details + Match analysis */}
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
                        ? `$${(listing.salary_min / 1000).toFixed(0)}K–$${(listing.salary_max / 1000).toFixed(0)}K`
                        : listing.salary_min
                          ? `From $${(listing.salary_min / 1000).toFixed(0)}K`
                          : `Up to $${((listing.salary_max ?? 0) / 1000).toFixed(0)}K`}
                    </span>
                  )}

                  {listing.posted_at && (
                    <span>
                      Posted{" "}
                      {new Date(listing.posted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
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

            {/* Match explanation */}
            <div className="mb-4">
              <p className="text-sm text-text-primary leading-relaxed">
                {match.match_explanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fit */}
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

              {/* Competition */}
              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Competition Level
                </p>
                <span className={cn("text-sm font-medium", compConfig.className)}>
                  {compConfig.label}
                </span>
              </div>

              {/* Recommended action */}
              <div className="rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Recommended Action
                </p>
                <span className="text-sm font-medium text-primary">
                  {actionLabel}
                </span>
              </div>
            </div>

            {/* Compensation alignment */}
            {(listing.salary_min || listing.salary_max) && (
              <div className="mt-4 rounded-sm bg-background p-3">
                <p className="text-xs text-text-secondary mb-1">
                  Compensation Range
                </p>
                <p className="text-sm font-medium text-text-primary">
                  {listing.salary_min && listing.salary_max
                    ? `$${(listing.salary_min / 1000).toFixed(0)}K – $${(listing.salary_max / 1000).toFixed(0)}K`
                    : listing.salary_min
                      ? `From $${(listing.salary_min / 1000).toFixed(0)}K`
                      : `Up to $${((listing.salary_max ?? 0) / 1000).toFixed(0)}K`}
                </p>
              </div>
            )}

            {/* Requirements / skills from the listing */}
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
        </div>

        {/* Right pane — Application kit + CTAs */}
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

            {/* Track as applied */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleTrack("applied")}
              disabled={trackStatus === "saving" || trackStatus === "applied"}
            >
              {trackStatus === "applied" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                  Tracked as Applied
                </>
              ) : trackStatus === "saving" ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Track as Applied
                </>
              )}
            </Button>

            {/* Save */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleTrack("saved")}
              disabled={trackStatus === "saving" || trackStatus === "saved"}
            >
              {trackStatus === "saved" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Save for Later
                </>
              )}
            </Button>
          </div>

          {/* Application Kit placeholder — E7-04 will implement the generation */}
          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Application Kit
            </h2>
            <div className="rounded-sm bg-primary-light p-4 text-center">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary mb-1">
                Application kit coming soon
              </p>
              <p className="text-xs text-text-secondary">
                Tailored intro paragraphs, outreach messages, and interview
                prep will be generated here for this specific job.
              </p>
            </div>
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
              Go to Resume Workspace →
            </Link>
          </div>
        </div>
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
