/**
 * Job Data Provider Interface — E7-01
 *
 * Abstracts the job listing data source behind a swappable interface
 * per MP §7. Consuming code depends only on JobDataProvider,
 * allowing the provider to be replaced without touching matching logic.
 */

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Normalized job listing matching the `job_listings` table schema from MP §8.
 */
export interface JobListing {
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
  requirements: string[];
  posted_at: string | null;
  source_url: string | null;
  employer_website: string | null;
}

/**
 * Search parameters for job listing queries.
 */
export interface JobSearchParams {
  keywords: string[];
  location: string;
  remote: boolean;
  page: number;
}

// ─── Interface ───────────────────────────────────────────────────────

/**
 * Abstract job data provider interface.
 * Implementations must fetch and normalize listings from their source.
 */
export interface JobDataProvider {
  /**
   * Search for job listings matching the given parameters.
   * Returns normalized JobListing objects.
   */
  searchJobs(params: JobSearchParams): Promise<JobListing[]>;

  /**
   * Fetch detailed information for a single job listing by its external ID.
   * Returns null if the listing is not found.
   */
  getJobDetail(externalId: string): Promise<JobListing | null>;
}
