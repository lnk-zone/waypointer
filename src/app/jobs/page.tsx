"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  ChevronDown,
  Filter,
  Link2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
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
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  source_url: string | null;
}

type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "closed";

interface JobMatch {
  id: string;
  fit: "high_fit" | "stretch" | "low_fit";
  match_explanation: string;
  competition_level: "low" | "medium" | "high";
  recommended_action: string;
  role_path_id: string | null;
  created_at: string;
  job_listings: JobListing;
  application_status: ApplicationStatus | null;
  applied_at: string | null;
}

interface RolePath {
  id: string;
  title: string;
  is_primary: boolean;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ─── Constants ────────────────────────────────────────────────────────

/** Score Badge: MP §11 — 12px font, 4px vertical / 8px horizontal padding */
const FIT_CONFIG = {
  high_fit: { label: "High Fit", bg: "bg-[#059669]", text: "text-white", order: 0 },
  stretch: { label: "Stretch", bg: "bg-[#D97706]", text: "text-white", order: 1 },
  low_fit: { label: "Low Fit", bg: "bg-[#DC2626]", text: "text-white", order: 2 },
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

const SORT_OPTIONS = [
  { value: "fit", label: "Fit Score" },
  { value: "date", label: "Date Posted" },
  { value: "company", label: "Company" },
] as const;

const LOCATION_OPTIONS = [
  { value: "", label: "All Locations" },
  { value: "remote", label: "Remote Only" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

const APP_STATUS_TABS = [
  { value: "", label: "All Matches" },
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
] as const;

const APP_STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  saved: {
    label: "Saved",
    className: "border border-blue-600 text-blue-600 bg-transparent",
  },
  applied: {
    label: "Applied",
    className: "bg-[#059669] text-white",
  },
  interviewing: {
    label: "Interviewing",
    className: "bg-[#D97706] text-white",
  },
};

const LONG_WAIT_THRESHOLD = 30_000;

// ─── Component ────────────────────────────────────────────────────────

function JobsFeedContent() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [paths, setPaths] = useState<RolePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchingLong, setMatchingLong] = useState(false);

  // Filters & sort
  const [filterPath, setFilterPath] = useState<string>("");
  const [filterFit, setFilterFit] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterAppStatus, setFilterAppStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("fit");
  const [showFilters, setShowFilters] = useState(false);

  // Tab counts
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({
    saved: 0,
    applied: 0,
    interviewing: 0,
  });

  const [page, setPage] = useState(1);

  // External job modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [extTitle, setExtTitle] = useState("");
  const [extCompany, setExtCompany] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [extLocation, setExtLocation] = useState("");
  const [extNotes, setExtNotes] = useState("");
  const [extApplied, setExtApplied] = useState(false);
  const [extSubmitting, setExtSubmitting] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);

  const resetExtForm = () => {
    setExtTitle("");
    setExtCompany("");
    setExtUrl("");
    setExtLocation("");
    setExtNotes("");
    setExtApplied(false);
    setExtError(null);
  };

  const handleAddExternal = async () => {
    if (!extTitle.trim()) {
      setExtError("Job title is required.");
      return;
    }
    if (!extCompany.trim()) {
      setExtError("Company name is required.");
      return;
    }

    setExtSubmitting(true);
    setExtError(null);

    try {
      const res = await fetch("/api/v1/employee/jobs/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: extTitle.trim(),
          company_name: extCompany.trim(),
          url: extUrl.trim() || undefined,
          location: extLocation.trim() || undefined,
          notes: extNotes.trim() || undefined,
          already_applied: extApplied,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to add external job"
        );
      }

      // Success — close modal, refresh list
      setShowAddModal(false);
      resetExtForm();
      await fetchMatches();
      await fetchTabCounts();
    } catch (err) {
      setExtError(
        err instanceof Error ? err.message : "Failed to add external job"
      );
    } finally {
      setExtSubmitting(false);
    }
  };

  // Fetch role paths for filter dropdown
  useEffect(() => {
    async function fetchPaths() {
      try {
        const res = await fetch("/api/v1/employee/paths");
        if (res.ok) {
          const json = await res.json();
          const pathList = json.data ?? json;
          if (Array.isArray(pathList)) {
            setPaths(
              pathList
                .filter((p: RolePath & { is_selected?: boolean }) => p.is_selected !== false)
                .map((p: RolePath) => ({
                  id: p.id,
                  title: p.title,
                  is_primary: p.is_primary,
                }))
            );
          }
        }
      } catch {
        // Non-critical, filter just won't show paths
      }
    }
    fetchPaths();
  }, []);

  // Fetch tab counts for application statuses
  const fetchTabCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = { saved: 0, applied: 0, interviewing: 0 };
      const statuses = ["saved", "applied", "interviewing"] as const;
      await Promise.all(
        statuses.map(async (status) => {
          const res = await fetch(
            `/api/v1/employee/jobs?app_status=${status}&per_page=1&page=1`
          );
          if (res.ok) {
            const json = await res.json();
            counts[status] = json.pagination?.total ?? 0;
          }
        })
      );
      setTabCounts(counts);
    } catch {
      // Non-critical — counts just won't update
    }
  }, []);

  // Fetch job matches
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "20",
        sort: sortBy,
      });
      if (filterPath) params.set("path_id", filterPath);
      if (filterFit) params.set("fit", filterFit);
      if (filterAction) params.set("action", filterAction);
      if (filterLocation) params.set("location", filterLocation);
      if (filterAppStatus) params.set("app_status", filterAppStatus);

      const res = await fetch(`/api/v1/employee/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      const fetchedMatches: JobMatch[] = json.data ?? [];

      // Client-side sort for company name and date posted
      // (Supabase doesn't support ordering by related table columns)
      if (sortBy === "company") {
        fetchedMatches.sort((a, b) =>
          a.job_listings.company_name.localeCompare(b.job_listings.company_name)
        );
      } else if (sortBy === "date") {
        fetchedMatches.sort((a, b) => {
          const dateA = a.job_listings.posted_at ?? a.created_at;
          const dateB = b.job_listings.posted_at ?? b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      }
      // "fit" sort is handled server-side

      setMatches(fetchedMatches);
      setPagination(json.pagination ?? null);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterPath, filterFit, filterAction, filterLocation, filterAppStatus, sortBy]);

  useEffect(() => {
    fetchMatches();
    fetchTabCounts();
  }, [fetchMatches, fetchTabCounts]);

  // Trigger matching
  const handleRunMatching = async () => {
    setMatching(true);
    setMatchingLong(false);
    const timer = setTimeout(() => setMatchingLong(true), LONG_WAIT_THRESHOLD);

    try {
      const res = await fetch("/api/v1/employee/jobs/match", { method: "POST" });
      if (res.ok) {
        setPage(1);
        await fetchMatches();
      }
    } catch {
      // Error handled by showing empty state
    } finally {
      clearTimeout(timer);
      setMatching(false);
      setMatchingLong(false);
    }
  };

  const hasActiveFilters = filterPath || filterFit || filterAction || filterLocation;

  const clearFilters = () => {
    setFilterPath("");
    setFilterFit("");
    setFilterAction("");
    setFilterLocation("");
    setPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Recommended Jobs
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Jobs matched to your profile and target paths
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {[filterPath, filterFit, filterAction, filterLocation].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Track External Job
          </Button>
          <Button
            onClick={handleRunMatching}
            disabled={matching}
            size="sm"
            className="gap-2"
          >
            {matching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {matching ? "Matching..." : "Refresh Matches"}
          </Button>
        </div>
      </div>

      {/* Matching progress */}
      {matching && (
        <div className="mb-6 rounded-md border border-primary/20 bg-primary-light p-4">
          <p className="text-sm font-medium text-primary">
            Scoring job listings against your profile...
          </p>
          {matchingLong && (
            <p className="text-xs text-text-secondary mt-1">
              This can take a minute for large batches. Hang tight.
            </p>
          )}
        </div>
      )}

      {/* Application status tab bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {APP_STATUS_TABS.map((tab) => {
          const isActive = filterAppStatus === tab.value;
          const count = tab.value ? tabCounts[tab.value] : pagination?.total ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setFilterAppStatus(tab.value);
                setPage(1);
              }}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-default",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              )}
            >
              {tab.label}
              {typeof count === "number" && (
                <span className="ml-1.5">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 rounded-md border border-border bg-surface p-4 transition-default">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-primary">
              Filter &amp; Sort
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Path filter */}
            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                Role Path
              </label>
              <div className="relative">
                <select
                  value={filterPath}
                  onChange={(e) => {
                    setFilterPath(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Paths</option>
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

            {/* Fit filter */}
            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                Fit Score
              </label>
              <div className="relative">
                <select
                  value={filterFit}
                  onChange={(e) => {
                    setFilterFit(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Fit Levels</option>
                  <option value="high_fit">High Fit</option>
                  <option value="stretch">Stretch</option>
                  <option value="low_fit">Low Fit</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Location filter */}
            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                Location Type
              </label>
              <div className="relative">
                <select
                  value={filterLocation}
                  onChange={(e) => {
                    setFilterLocation(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Action filter */}
            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                Recommended Action
              </label>
              <div className="relative">
                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Actions</option>
                  {Object.entries(ACTION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs text-text-secondary mb-1 block">
                Sort By
              </label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-sm border border-border bg-surface px-3 py-2 pr-8 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !matching && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-surface shadow-sm p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-64 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  <div className="h-4 w-40 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                  <div className="h-4 w-96 animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                </div>
                <div className="h-6 w-20 animate-shimmer rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !matching && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-primary-light flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {hasActiveFilters
              ? "No jobs match your filters"
              : "No job matches yet"}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            {hasActiveFilters
              ? "Try adjusting your filters or expanding your search criteria."
              : "We didn\u2019t find strong matches today. Try expanding your location radius or adding a secondary path."}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={handleRunMatching} disabled={matching} size="sm">
              {matching ? "Matching..." : "Find Job Matches"}
            </Button>
          )}
        </div>
      )}

      {/* Job cards — tight card layout per MP §11 emotional design */}
      {!loading && matches.length > 0 && (
        <div className="space-y-2">
          {matches.map((match) => {
            const listing = match.job_listings;
            const fitConfig = FIT_CONFIG[match.fit];
            const compConfig = COMPETITION_CONFIG[match.competition_level];
            const actionLabel =
              ACTION_LABELS[match.recommended_action] ??
              match.recommended_action;

            let locationTag = "On-site";
            if (listing.is_remote) locationTag = "Remote";
            else if (listing.is_hybrid) locationTag = "Hybrid";

            return (
              <Link
                key={match.id}
                href={`/jobs/${match.id}`}
                className={cn(
                  "block rounded-md border border-border bg-surface shadow-sm p-4",
                  "hover:shadow-md hover:border-primary transition-default",
                  "cursor-pointer"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Company logo */}
                  <div className="hidden md:flex h-10 w-10 shrink-0 rounded-md border border-border bg-background items-center justify-center overflow-hidden">
                    {listing.company_logo_url ? (
                      <Image
                        src={listing.company_logo_url}
                        alt={listing.company_name}
                        width={40}
                        height={40}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-text-secondary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-text-primary truncate">
                          {listing.title}
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {listing.company_name}
                        </p>
                      </div>

                      {/* Fit badge — MP §11: 12px font, 4px vert / 8px horiz padding */}
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

                    {/* Match explanation — the most important element per MP §11 */}
                    <p className="text-sm text-text-primary mt-2 line-clamp-2">
                      {match.match_explanation}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
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

                      <span className={compConfig.className}>
                        {compConfig.label}
                      </span>

                      {match.application_status &&
                      APP_STATUS_BADGE_CONFIG[match.application_status] ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            APP_STATUS_BADGE_CONFIG[match.application_status].className
                          )}
                        >
                          {APP_STATUS_BADGE_CONFIG[match.application_status].label}
                          {match.application_status === "applied" && " \u2713"}
                          {match.application_status === "applied" && match.applied_at && (
                            <span className="ml-1 font-normal opacity-80">
                              {new Date(match.applied_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="font-medium text-primary">
                          {actionLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <p className="text-xs text-text-secondary">
            Showing {(pagination.page - 1) * pagination.per_page + 1}–
            {Math.min(
              pagination.page * pagination.per_page,
              pagination.total
            )}{" "}
            of {pagination.total} matches
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add External Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-default"
            onClick={() => {
              if (!extSubmitting) {
                setShowAddModal(false);
                resetExtForm();
              }
            }}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Track External Job
                </h2>
              </div>
              <button
                onClick={() => {
                  if (!extSubmitting) {
                    setShowAddModal(false);
                    resetExtForm();
                  }
                }}
                className="text-text-secondary hover:text-text-primary transition-default"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {extError && (
                <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 p-3">
                  <p className="text-sm text-[#DC2626]">{extError}</p>
                </div>
              )}

              {/* Job Title */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Job Title <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                  placeholder="e.g., Senior Product Manager"
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Company Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={extCompany}
                  onChange={(e) => setExtCompany(e.target.value)}
                  placeholder="e.g., Stripe"
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Job URL */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Job URL{" "}
                  <span className="text-text-secondary/60">(optional)</span>
                </label>
                <input
                  type="url"
                  value={extUrl}
                  onChange={(e) => setExtUrl(e.target.value)}
                  placeholder="e.g., https://jobs.lever.co/stripe/..."
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Location{" "}
                  <span className="text-text-secondary/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={extLocation}
                  onChange={(e) => setExtLocation(e.target.value)}
                  placeholder="e.g., San Francisco, CA (Remote)"
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  Notes{" "}
                  <span className="text-text-secondary/60">(optional)</span>
                </label>
                <textarea
                  value={extNotes}
                  onChange={(e) => setExtNotes(e.target.value)}
                  placeholder="Any notes about this job..."
                  rows={2}
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Already applied checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extApplied}
                  onChange={(e) => setExtApplied(e.target.checked)}
                  className="accent-primary h-4 w-4"
                />
                <span className="text-sm text-text-primary">
                  I have already applied to this job
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  resetExtForm();
                }}
                disabled={extSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddExternal}
                disabled={extSubmitting || !extTitle.trim() || !extCompany.trim()}
                className="gap-2"
              >
                {extSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Job
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <JobsFeedContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
