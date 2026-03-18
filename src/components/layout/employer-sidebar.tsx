"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WaypointerLogo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

const EMPLOYER_NAV_ITEMS = [
  { label: "Overview", href: "/employer/dashboard", Icon: LayoutDashboard },
  { label: "Invitations", href: "/employer/invite", Icon: Users },
  { label: "Programs", href: "/employer/programs", Icon: FolderOpen },
  { label: "Reporting", href: "/employer/outcomes", Icon: BarChart3 },
  { label: "Billing", href: "/employer/billing", Icon: CreditCard },
  { label: "Settings", href: "/employer/settings", Icon: Settings },
] as const;

export function EmployerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
        <span className="hidden lg:block ml-2 text-[10px] font-medium text-text-secondary bg-gray-100 rounded px-1.5 py-0.5">
          Admin
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 lg:px-3 space-y-1">
        {EMPLOYER_NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default",
                "lg:px-3 justify-center lg:justify-start",
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

      {/* Logout + Footer */}
      <div className="border-t border-border px-2 lg:px-3 py-3 space-y-2">
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
          Waypointer Admin
        </p>
      </div>
    </aside>
  );
}

/**
 * Employer dashboard layout wrapper.
 */
export function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <EmployerSidebar />
      <main className="flex-1 ml-16 lg:ml-[240px] transition-default animate-fade-in">
        {children}
      </main>
    </div>
  );
}
