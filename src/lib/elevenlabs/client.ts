/**
 * Server-side ElevenLabs client utility.
 *
 * Uses the @elevenlabs/elevenlabs-js SDK with the ELEVENLABS_API_KEY
 * environment variable. This module is server-only — never import it
 * from client components.
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Create a new ElevenLabs client instance authenticated with the
 * server-side API key.
 */
export function createElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  return new ElevenLabsClient({ apiKey });
}
