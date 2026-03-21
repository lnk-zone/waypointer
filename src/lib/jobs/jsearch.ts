/**
 * JSearch Provider — E7-01
 *
 * Concrete implementation of JobDataProvider using JSearch API
 * (https://www.openwebninja.com/api/jsearch).
 *
 * JSearch aggregates real-time job listings from Google for Jobs
 * and public sources. Returns structured job data including titles,
 * descriptions, requirements, salaries, locations, and application links.
 */

import { z } from "zod";
import type { JobDataProvider, JobListing, JobSearchParams } from "./provider";

// ─── Zod Validation ─────────────────────────────────────────────────

const jSearchJobSchema = z.object({
  job_id: z.string(),
  job_title: z.string(),
  employer_name: z.string(),
  employer_logo: z.string().nullable().optional(),
  job_city: z.string().nullable().optional(),
  job_state: z.string().nullable().optional(),
  job_country: z.string().nullable().optional(),
  job_is_remote: z.boolean().optional().default(false),
  job_description: z.string().optional().default(""),
  job_min_salary: z.number().nullable().optional(),
  job_max_salary: z.number().nullable().optional(),
  job_salary_currency: z.string().nullable().optional(),
  job_salary_period: z.string().nullable().optional(),
  job_posted_at_datetime_utc: z.string().nullable().optional(),
  job_apply_link: z.string().nullable().optional(),
  employer_website: z.string().nullable().optional(),
  job_highlights: z
    .object({
      Qualifications: z.array(z.string()).optional(),
      Responsibilities: z.array(z.string()).optional(),
      Benefits: z.array(z.string()).optional(),
    })
    .optional(),
  job_required_experience: z
    .object({
      no_experience_required: z.boolean().optional(),
      required_experience_in_months: z.number().nullable().optional(),
      experience_mentioned: z.boolean().optional(),
      experience_preferred: z.boolean().optional(),
    })
    .optional(),
});

const jSearchResponseSchema = z.object({
  status: z.string().optional(),
  request_id: z.string().optional(),
  data: z.array(jSearchJobSchema).default([]),
});

type JSearchJob = z.infer<typeof jSearchJobSchema>;

// ─── Constants ──────────────────────────────────────────────────────

const JSEARCH_BASE_URL = "https://api.openwebninja.com/jsearch";
const FETCH_TIMEOUT_MS = 30_000;

// ─── Helper: Normalize JSearch job to JobListing ─────────────────────

function normalizeJob(job: JSearchJob): JobListing {
  // Build location string
  const locationParts = [job.job_city, job.job_state, job.job_country].filter(
    Boolean
  );
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  // Extract requirements from highlights
  const requirements: string[] = [];
  if (job.job_highlights?.Qualifications) {
    requirements.push(...job.job_highlights.Qualifications);
  }
  if (job.job_highlights?.Responsibilities) {
    requirements.push(...job.job_highlights.Responsibilities);
  }

  // Determine hybrid (has location but also mentions remote)
  const descriptionLower = job.job_description?.toLowerCase() ?? "";
  const isHybrid =
    !job.job_is_remote &&
    !!location &&
    (descriptionLower.includes("hybrid") ||
      descriptionLower.includes("remote optional"));

  // Generate a summary from the first ~500 chars of description
  const descriptionSummary = job.job_description
    ? job.job_description.slice(0, 500).trim() +
      (job.job_description.length > 500 ? "..." : "")
    : null;

  return {
    external_id: job.job_id,
    title: job.job_title,
    company_name: job.employer_name,
    company_logo_url: job.employer_logo ?? null,
    location,
    is_remote: job.job_is_remote ?? false,
    is_hybrid: isHybrid,
    description_summary: descriptionSummary,
    description_full: job.job_description ?? null,
    salary_min: job.job_min_salary ?? null,
    salary_max: job.job_max_salary ?? null,
    requirements,
    posted_at: job.job_posted_at_datetime_utc ?? null,
    source_url: job.job_apply_link ?? null,
    employer_website: job.employer_website ?? null,
  };
}

// ─── JSearch Provider Class ──────────────────────────────────────────

export class JSearchProvider implements JobDataProvider {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.JOB_DATA_API_KEY;
    if (!key) {
      throw new Error(
        "JOB_DATA_API_KEY environment variable is not set. " +
          "Please add your JSearch API key to .env.local."
      );
    }
    this.apiKey = key;
  }

  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    const query = params.keywords.join(" ");

    const searchParams = new URLSearchParams({
      query,
      page: params.page.toString(),
      num_pages: "1",
    });

    if (params.location) {
      searchParams.set("query", `${query} in ${params.location}`);
    }

    if (params.remote) {
      searchParams.set("work_from_home", "true");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${JSEARCH_BASE_URL}/search?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
          },
          signal: controller.signal,
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("JSearch API request timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(
        `JSearch API error: ${response.status} ${response.statusText}`
      );
    }

    const raw = await response.json();
    const parsed = jSearchResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error(
        `JSearch API returned unexpected response format: ${parsed.error.issues.map((i) => i.message).join("; ")}`
      );
    }

    return parsed.data.data.map(normalizeJob);
  }

  async getJobDetail(externalId: string): Promise<JobListing | null> {
    const searchParams = new URLSearchParams({
      job_id: externalId,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `${JSEARCH_BASE_URL}/job-details?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
          },
          signal: controller.signal,
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("JSearch API request timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `JSearch API error: ${response.status} ${response.statusText}`
      );
    }

    const raw = await response.json();
    const parsed = jSearchResponseSchema.safeParse(raw);

    if (!parsed.success || parsed.data.data.length === 0) {
      return null;
    }

    return normalizeJob(parsed.data.data[0]);
  }
}
