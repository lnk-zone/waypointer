import { NextResponse } from "next/server";
import {
  type ApiError,
  type ErrorCode,
  ERROR_CODES,
  ERROR_STATUS_MAP,
} from "@/types/api";

/**
 * Create a standardized API error response matching MP §9 format.
 */
export function apiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiError> {
  const status = ERROR_STATUS_MAP[code] ?? 500;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Parsed error from an API response.
 */
export class AppError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Parse an API error response into a typed AppError.
 * Returns null if the response is not in the standard error format.
 */
export async function parseApiError(
  response: Response
): Promise<AppError | null> {
  try {
    const body = await response.json();
    if (body?.error?.code && body?.error?.message) {
      return new AppError(
        body.error.code as ErrorCode,
        body.error.message,
        body.error.details
      );
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if an error is a specific error code.
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof AppError && error.code === code;
}

export { ERROR_CODES };
