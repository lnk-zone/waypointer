"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────

const CONTEXTUAL_MESSAGES = [
  { text: "Analyzing your background...", delay: 0 },
  { text: "Extracting your skills...", delay: 4000 },
  { text: "Identifying your achievements...", delay: 8000 },
];

const LONG_WAIT_THRESHOLD = 15000;
const LONG_WAIT_MESSAGE = "This is taking a bit longer than usual...";
const ESTIMATED_TIME_MESSAGE = "This usually takes 10\u201315 seconds";

const OCR_ERROR_MESSAGE =
  "We had trouble reading your resume. You can try uploading a Word document version, or add your details manually.";

const LANGUAGE_ERROR_MESSAGE =
  "Waypointer currently supports English-language resumes. We\u2019re working on additional languages.";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong while analyzing your resume. Please try again.";

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

// ─── Extraction Error Types ─────────────────────────────────────────────

type ExtractionErrorType = "ocr" | "language" | "generic";

function classifyError(errorCode?: string, errorMessage?: string): ExtractionErrorType {
  const msg = errorMessage?.toLowerCase() ?? "";

  if (
    errorCode === "EXTRACTION_FAILED" &&
    (msg.includes("language") || msg.includes("non-english") || msg.includes("not in english"))
  ) {
    return "language";
  }

  if (
    errorCode === "EXTRACTION_FAILED" &&
    msg.includes("text")
  ) {
    return "ocr";
  }

  return "generic";
}

// ─── Skeleton Loading ───────────────────────────────────────────────────

function ExtractionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Career narrative placeholder */}
      <div className="space-y-2">
        <div className={cn("h-4 w-32", SKELETON_CLASS)} />
        <div className={cn("h-20 w-full rounded-md", SKELETON_CLASS)} />
      </div>

      {/* Work history placeholders */}
      <div className="space-y-3">
        <div className={cn("h-4 w-28", SKELETON_CLASS)} />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-md border border-border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className={cn("h-5 w-40", SKELETON_CLASS)} />
              <div className={cn("h-4 w-24", SKELETON_CLASS)} />
            </div>
            <div className={cn("h-4 w-32", SKELETON_CLASS)} />
          </div>
        ))}
      </div>

      {/* Skills placeholders */}
      <div className="space-y-2">
        <div className={cn("h-4 w-16", SKELETON_CLASS)} />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={cn("h-7 rounded-full", SKELETON_CLASS)}
              style={{ width: `${60 + ((i * 17) % 40)}px` }}
            />
          ))}
        </div>
      </div>

      {/* Achievements placeholders */}
      <div className="space-y-3">
        <div className={cn("h-4 w-28", SKELETON_CLASS)} />
        {[1, 2].map((i) => (
          <div
            key={i}
            className={cn("h-14 w-full rounded-md", SKELETON_CLASS)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

function ExtractingContent() {
  const router = useRouter();

  const [contextualMessage, setContextualMessage] = useState(
    CONTEXTUAL_MESSAGES[0].text
  );
  const [showLongWait, setShowLongWait] = useState(false);
  const [progressPhase, setProgressPhase] = useState(0);
  const [errorType, setErrorType] = useState<ExtractionErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const extractionStarted = useRef(false);
  const messageTimers = useRef<NodeJS.Timeout[]>([]);
  const longWaitTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers
  const clearTimers = useCallback(() => {
    messageTimers.current.forEach(clearTimeout);
    messageTimers.current = [];
    if (longWaitTimer.current) {
      clearTimeout(longWaitTimer.current);
      longWaitTimer.current = null;
    }
  }, []);

  // Run extraction
  const runExtraction = useCallback(async () => {
    setErrorType(null);
    setErrorMessage(null);
    setShowLongWait(false);
    setProgressPhase(0);
    setContextualMessage(CONTEXTUAL_MESSAGES[0].text);

    // Set up contextual message rotation
    for (let i = 1; i < CONTEXTUAL_MESSAGES.length; i++) {
      const timer = setTimeout(() => {
        setContextualMessage(CONTEXTUAL_MESSAGES[i].text);
        setProgressPhase(i);
      }, CONTEXTUAL_MESSAGES[i].delay);
      messageTimers.current.push(timer);
    }

    // Set up long wait message
    longWaitTimer.current = setTimeout(() => {
      setShowLongWait(true);
      setProgressPhase(CONTEXTUAL_MESSAGES.length);
    }, LONG_WAIT_THRESHOLD);

    try {
      const res = await fetch("/api/v1/employee/snapshot/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "resume_upload" }),
      });

      clearTimers();

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const errCode = json?.error?.code ?? "";
        const errMsg = json?.error?.message ?? "";
        const type = classifyError(errCode, errMsg);
        setErrorType(type);
        setErrorMessage(
          type === "ocr"
            ? OCR_ERROR_MESSAGE
            : type === "language"
              ? LANGUAGE_ERROR_MESSAGE
              : errMsg || GENERIC_ERROR_MESSAGE
        );
        return;
      }

      // Success — transition to snapshot review
      router.replace("/onboarding/snapshot");
    } catch {
      clearTimers();
      setErrorType("generic");
      setErrorMessage(GENERIC_ERROR_MESSAGE);
    }
  }, [clearTimers, router]);

  // Start extraction on mount
  useEffect(() => {
    if (extractionStarted.current) return;
    extractionStarted.current = true;
    runExtraction();

    return () => {
      clearTimers();
    };
  }, [runExtraction, clearTimers]);

  // Retry handler
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await runExtraction();
    setRetrying(false);
  }, [runExtraction]);

  // Error state
  if (errorType) {
    return (
      <div className="flex min-h-screen flex-col bg-background animate-fade-in">
        <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
          <span className="text-h2 text-text-secondary">Waypointer</span>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-12">
          <div className="space-y-6 text-center">
            {/* Error icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
              <AlertCircle className="h-8 w-8 text-danger" />
            </div>

            <div className="space-y-2">
              <h1 className="text-h1 text-text-primary">
                {errorType === "ocr"
                  ? "Couldn\u2019t read your resume"
                  : errorType === "language"
                    ? "Language not supported"
                    : "Something went wrong"}
              </h1>
              <p className="text-body text-text-secondary">{errorMessage}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full rounded-sm"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? "Retrying..." : "Try again"}
              </Button>

              {(errorType === "ocr" || errorType === "language") && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-sm"
                  onClick={() => router.push("/onboarding/import")}
                >
                  Upload a different file
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/onboarding/snapshot")}
              >
                Add details manually
              </Button>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 pb-8 text-center">
          <p className="text-caption text-muted">Powered by Waypointer</p>
        </footer>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex min-h-screen flex-col bg-background animate-fade-in">
      <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
        <span className="text-h2 text-text-secondary">Waypointer</span>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-12">
        <div className="space-y-8">
          {/* Contextual message */}
          <div className="space-y-2 text-center">
            <h1 className="text-h1 text-text-primary transition-default">
              {contextualMessage}
            </h1>
            <p className="text-body text-text-secondary">
              {showLongWait
                ? LONG_WAIT_MESSAGE
                : ESTIMATED_TIME_MESSAGE}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mx-auto w-full max-w-md">
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: ["30%", "55%", "70%", "85%"][progressPhase] ?? "85%",
                  transition: "width 2s ease-out",
                }}
              />
            </div>
          </div>

          {/* Skeleton preview of what's being extracted */}
          <ExtractionSkeleton />
        </div>
      </main>

      <footer className="w-full px-6 pb-8 text-center">
        <p className="text-caption text-muted">Powered by Waypointer</p>
      </footer>
    </div>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────────

export default function ExtractingPage() {
  return (
    <EmployeeRoute>
      <ExtractingContent />
    </EmployeeRoute>
  );
}
