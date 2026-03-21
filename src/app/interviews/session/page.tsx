"use client";

/**
 * Mock Interview Session — Screen 12
 *
 * Voice-based interview session using ElevenLabs Conversational AI via a
 * direct browser WebSocket connection to the signed URL.
 *
 * Flow:
 *   connecting → active → ending → completed
 *
 * The page reads config from URL search params and on mount calls
 * POST /api/v1/employee/interviews/session/start to get the signed URL.
 * When the session ends, it calls POST /api/v1/employee/interviews/session/:id/complete
 * and navigates to /interviews/feedback/:id (E9-03).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Play,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

type SessionState = "connecting" | "active" | "ending" | "completed" | "error";

interface ElevenLabsConfig {
  agent_id: string;
  signed_url: string;
}

interface TranscriptLine {
  speaker: "agent" | "user";
  text: string;
}

// ─── ElevenLabs WebSocket Protocol ────────────────────────────────────

/**
 * Scheduled audio playback queue.
 * Sequences PCM chunks so they don't overlap during network bursts.
 */
let audioScheduleTime = 0;

function playPcmAudio(audioCtx: AudioContext, base64: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // PCM 16-bit → Float32 samples
  const sampleCount = Math.floor(bytes.length / 2);
  const float32 = new Float32Array(sampleCount);
  const dataView = new DataView(bytes.buffer);
  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    float32[i] = int16 / 32768;
  }

  const buffer = audioCtx.createBuffer(1, sampleCount, 16000);
  buffer.copyToChannel(float32, 0);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  // Schedule sequentially to prevent overlap
  const now = audioCtx.currentTime;
  const startTime = Math.max(now, audioScheduleTime);
  source.start(startTime);
  audioScheduleTime = startTime + buffer.duration;
}

/**
 * Resets the audio schedule (e.g., on interruption).
 */
function resetAudioSchedule(): void {
  audioScheduleTime = 0;
}

/**
 * Encodes a Float32Array of PCM samples to base64 PCM 16-bit little-endian.
 */
function encodePcm16(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, clamped * 32767, true);
  }
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Downsample a Float32Array from sourceRate to 16000 Hz.
 */
function downsampleTo16k(
  samples: Float32Array,
  sourceRate: number
): Float32Array {
  if (sourceRate === 16000) return samples;
  const ratio = sourceRate / 16000;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    output[i] = samples[Math.floor(i * ratio)];
  }
  return output;
}

// ─── Timer ─────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Session Content ────────────────────────────────────────────────────

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse config from URL
  const pathId = searchParams.get("path_id") ?? "";
  const prepId = searchParams.get("prep_id") ?? undefined;
  const format = (searchParams.get("format") ?? "behavioral") as
    | "behavioral"
    | "technical"
    | "mixed";
  const difficulty = (searchParams.get("difficulty") ?? "standard") as
    | "standard"
    | "challenging";
  const durationMinutes = parseInt(searchParams.get("duration") ?? "15", 10) as
    | 10
    | 15
    | 20;
  const jobMatchId = searchParams.get("job_match_id") ?? undefined;

  // State
  const [sessionState, setSessionState] = useState<SessionState>("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioQualityWarning, setAudioQualityWarning] = useState(false);

  // Refs for WebSocket + audio
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptLinesRef = useRef<TranscriptLine[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionDurationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interruptIdRef = useRef<number>(0);
  const endCalledRef = useRef(false);
  const sessionStateRef = useRef<SessionState>("connecting");
  const sessionDurationRef = useRef(0);
  const isPausedRef = useRef(false);
  const silentFrameCountRef = useRef(0);

  // ─── Complete Session ──────────────────────────────────────────────

  const completeSession = useCallback(
    async (sid: string, isShortSession: boolean) => {
      if (endCalledRef.current) return;
      endCalledRef.current = true;

      setSessionState("ending");
      sessionStateRef.current = "ending";

      // Stop all audio capture
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (sessionDurationTimerRef.current) {
        clearInterval(sessionDurationTimerRef.current);
        sessionDurationTimerRef.current = null;
      }

      // Close WebSocket gracefully
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Session ended");
      }

      if (isShortSession) {
        setSessionState("error");
        setError(
          "This session was too short to generate feedback. Sessions must be at least 2 minutes long."
        );
        return;
      }

      // Build transcript text from collected lines
      const transcriptText = transcriptLinesRef.current
        .map((l) => `${l.speaker === "agent" ? "Interviewer" : "You"}: ${l.text}`)
        .join("\n");

      try {
        const res = await fetch(
          `/api/v1/employee/interviews/session/${sid}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: transcriptText }),
          }
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ?? "Failed to save interview session"
          );
        }

        setSessionState("completed");
        // Navigate to feedback page (E9-03)
        router.push(`/interviews/feedback/${sid}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to save your session. Please try again."
        );
        setSessionState("error");
      }
    },
    [router]
  );

  // ─── Start Session ─────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    if (!pathId && !prepId) {
      setError("No role path or prep guide selected. Please go back and configure your interview.");
      setSessionState("error");
      return;
    }

    // Request microphone permission first
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;
    } catch {
      setMicPermissionDenied(true);
      setSessionState("error");
      return;
    }

    // Call the backend to create the ElevenLabs session
    let config: ElevenLabsConfig;
    let sid: string;
    try {
      const res = await fetch("/api/v1/employee/interviews/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pathId ? { role_path_id: pathId } : {}),
          ...(prepId ? { prep_id: prepId } : {}),
          job_match_id: jobMatchId || undefined,
          format,
          difficulty,
          duration_minutes: durationMinutes,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ??
            "Interview practice is temporarily unavailable. Please try again."
        );
      }

      const json = await res.json();
      config = json.data.elevenlabs_config as ElevenLabsConfig;
      sid = json.data.session_id as string;
      setSessionId(sid);
    } catch (err) {
      // Stop mic stream on failure
      stream.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start interview session. Please try again."
      );
      setSessionState("error");
      return;
    }

    // Set up AudioContext for playback and capture
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;

    // Connect microphone → ScriptProcessor → WebSocket
    const source = audioCtx.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated but still the most compatible cross-browser option
    // for capturing raw PCM without AudioWorklet complexity
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    // Connect WebSocket
    const ws = new WebSocket(config.signed_url);
    wsRef.current = ws;

    ws.onopen = () => {
      setSessionState("active");
      sessionStateRef.current = "active";

      // Start countdown timer
      const totalSeconds = durationMinutes * 60;
      setTimeRemaining(totalSeconds);

      timerRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            completeSession(sid, false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Track session duration for the short-session check (ref avoids stale closure)
      sessionDurationTimerRef.current = setInterval(() => {
        if (isPausedRef.current) return;
        sessionDurationRef.current += 1;
      }, 1000);

      // Start capturing microphone and sending audio
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        // When paused, send silence (skip actual audio)
        if (isPausedRef.current) {
          setIsUserSpeaking(false);
          return;
        }
        const float32 = e.inputBuffer.getChannelData(0);
        // Downsample to 16kHz if AudioContext sample rate differs
        const pcm = downsampleTo16k(float32, audioCtx.sampleRate);
        const base64 = encodePcm16(pcm);
        ws.send(JSON.stringify({ user_audio_chunk: base64 }));

        // Basic voice activity detection: RMS > threshold
        let sum = 0;
        for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
        const rms = Math.sqrt(sum / pcm.length);
        setIsUserSpeaking(rms > 0.01);

        // Track consecutive silent frames — sustained silence may indicate audio issue
        // Each frame is ~256ms at 16kHz/4096 buffer. 40 frames ≈ 10 seconds of silence
        if (rms < 0.002) {
          silentFrameCountRef.current += 1;
          if (silentFrameCountRef.current >= 40) {
            setAudioQualityWarning(true);
          }
        } else {
          silentFrameCountRef.current = 0;
          setAudioQualityWarning(false);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    };

    ws.onmessage = async (event: MessageEvent) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = message.type as string | undefined;

      switch (type) {
        case "audio": {
          const audioEvent = message.audio_event as
            | { audio_base_64: string; event_id: string }
            | undefined;
          if (!audioEvent) break;
          const eventId = parseInt(audioEvent.event_id, 10);
          if (isNaN(eventId) || eventId <= interruptIdRef.current) break;
          // Skip playback when paused
          if (isPausedRef.current) break;
          setIsAgentSpeaking(true);
          if (audioCtxRef.current) {
            playPcmAudio(audioCtxRef.current, audioEvent.audio_base_64);
          }
          // Reset agent speaking indicator after a short delay
          setTimeout(() => setIsAgentSpeaking(false), 500);
          break;
        }

        case "agent_response": {
          const responseEvent = message.agent_response_event as
            | { agent_response: string }
            | undefined;
          if (responseEvent?.agent_response) {
            transcriptLinesRef.current.push({
              speaker: "agent",
              text: responseEvent.agent_response.trim(),
            });
          }
          break;
        }

        case "user_transcript": {
          const transcriptEvent = message.user_transcription_event as
            | { user_transcript: string }
            | undefined;
          if (transcriptEvent?.user_transcript) {
            transcriptLinesRef.current.push({
              speaker: "user",
              text: transcriptEvent.user_transcript.trim(),
            });
          }
          break;
        }

        case "interruption": {
          const interruptionEvent = message.interruption_event as
            | { event_id: string }
            | undefined;
          if (interruptionEvent) {
            const id = parseInt(interruptionEvent.event_id, 10);
            if (!isNaN(id)) {
              interruptIdRef.current = id;
            }
          }
          setIsAgentSpeaking(false);
          resetAudioSchedule();
          break;
        }

        case "ping": {
          const pingEvent = message.ping_event as
            | { event_id: string }
            | undefined;
          if (pingEvent && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ type: "pong", event_id: pingEvent.event_id })
            );
          }
          break;
        }

        default:
          break;
      }
    };

    ws.onerror = () => {
      if (sessionStateRef.current !== "ending" && sessionStateRef.current !== "completed") {
        setError(
          "The connection to your interviewer was interrupted. Please try again."
        );
        setSessionState("error");
        sessionStateRef.current = "error";
      }
    };

    ws.onclose = () => {
      setIsAgentSpeaking(false);
      setIsUserSpeaking(false);
    };
  }, [
    pathId,
    prepId,
    jobMatchId,
    format,
    difficulty,
    durationMinutes,
    completeSession,
  ]);

  // ─── Lifecycle: start session on mount ────────────────────────────

  useEffect(() => {
    startSession();
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (sessionDurationTimerRef.current)
        clearInterval(sessionDurationTimerRef.current);
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.close(1000, "Component unmounted");
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── End Early Handler ─────────────────────────────────────────────

  const handleEndEarly = useCallback(() => {
    if (!sessionId) return;
    const isShortSession = sessionDurationRef.current < 120;
    completeSession(sessionId, isShortSession);
  }, [sessionId, completeSession]);

  // ─── Pause / Resume Handler ─────────────────────────────────────────

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      // Mute/unmute microphone tracks
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // ─── Mic Permission Denied Screen ─────────────────────────────────

  if (micPermissionDenied) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#DC2626]/10">
            <MicOff className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Microphone access required
          </h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            Waypointer needs access to your microphone to run a voice interview.
            Please enable microphone access in your browser settings and try again.
          </p>
          <div className="rounded-md border border-border bg-surface p-4 text-left mb-6">
            <p className="text-xs font-medium text-text-primary mb-2">
              How to enable microphone access:
            </p>
            <ol className="space-y-1 text-xs text-text-secondary list-decimal list-inside">
              <li>Click the lock or info icon in your browser&apos;s address bar</li>
              <li>Find &quot;Microphone&quot; in the site settings</li>
              <li>Change the setting to &quot;Allow&quot;</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
          <Button onClick={() => router.push("/interviews")} variant="outline">
            Back to Interview Prep
          </Button>
        </div>
      </div>
    );
  }

  // ─── Error Screen ──────────────────────────────────────────────────

  if (sessionState === "error") {
    const isShortSession =
      error?.includes("too short") ||
      error?.includes("at least 2 minutes");

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#DC2626]/10">
            <AlertCircle className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {isShortSession ? "Session too short" : "Something went wrong"}
          </h2>
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            {error ?? "An unexpected error occurred. Please try again."}
          </p>
          {isShortSession ? (
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => router.push("/interviews")}
                variant="outline"
              >
                Back to Interview Prep
              </Button>
              <Button onClick={() => router.push("/interviews")}>
                Try Again
              </Button>
            </div>
          ) : (
            <Button onClick={() => router.push("/interviews")} variant="outline">
              Back to Interview Prep
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Connecting Screen ─────────────────────────────────────────────

  if (sessionState === "connecting") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          {/* Animated connecting indicator */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping [animation-delay:200ms]" />
            <div className="relative flex h-full items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Mic className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="h-6 w-64 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] mb-3" />
          <div className="h-4 w-48 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />

          <p className="text-sm font-medium text-text-primary mt-4">
            Connecting to your interviewer...
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Setting up your {durationMinutes}-minute {format} interview
          </p>
        </div>
      </div>
    );
  }

  // ─── Ending Screen ─────────────────────────────────────────────────

  if (sessionState === "ending" || sessionState === "completed") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="absolute inset-0 rounded-full border-2 border-[#059669]/20 animate-ping" />
            <div className="relative flex h-full items-center justify-center rounded-full bg-[#059669]/10 border border-[#059669]/20">
              <Mic className="h-8 w-8 text-[#059669]" />
            </div>
          </div>
          <p className="text-sm font-medium text-text-primary">
            Processing your feedback...
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Analyzing your interview responses
          </p>

          <div className="mt-4 space-y-2">
            <div className="h-3 w-56 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
            <div className="h-3 w-44 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
            <div className="h-3 w-52 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Session Screen ─────────────────────────────────────────

  const timeWarning = timeRemaining <= 60;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Session header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">
            Mock Interview
          </p>
          <h1 className="text-xl font-semibold text-text-primary">
            Interview in Progress
          </h1>
          <p className="text-xs text-text-secondary mt-1 capitalize">
            {format} · {difficulty}
          </p>
        </div>

        {/* Timer */}
        <div
          className={cn(
            "flex items-center justify-center gap-2 mb-8 text-3xl font-mono font-semibold transition-default",
            timeWarning ? "text-[#DC2626]" : "text-text-primary"
          )}
        >
          <Clock
            className={cn(
              "h-6 w-6",
              timeWarning ? "text-[#DC2626]" : "text-text-secondary"
            )}
          />
          {formatTime(timeRemaining)}
        </div>

        {/* Voice indicator */}
        <div className="flex items-center justify-center mb-10">
          <div className="relative">
            {/* Outer pulse — active when agent OR user is speaking */}
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-200",
                isAgentSpeaking || isUserSpeaking
                  ? "scale-150 bg-primary/10"
                  : "scale-100 bg-transparent"
              )}
            />
            {/* Middle ring */}
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-300",
                isAgentSpeaking
                  ? "scale-125 border-2 border-primary/30 animate-ping"
                  : isUserSpeaking
                    ? "scale-110 border-2 border-[#059669]/30 animate-ping"
                    : "scale-100 border border-border"
              )}
            />
            {/* Center circle */}
            <div
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-full transition-all duration-200",
                isAgentSpeaking
                  ? "bg-primary/15 border-2 border-primary scale-110"
                  : isUserSpeaking
                    ? "bg-[#059669]/15 border-2 border-[#059669] scale-105"
                    : "bg-surface border-2 border-border"
              )}
            >
              <Mic
                className={cn(
                  "h-8 w-8 transition-default",
                  isAgentSpeaking
                    ? "text-primary"
                    : isUserSpeaking
                      ? "text-[#059669]"
                      : "text-text-secondary"
                )}
              />
            </div>
          </div>
        </div>

        {/* Status label */}
        <p className="text-center text-sm text-text-secondary mb-2 min-h-[1.25rem]">
          {isPaused
            ? "Interview paused — press Resume to continue"
            : isAgentSpeaking
              ? "Interviewer is speaking..."
              : isUserSpeaking
                ? "Listening to you..."
                : "Listening for your response"}
        </p>

        {/* Audio quality warning */}
        {audioQualityWarning && !isPaused && (
          <div className="mb-4 rounded-md border border-[#D97706]/20 bg-[#D97706]/5 px-4 py-2 text-center">
            <p className="text-xs text-[#D97706] font-medium">
              Having trouble picking up your voice — try moving to a quieter environment
            </p>
          </div>
        )}

        {/* Time warning */}
        {timeWarning && (
          <div className="mb-6 rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-2 text-center">
            <p className="text-xs text-[#DC2626] font-medium">
              Less than 1 minute remaining
            </p>
          </div>
        )}

        {/* Pause / End early buttons */}
        <div className="flex justify-center gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleTogglePause}
            className={cn(
              "gap-2 transition-default",
              isPaused
                ? "border-primary text-primary hover:bg-primary/5"
                : "border-border text-text-secondary hover:border-primary/40 hover:text-primary"
            )}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleEndEarly}
            className="gap-2 text-text-secondary border-border hover:border-[#DC2626]/40 hover:text-[#DC2626]"
          >
            <PhoneOff className="h-4 w-4" />
            End Early
          </Button>
        </div>

        {/* Tip microcopy */}
        <p className="text-center text-[10px] text-text-secondary/60 mt-6">
          Speak naturally — the interviewer will follow up on your answers
        </p>
      </div>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────────

export default function InterviewSessionPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <SessionContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
