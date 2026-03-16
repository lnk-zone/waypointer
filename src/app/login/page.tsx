"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WaypointerLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

interface FormErrors {
  email?: string;
  password?: string;
  full_name?: string;
  company_name?: string;
  general?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLoginForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!validateEmail(email)) {
    errors.email = "Please enter a valid email address";
  }
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  return errors;
}

function validateSignupForm(
  fullName: string,
  email: string,
  companyName: string,
  password: string
): FormErrors {
  const errors: FormErrors = {};
  if (!fullName.trim()) {
    errors.full_name = "Full name is required";
  }
  if (!email.trim()) {
    errors.email = "Work email is required";
  } else if (!validateEmail(email)) {
    errors.email = "Please enter a valid email address";
  }
  if (!companyName.trim()) {
    errors.company_name = "Company name is required";
  }
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  return errors;
}

const inputClassName =
  "w-full h-10 px-3 rounded-md border border-border bg-surface text-body text-text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-default disabled:opacity-50 disabled:cursor-not-allowed";

const labelClassName = "block text-body-sm font-medium text-text-primary mb-1.5";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setErrors({});
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateLoginForm(loginEmail, loginPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrors({
          general: body.error?.message || "An error occurred during sign in",
        });
        return;
      }

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token: body.data.access_token,
        refresh_token: body.data.refresh_token,
      });

      const role = body.data.role as string;
      if (role === "employer_admin") {
        router.push("/employer/dashboard");
      } else if (role === "employee") {
        router.push("/dashboard");
      } else if (role === "new_user") {
        router.push("/employer/setup");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateSignupForm(
      signupFullName,
      signupEmail,
      signupCompanyName,
      signupPassword
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: signupFullName,
          email: signupEmail,
          company_name: signupCompanyName,
          password: signupPassword,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setErrors({
          general: "An account with this email already exists",
        });
        return;
      }

      if (!res.ok) {
        setErrors({
          general: body.error?.message || "An error occurred during sign up",
        });
        return;
      }

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token: body.data.access_token,
        refresh_token: body.data.refresh_token,
      });

      router.push("/employer/setup");
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="mb-8">
        <WaypointerLogo variant="mark" size={40} />
      </div>

      <div className="bg-surface max-w-md w-full rounded-lg shadow-md p-8">
        {/* Tab Toggle */}
        <div className="flex border-b border-border mb-6">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 pb-3 text-body font-semibold transition-default ${
              mode === "login"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 pb-3 text-body font-semibold transition-default ${
              mode === "signup"
                ? "text-primary border-b-2 border-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Login Form */}
        {mode === "login" && (
          <form onSubmit={handleLogin} noValidate>
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="login-email" className={labelClassName}>
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-body-sm text-danger">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="login-password" className={labelClassName}>
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-body-sm text-danger">{errors.password}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? "Signing in..." : "Log in"}
            </Button>

            {errors.general && (
              <p className="text-body-sm text-danger text-center mt-4">
                {errors.general}
              </p>
            )}

            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-body-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} noValidate>
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="signup-fullname" className={labelClassName}>
                  Full name
                </label>
                <input
                  id="signup-fullname"
                  type="text"
                  placeholder="Jane Smith"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="name"
                />
                {errors.full_name && (
                  <p className="text-body-sm text-danger">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-email" className={labelClassName}>
                  Work email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-body-sm text-danger">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-company" className={labelClassName}>
                  Company name
                </label>
                <input
                  id="signup-company"
                  type="text"
                  placeholder="Acme Inc."
                  value={signupCompanyName}
                  onChange={(e) => setSignupCompanyName(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="organization"
                />
                {errors.company_name && (
                  <p className="text-body-sm text-danger">
                    {errors.company_name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-password" className={labelClassName}>
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-body-sm text-danger">{errors.password}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? "Creating account..." : "Create employer account"}
            </Button>

            {errors.general && (
              <p className="text-body-sm text-danger text-center mt-4">
                {errors.general}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Bottom note */}
      {mode === "login" ? (
        <p className="text-center text-body-sm text-text-secondary mt-6">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => switchMode("signup")}
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </button>
        </p>
      ) : (
        <p className="text-center text-body-sm text-text-secondary mt-6">
          Already have an account?{" "}
          <button
            onClick={() => switchMode("login")}
            className="text-primary font-medium hover:underline"
          >
            Log in
          </button>
        </p>
      )}
    </div>
  );
}
