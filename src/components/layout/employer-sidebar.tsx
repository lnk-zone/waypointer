"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

const EMPLOYER_NAV_ITEMS = [
  { label: "Overview", href: "/employer/dashboard", Icon: LayoutDashboard },
  { label: "Employees", href: "/employer/employees", Icon: Users },
  { label: "Program", href: "/employer/program", Icon: Settings },
  { label: "Reporting", href: "/employer/outcomes", Icon: BarChart3 },
  { label: "Billing", href: "/employer/billing", Icon: CreditCard },
] as const;

export function EmployerSidebar() {
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
        <span className="hidden md:block ml-2 text-[10px] font-medium text-text-secondary bg-gray-100 rounded px-1.5 py-0.5">
          Admin
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 md:px-3 space-y-1">
        {EMPLOYER_NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-default",
                "md:px-3 justify-center md:justify-start",
                isActive
                  ? "bg-primary-light text-primary border-l-2 border-primary"
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
      <main className="flex-1 ml-16 md:ml-[240px] transition-default">
        {children}
      </main>
    </div>
  );
}
