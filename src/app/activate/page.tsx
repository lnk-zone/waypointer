"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WaypointerLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

type ActivateState = "form" | "submitting" | "success" | "error" | "no-token";

/**
 * Decode a JWT payload without verifying signature.
 * Server-side verification happens when the token is submitted.
 */
function decodeTokenPayload(token: string): { email?: string; seat_id?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<ActivateState>(token ? "form" : "no-token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Decode token to pre-fill email
  useEffect(() => {
    if (!token) return;
    const payload = decodeTokenPayload(token);
    if (payload?.email) {
      setEmail(payload.email);
    }
  }, [token]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!validate()) return;

    setState("submitting");

    try {
      const res = await fetch("/api/v1/employee/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seat_token: token,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        // Set the auth session
        if (data?.auth_token) {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
        }

        setState("success");
        setTimeout(() => router.push("/welcome"), 1500);
      } else {
        setState("form");
        setErrorMessage(
          data?.error?.message ?? "Activation failed. Please try again."
        );
      }
    } catch {
      setState("form");
      setErrorMessage("Something went wrong. Please check your connection and try again.");
    }
  }

  // No token provided
  if (state === "no-token") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <WaypointerLogo size={48} variant="mark" />
        <h1 className="text-2xl font-semibold text-gray-900 mt-6">Invalid Activation Link</h1>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
          This link is missing an activation token. Please use the link from your invitation email.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mt-6">You&apos;re all set!</h1>
        <p className="text-sm text-gray-500 mt-2">Redirecting to your dashboard...</p>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <WaypointerLogo size={48} variant="mark" />
          <h1 className="text-2xl font-semibold text-gray-900 mt-6">
            Create your account
          </h1>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Set up your password to access your career transition tools.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={cn(
                "w-full px-3 py-2 border rounded-md text-sm bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                fieldErrors.email ? "border-red-300" : "border-gray-300"
              )}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Create password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                className={cn(
                  "w-full px-3 py-2 pr-10 border rounded-md text-sm bg-white transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  fieldErrors.password ? "border-red-300" : "border-gray-300"
                )}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={cn(
                "w-full px-3 py-2 border rounded-md text-sm bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                fieldErrors.confirmPassword ? "border-red-300" : "border-gray-300"
              )}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={state === "submitting"}
          >
            {state === "submitting" ? "Creating your account..." : "Create account"}
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
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
