"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WaypointerLogo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  FileText,
  Linkedin,
  Briefcase,
  Send,
  Mic,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Resumes", href: "/resumes", Icon: FileText },
  { label: "LinkedIn", href: "/linkedin", Icon: Linkedin },
  { label: "Jobs", href: "/jobs", Icon: Briefcase },
  { label: "Outreach", href: "/outreach", Icon: Send },
  { label: "Interviews", href: "/interviews", Icon: Mic },
  { label: "Progress", href: "/progress", Icon: BarChart3 },
] as const;

// ─── Readiness Ring ────────────────────────────────────────────────────

function ReadinessRing({ score, size = 44 }: { score: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563EB"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-text-primary">
          {score}%
        </span>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchReadiness() {
      try {
        const res = await fetch("/api/v1/employee/progress");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && typeof json?.data?.readiness_score === "number") {
          setReadinessScore(json.data.readiness_score);
        }
      } catch {
        // Silently fail — show 0%
      }
    }

    fetchReadiness();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-surface border-r border-border",
        "w-16 lg:w-[240px]",
        "transition-default"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 lg:px-6 border-b border-border">
        <span className="hidden lg:block">
          <WaypointerLogo size={28} variant="full" />
        </span>
        <span className="block lg:hidden">
          <WaypointerLogo size={28} variant="mark" />
        </span>
      </div>

      {/* Readiness Score */}
      <Link
        href="/progress"
        className={cn(
          "flex flex-col items-center py-3 border-b border-border",
          "hover:scale-105 transition-transform duration-200 ease-out",
          "lg:flex-row lg:gap-3 lg:px-6"
        )}
      >
        <ReadinessRing score={readinessScore} />
        <span className="hidden lg:block text-xs font-medium text-text-secondary mt-0 lg:mt-0">
          Readiness
        </span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 lg:px-3 space-y-1">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default",
                "justify-center lg:justify-start",
                isActive
                  ? "bg-primary-light text-primary border-l-2 border-primary"
                  : "text-text-secondary hover:bg-background hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings + Logout + Footer */}
      <div className="border-t border-border px-2 lg:px-3 py-3 space-y-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default w-full",
            "justify-center lg:justify-start",
            pathname === "/settings"
              ? "bg-primary-light text-primary border-l-2 border-primary"
              : "text-text-secondary hover:bg-background hover:text-text-primary"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="hidden lg:block">Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default w-full",
            "justify-center lg:justify-start",
            "text-text-secondary hover:bg-red-50 hover:text-red-600",
            loggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden lg:block">
            {loggingOut ? "Signing out..." : "Sign Out"}
          </span>
        </button>
        <p className="hidden lg:block text-xs text-muted px-3">
          Powered by Waypointer
        </p>
      </div>
    </aside>
  );
}

/**
 * Dashboard layout wrapper. Places the sidebar and provides
 * the correct left margin for the main content area.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-16 lg:ml-[240px] transition-default animate-fade-in">
        {children}
      </main>
    </div>
  );
}
