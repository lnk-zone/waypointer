/**
 * POST /api/v1/employee/interviews/session/start
 *
 * Creates an ElevenLabs Conversational AI agent with the INTERVIEW_PERSONA
 * system prompt, obtains a signed WebSocket URL for the client, and persists
 * an interview_sessions record.
 *
 * Uses Node.js Runtime — the ElevenLabs SDK requires Node.js APIs.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { createElevenLabsClient } from "@/lib/elevenlabs/client";
import { injectVariables } from "@/lib/ai/pipeline";
import { z } from "zod";

// ─── Request Validation ───────────────────────────────────────────────

const startSessionSchema = z.object({
  role_path_id: z.string().uuid(),
  job_match_id: z.string().uuid().optional(),
  format: z.enum(["behavioral", "technical", "mixed"]),
  difficulty: z.enum(["standard", "challenging"]),
  duration_minutes: z.union([
    z.literal(10),
    z.literal(15),
    z.literal(20),
  ]),
});

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body");
  }

  const parsed = startSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid request", {
      fields: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const supabase = createServiceClient();

  // Get the employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Get the role path (must belong to the employee)
  const { data: rolePath, error: pathError } = await supabase
    .from("role_paths")
    .select("id, title")
    .eq("id", input.role_path_id)
    .eq("employee_id", employee.id)
    .single();

  if (pathError || !rolePath) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "Role path not found. Select a valid role path and try again."
    );
  }

  // Optionally get job match details for company-specific interviews
  let companyName = "";
  let jobTitle = "";
  let hasCompanyContext = false;

  if (input.job_match_id) {
    const { data: matchData } = await supabase
      .from("job_matches")
      .select("id, job_listings!inner(title, company_name)")
      .eq("id", input.job_match_id)
      .eq("employee_id", employee.id)
      .single();

    if (matchData) {
      const listing = matchData.job_listings as unknown as {
        title: string;
        company_name: string;
      };
      companyName = listing.company_name;
      jobTitle = listing.title;
      hasCompanyContext = true;
    }
  }

  // Fetch the INTERVIEW_PERSONA prompt template from the prompt registry
  const { data: promptEntry, error: promptError } = await supabase
    .from("prompt_registry")
    .select("system_prompt, user_prompt_template")
    .eq("prompt_id", "INTERVIEW_PERSONA")
    .single();

  if (promptError || !promptEntry) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      "Interview persona configuration is unavailable. Please try again shortly."
    );
  }

  // Fetch prep questions so the mock interview asks the SAME questions
  let prepQuestionsText = "";
  {
    let prepQuery = supabase
      .from("interview_prep")
      .select("content")
      .eq("employee_id", employee.id)
      .eq("role_path_id", input.role_path_id);

    if (input.job_match_id) {
      prepQuery = prepQuery.eq("job_match_id", input.job_match_id);
    } else {
      prepQuery = prepQuery.is("job_match_id", null);
    }

    const { data: prepCache } = await prepQuery.single();

    if (prepCache) {
      const content = prepCache.content as Record<string, unknown>;
      const extractQuestions = (items: unknown[]): string[] =>
        items.map((item) =>
          typeof item === "object" && item !== null && "question" in item
            ? (item as { question: string }).question
            : String(item)
        );

      const allQuestions: string[] = [];
      if (Array.isArray(content.behavioral_questions)) {
        allQuestions.push(...extractQuestions(content.behavioral_questions));
      }
      if (Array.isArray(content.common_questions)) {
        allQuestions.push(...extractQuestions(content.common_questions));
      }
      if (Array.isArray(content.company_specific)) {
        allQuestions.push(...extractQuestions(content.company_specific));
      }

      if (allQuestions.length > 0) {
        prepQuestionsText = allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
      }
    }
  }

  // Inject variables into the persona prompt template
  const variables: Record<string, string> = {
    role_path_title: rolePath.title,
    interview_format: input.format,
    interview_difficulty: input.difficulty,
    duration_minutes: String(input.duration_minutes),
    company_context: hasCompanyContext ? "true" : "",
    company_name: companyName,
    job_title: jobTitle,
    prep_questions: prepQuestionsText,
  };

  let personaPrompt: string;
  try {
    personaPrompt = injectVariables(
      promptEntry.system_prompt as string,
      variables
    );
  } catch {
    return apiError(
      ERROR_CODES.AI_ERROR,
      "Failed to assemble interview persona. Please try again."
    );
  }

  // Create an ElevenLabs Conversational AI agent
  let agentId: string;
  let signedUrl: string;

  try {
    const elevenlabs = createElevenLabsClient();

    const agentResponse = await elevenlabs.conversationalAi.agents.create({
      name: `Waypointer Interview - ${rolePath.title}`,
      conversationConfig: {
        agent: {
          prompt: { prompt: personaPrompt },
          language: "en",
          firstMessage:
            "Hi, thanks for taking the time today. I'm going to walk through some questions about your background and experience. Let's get started.",
        },
        conversation: {
          maxDurationSeconds: input.duration_minutes * 60,
        },
      },
    });

    agentId = agentResponse.agentId;

    // Get a signed URL for the client WebSocket connection
    const signedUrlResponse =
      await elevenlabs.conversationalAi.conversations.getSignedUrl({
        agentId,
      });

    signedUrl = signedUrlResponse.signedUrl;
  } catch (err) {
    return apiError(
      ERROR_CODES.AI_ERROR,
      err instanceof Error
        ? `Failed to start interview session: ${err.message}`
        : "Interview practice is temporarily unavailable. Please try again shortly."
    );
  }

  // Persist the interview session record
  const { data: session, error: insertError } = await supabase
    .from("interview_sessions")
    .insert({
      employee_id: employee.id,
      role_path_id: input.role_path_id,
      job_match_id: input.job_match_id ?? null,
      format: input.format,
      difficulty: input.difficulty,
      duration_minutes: input.duration_minutes,
      elevenlabs_session_id: agentId,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !session) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to create interview session record"
    );
  }

  // Log activity (fire-and-forget)
  Promise.resolve(
    supabase.from("activity_log").insert({
      employee_id: employee.id,
      action: "interview_started",
      metadata: {
        session_id: session.id,
        role_path_title: rolePath.title,
        format: input.format,
        difficulty: input.difficulty,
        duration_minutes: input.duration_minutes,
        ...(hasCompanyContext ? { company_name: companyName, job_title: jobTitle } : {}),
      },
    })
  ).catch(() => {
    // Swallow — activity logging is non-critical
  });

  return NextResponse.json({
    data: {
      session_id: session.id,
      elevenlabs_config: {
        agent_id: agentId,
        signed_url: signedUrl,
      },
    },
  });
}
