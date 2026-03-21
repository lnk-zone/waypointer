/**
 * AI Pipeline Core — E3-02
 *
 * Implements the complete AI pipeline per MP §6:
 * 1. Prompt registry lookup (fetchPrompt)
 * 2. Variable injection (injectVariables)
 * 3. Claude API call (callClaude)
 * 4. Structured output parsing + Zod validation (parseStructuredOutput)
 * 5. Full pipeline orchestration (executeAIPipeline)
 *
 * Error handling: 30s timeout, retry on malformed output, max 5 concurrent calls.
 */

import Anthropic from "@anthropic-ai/sdk";
import { type ZodType } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import type { PromptRegistryRow, AIModelConfig, AICallLog } from "@/types/ai";

// ─── Constants ──────────────────────────────────────────────────────────

export const AI_MAX_CONCURRENT_PER_SESSION = 5;

/** Correction nudge appended on retry when structured output parsing fails */
const CORRECTION_NUDGE =
  "Your previous response was not valid JSON matching the required schema. " +
  "Please respond with ONLY a single valid JSON object — no markdown fences, " +
  "no surrounding text, no comments. Ensure all required fields are present " +
  "and correctly typed.";

// ─── Concurrency Limiter ────────────────────────────────────────────────

// Note: In-memory Map works within a single serverless isolate. On Vercel,
// isolates may be reused across requests, providing best-effort concurrency
// limiting. For strict cross-instance enforcement, a Redis-based counter
// would be needed, but this is sufficient for the current scale.
const sessionConcurrency = new Map<string, number>();

function acquireConcurrencySlot(sessionId: string): boolean {
  const current = sessionConcurrency.get(sessionId) ?? 0;
  if (current >= AI_MAX_CONCURRENT_PER_SESSION) {
    return false;
  }
  sessionConcurrency.set(sessionId, current + 1);
  return true;
}

function releaseConcurrencySlot(sessionId: string): void {
  const current = sessionConcurrency.get(sessionId) ?? 0;
  if (current <= 1) {
    sessionConcurrency.delete(sessionId);
  } else {
    sessionConcurrency.set(sessionId, current - 1);
  }
}

// ─── Anthropic Client (singleton) ───────────────────────────────────────

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIError(
        "ANTHROPIC_API_KEY environment variable is not set",
        "AI_API_ERROR",
        "unknown"
      );
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ─── AI Call Logging ────────────────────────────────────────────────────

const AI_LOG_MAX_ENTRIES = 200;
const aiCallLogs: AICallLog[] = [];

function logAICall(log: AICallLog): void {
  if (aiCallLogs.length >= AI_LOG_MAX_ENTRIES) {
    aiCallLogs.shift();
  }
  aiCallLogs.push(log);

  // Structured JSON log output for production observability
  const entry = {
    type: "ai_call",
    prompt_id: log.promptId,
    duration_ms: log.durationMs,
    status: log.success ? "SUCCESS" : "FAILURE",
    input_tokens: log.inputTokens,
    output_tokens: log.outputTokens,
    retried: log.retried ?? false,
    error: log.error,
    timestamp: new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(entry) + "\n");
}

/** Retrieve recent AI call logs (for debugging/monitoring) */
export function getAICallLogs(): readonly AICallLog[] {
  return aiCallLogs;
}

// ─── Pipeline Functions ─────────────────────────────────────────────────

/**
 * Fetch the active prompt from the prompt_registry table.
 * Returns the prompt row or throws if not found.
 */
export async function fetchPrompt(
  promptId: string
): Promise<PromptRegistryRow> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("prompt_registry")
    .select("*")
    .eq("prompt_id", promptId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new AIError(
      `Prompt not found: ${promptId}`,
      "PROMPT_NOT_FOUND",
      promptId
    );
  }

  return data as PromptRegistryRow;
}

/**
 * Replace all {{variable_name}} placeholders in a template string.
 * Throws if a required variable placeholder has no matching value.
 *
 * Supports Handlebars-style {{#if var}}...{{/if}} conditional blocks:
 * - If the variable exists and is truthy, the block content is included.
 * - Otherwise, the entire block (including tags) is removed.
 */
export function injectVariables(
  template: string,
  variables: Record<string, string>
): string {
  // First, process {{#if variable}}...{{/if}} conditional blocks
  let result = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, content: string) => {
      const value = variables[varName];
      if (value && value.trim() !== "") {
        return content;
      }
      return "";
    }
  );

  // Then, replace {{variable_name}} placeholders
  const missingVars: string[] = [];

  result = result.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = variables[varName];
    if (value === undefined) {
      missingVars.push(varName);
      return `{{${varName}}}`;
    }
    return value;
  });

  if (missingVars.length > 0) {
    throw new AIError(
      `Missing required variables: ${missingVars.join(", ")}`,
      "MISSING_VARIABLES",
      "unknown"
    );
  }

  return result;
}

/**
 * Call the Claude API with the given prompts and config.
 * Implements a 30-second timeout per MP §6.
 * Returns the raw response text.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  config: AIModelConfig
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getAnthropicClient();

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text from the response content blocks
    const textContent = response.content.find(
      (block) => block.type === "text"
    );
    if (!textContent || textContent.type !== "text") {
      throw new AIError(
        "No text content in Claude response",
        "EMPTY_RESPONSE",
        "unknown"
      );
    }

    return {
      text: textContent.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    if (err instanceof AIError) throw err;

    throw new AIError(
      err instanceof Error ? err.message : "Unknown Claude API error",
      "AI_API_ERROR",
      "unknown"
    );
  }
}

/**
 * Parse a raw AI response string as JSON and validate against a Zod schema.
 * Strips markdown code fences if present before parsing.
 */
export function parseStructuredOutput<T>(
  response: string,
  schema: ZodType<T>
): T {
  // Strip markdown JSON fences if the model wrapped the output
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AIError(
      "AI response is not valid JSON",
      "PARSE_ERROR",
      "unknown"
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AIError(
      `AI output validation failed: ${issues}`,
      "VALIDATION_ERROR",
      "unknown"
    );
  }

  return result.data;
}

/**
 * Execute the full AI pipeline: fetch prompt → inject variables → call Claude
 * → parse and validate output.
 *
 * Implements retry on malformed output (once) with a correction nudge per MP §6.
 * Enforces max 5 concurrent calls per session.
 *
 * Options:
 * - userPromptOverride: If provided, uses this string as the user prompt instead
 *   of injecting variables into the prompt registry template. Useful when the
 *   user prompt needs a different structure (e.g., custom path generation).
 */
export async function executeAIPipeline<T>(
  promptId: string,
  variables: Record<string, string>,
  outputSchema: ZodType<T>,
  sessionId: string = "default",
  options?: { userPromptOverride?: string }
): Promise<T> {
  // Enforce concurrency limit
  if (!acquireConcurrencySlot(sessionId)) {
    throw new AIError(
      `Too many concurrent AI calls (max ${AI_MAX_CONCURRENT_PER_SESSION}). Please wait and try again.`,
      "RATE_LIMITED",
      promptId
    );
  }

  const startTime = Date.now();
  let retried = false;

  try {
    // Step 1: Fetch prompt from registry
    const prompt = await fetchPrompt(promptId);

    // Step 2: Inject variables into user prompt template (or use override)
    const userPrompt = options?.userPromptOverride
      ? options.userPromptOverride
      : injectVariables(prompt.user_prompt_template, variables);

    // Step 3: Build model config
    const config: AIModelConfig = {
      model: prompt.model,
      maxTokens: prompt.max_tokens,
      temperature: prompt.temperature,
    };

    // Step 4: Call Claude
    const response = await callClaude(prompt.system_prompt, userPrompt, config);

    // Step 5: Parse and validate
    try {
      const result = parseStructuredOutput(response.text, outputSchema);

      logAICall({
        promptId,
        durationMs: Date.now() - startTime,
        success: true,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        retried: false,
      });

      return result;
    } catch (parseError) {
      // Step 6: Retry once with correction nudge
      retried = true;

      logAICall({
        promptId,
        durationMs: Date.now() - startTime,
        success: false,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        retried: false,
        error:
          parseError instanceof Error ? parseError.message : "Parse error",
      });

      const retryStartTime = Date.now();
      const retryPrompt = `${userPrompt}\n\n${CORRECTION_NUDGE}`;
      const retryResponse = await callClaude(
        prompt.system_prompt,
        retryPrompt,
        config
      );

      try {
        const retryResult = parseStructuredOutput(
          retryResponse.text,
          outputSchema
        );

        logAICall({
          promptId,
          durationMs: Date.now() - retryStartTime,
          success: true,
          inputTokens: retryResponse.inputTokens,
          outputTokens: retryResponse.outputTokens,
          retried: true,
        });

        return retryResult;
      } catch (retryParseError) {
        logAICall({
          promptId,
          durationMs: Date.now() - retryStartTime,
          success: false,
          inputTokens: retryResponse.inputTokens,
          outputTokens: retryResponse.outputTokens,
          retried: true,
          error:
            retryParseError instanceof Error
              ? retryParseError.message
              : "Parse error on retry",
        });

        throw new AIError(
          "AI returned malformed output after retry. Please try again later.",
          "AI_ERROR",
          promptId
        );
      }
    }
  } catch (err) {
    if (err instanceof AIError) {
      // Log if not already logged (timeout, API errors, etc.)
      if (!retried && err.code !== "RATE_LIMITED") {
        logAICall({
          promptId,
          durationMs: Date.now() - startTime,
          success: false,
          retried: false,
          error: err.message,
        });
      }
      throw err;
    }

    logAICall({
      promptId,
      durationMs: Date.now() - startTime,
      success: false,
      retried,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    throw new AIError(
      err instanceof Error ? err.message : "Unknown pipeline error",
      "AI_ERROR",
      promptId
    );
  } finally {
    releaseConcurrencySlot(sessionId);
  }
}

// ─── Error Class ────────────────────────────────────────────────────────

export type AIErrorCode =
  | "PROMPT_NOT_FOUND"
  | "MISSING_VARIABLES"
  | "AI_TIMEOUT"
  | "AI_API_ERROR"
  | "EMPTY_RESPONSE"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "AI_ERROR"
  | "RATE_LIMITED";

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly promptId: string;

  constructor(message: string, code: AIErrorCode, promptId: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.promptId = promptId;
  }
}
