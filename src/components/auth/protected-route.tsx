"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { WaypointerLogo } from "@/components/brand/logo";

type UserRole = "employee" | "employer_admin" | "new_user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Wraps pages that require authentication and a specific role.
 * Redirects unauthenticated users to /login.
 * Redirects users with the wrong role to their correct dashboard.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { setUser, setLoading, isLoading } = useAuthStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      setLoading(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setLoading(false);
        router.replace("/login");
        return;
      }

      setUser(user);

      // Check role via /api/v1/auth/me
      try {
        const res = await fetch("/api/v1/auth/me", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          setUser(null);
          setLoading(false);
          router.replace("/login");
          return;
        }

        const data = await res.json();

        if (!allowedRoles.includes(data.role)) {
          // Redirect to the correct dashboard
          if (data.role === "employee") {
            router.replace("/dashboard");
          } else if (data.role === "employer_admin") {
            router.replace("/employer/dashboard");
          } else if (data.role === "new_user") {
            router.replace("/employer/setup");
          }
          setLoading(false);
          return;
        }

        setAuthorized(true);
      } catch {
        setUser(null);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [allowedRoles, router, setUser, setLoading]);

  if (isLoading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-logo-pulse">
          <WaypointerLogo size={48} variant="mark" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Wrapper for employee-only pages.
 */
export function EmployeeRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["employee"]}>{children}</ProtectedRoute>
  );
}

/**
 * Wrapper for employer admin-only pages.
 */
export function EmployerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["employer_admin"]}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Wrapper for employer setup page — allows both new users and existing admins.
 */
export function EmployerSetupRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["employer_admin", "new_user"]}>
      {children}
    </ProtectedRoute>
  );
}
