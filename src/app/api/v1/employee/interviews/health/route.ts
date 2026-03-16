/**
 * GET /api/v1/employee/interviews/health
 *
 * Lightweight check that ElevenLabs Conversational AI is reachable.
 * Called when the mock interview config modal opens to prevent the user
 * from starting a session that will fail (MP edge case).
 *
 * Uses Node.js Runtime — the ElevenLabs SDK requires Node.js APIs.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createElevenLabsClient } from "@/lib/elevenlabs/client";

export async function GET(request: NextRequest) {
  // Auth
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  try {
    const elevenlabs = createElevenLabsClient();
    // Lightweight call — list agents with limit 1 to verify connectivity
    await elevenlabs.conversationalAi.agents.list({ pageSize: 1 });

    return NextResponse.json({ data: { available: true } });
  } catch {
    return NextResponse.json({ data: { available: false } });
  }
}
