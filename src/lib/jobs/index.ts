/**
 * Job Data Module — E7-01
 *
 * Re-exports the provider interface, concrete implementation,
 * and ingestion utilities.
 */

export type {
  JobDataProvider,
  JobListing,
  JobSearchParams,
} from "./provider";

export { JSearchProvider } from "./jsearch";

export {
  ingestJobListings,
  ingestMultipleSearches,
  markStaleListings,
  type IngestResult,
} from "./ingest";

export { matchJobsForEmployee, type MatchResult } from "./matching";
