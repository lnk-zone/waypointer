/**
 * Shared API types from MP §9.
 */

/** Standard API error response */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Standard pagination response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** Pagination metadata from MP §9 */
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/** Standard pagination query params */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/** Standard error codes from MP §9 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  SEAT_EXPIRED: "SEAT_EXPIRED",
  SEATS_EXHAUSTED: "SEATS_EXHAUSTED",
  AI_ERROR: "AI_ERROR",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_TOKEN: "INVALID_TOKEN",
  EMAIL_MISMATCH: "EMAIL_MISMATCH",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  NO_RESUME_UPLOADED: "NO_RESUME_UPLOADED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  SNAPSHOT_NOT_FOUND: "SNAPSHOT_NOT_FOUND",
  SNAPSHOT_NOT_CONFIRMED: "SNAPSHOT_NOT_CONFIRMED",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** HTTP status codes mapped to error codes */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.SEAT_EXPIRED]: 403,
  [ERROR_CODES.SEATS_EXHAUSTED]: 400,
  [ERROR_CODES.AI_ERROR]: 502,
  [ERROR_CODES.AI_TIMEOUT]: 504,
  [ERROR_CODES.INVALID_TOKEN]: 400,
  [ERROR_CODES.EMAIL_MISMATCH]: 400,
  [ERROR_CODES.INVALID_FILE_TYPE]: 400,
  [ERROR_CODES.FILE_TOO_LARGE]: 400,
  [ERROR_CODES.NO_RESUME_UPLOADED]: 400,
  [ERROR_CODES.EXTRACTION_FAILED]: 422,
  [ERROR_CODES.SNAPSHOT_NOT_FOUND]: 404,
  [ERROR_CODES.SNAPSHOT_NOT_CONFIRMED]: 400,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};
