"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Briefcase,
  Send,
  Mic,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", Icon: Home },
  { label: "Resumes", href: "/resumes", Icon: FileText },
  { label: "Jobs", href: "/jobs", Icon: Briefcase },
  { label: "Outreach", href: "/outreach", Icon: Send },
  { label: "Interviews", href: "/interviews", Icon: Mic },
  { label: "Progress", href: "/progress", Icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-surface border-r border-border",
        "w-16 md:w-[240px]",
        "transition-default"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 md:px-6 border-b border-border">
        <span className="hidden md:block text-[17px] font-semibold text-primary">
          Waypointer
        </span>
        <span className="block md:hidden text-[17px] font-semibold text-primary">
          W
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 md:px-3 space-y-1">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default",
                "md:px-3 justify-center md:justify-start",
                isActive
                  ? "bg-[#DBEAFE] text-primary border-l-2 border-primary"
                  : "text-text-secondary hover:bg-background hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="hidden md:block text-xs text-muted">
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
      <main className="flex-1 ml-16 md:ml-[240px] transition-default">
        {children}
      </main>
    </div>
  );
}
