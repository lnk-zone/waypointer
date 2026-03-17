import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeAIPipeline, AIError } from "@/lib/ai/pipeline";
import { extractStructuralSchema } from "@/lib/validators/ai";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "edge";

const requestSchema = z.object({
  resume_text: z.string().min(1, "Resume text is required"),
});

/**
 * POST /api/v1/test/ai-pipeline
 * Integration test route for the AI pipeline.
 * Runs EXTRACT_STRUCTURAL on provided resume text.
 * This route should be removed before production launch.
 *
 * Note: Uses Node.js runtime (not Edge) because @anthropic-ai/sdk
 * requires Node.js APIs. Per MP §7, this is acceptable for AI routes
 * that depend on Node.js-only libraries.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
    }
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid input", {
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { resume_text } = parsed.data;
    const startTime = Date.now();

    const result = await executeAIPipeline(
      "EXTRACT_STRUCTURAL",
      { resume_text },
      extractStructuralSchema
    );

    const durationMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        duration_ms: durationMs,
        prompt_id: "EXTRACT_STRUCTURAL",
        result,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof AIError) {
      const codeMap: Record<string, keyof typeof ERROR_CODES> = {
        AI_TIMEOUT: "AI_TIMEOUT",
        AI_API_ERROR: "AI_ERROR",
        AI_ERROR: "AI_ERROR",
        PARSE_ERROR: "AI_ERROR",
        VALIDATION_ERROR: "AI_ERROR",
        PROMPT_NOT_FOUND: "NOT_FOUND",
        MISSING_VARIABLES: "VALIDATION_ERROR",
        EMPTY_RESPONSE: "AI_ERROR",
        RATE_LIMITED: "AI_ERROR",
      };
      const errorCode = codeMap[err.code] ?? "AI_ERROR";
      return apiError(ERROR_CODES[errorCode], err.message);
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(ERROR_CODES.INTERNAL_ERROR, message);
  }
}
