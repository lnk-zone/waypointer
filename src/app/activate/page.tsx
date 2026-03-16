"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WaypointerLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ActivateState = "activating" | "success" | "error";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<ActivateState>("activating");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("No activation token provided.");
      return;
    }

    async function activate() {
      try {
        const res = await fetch("/api/v1/employee/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setState("success");
          const data = await res.json();
          if (data.access_token) {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
          }
          setTimeout(() => router.push("/welcome"), 1500);
        } else {
          const data = await res.json().catch(() => null);
          setState("error");
          setErrorMessage(
            data?.error?.message ?? "Activation failed. The link may have expired."
          );
        }
      } catch {
        setState("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    }

    activate();
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 animate-fade-in">
      <div className={state === "activating" ? "animate-logo-pulse" : ""}>
        <WaypointerLogo size={48} variant="mark" />
      </div>

      <h1 className="text-h1 text-text-primary mt-6">Welcome to Waypointer</h1>

      {state === "activating" && (
        <p className="text-body text-text-secondary mt-2">Setting up your account...</p>
      )}

      {state === "success" && (
        <p className="text-body text-success mt-2">You&apos;re all set! Redirecting...</p>
      )}

      {state === "error" && (
        <div className="mt-4 text-center space-y-4">
          <p className="text-body text-danger">{errorMessage}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/login">Go to login</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="animate-logo-pulse">
            <WaypointerLogo size={48} variant="mark" />
          </div>
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
