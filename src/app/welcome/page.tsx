"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WelcomeData {
  company_name: string;
  logo_url: string | null;
  brand_color: string | null;
  welcome_message: string | null;
  program_name: string;
}

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

function WelcomeContent() {
  const router = useRouter();
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWelcomeData() {
      try {
        const res = await fetch("/api/v1/employee/welcome");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        } else if (res.status === 401 || res.status === 403) {
          router.replace("/login");
          return;
        }
      } catch {
        // Non-blocking — page renders without employer branding
      } finally {
        setLoading(false);
      }
    }

    fetchWelcomeData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-lg space-y-8 px-6">
          <div className={cn("mx-auto h-10 w-32", SKELETON_CLASS)} />
          <div className={cn("mx-auto h-11 w-80", SKELETON_CLASS)} />
          <div className={cn("mx-auto h-5 w-64", SKELETON_CLASS)} />
          <div className="space-y-3">
            <div className={cn("mx-auto h-4 w-72", SKELETON_CLASS)} />
            <div className={cn("mx-auto h-4 w-64", SKELETON_CLASS)} />
            <div className={cn("mx-auto h-4 w-56", SKELETON_CLASS)} />
          </div>
          <div className={cn("mx-auto h-10 w-64 rounded-sm", SKELETON_CLASS)} />
        </div>
      </div>
    );
  }

  const brandColor = data?.brand_color ?? null;

  const bulletItems = [
    "Upload your resume and we\u2019ll extract your career highlights",
    "Review your career snapshot and confirm what matters most",
    "Get three tailored role paths based on your experience",
    "Receive your personalized transition plan",
  ];

  return (
    <div className="flex min-h-screen flex-col items-center bg-background animate-fade-in">
      {/* Header with employer logo */}
      <header className="flex w-full items-center justify-center px-6 pt-12 pb-8">
        {data?.logo_url ? (
          <Image
            src={data.logo_url}
            alt={`${data.company_name} logo`}
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        ) : (
          <span className="text-h2 text-text-secondary">
            {data?.company_name || "Waypointer"}
          </span>
        )}
      </header>

      {/* Main content — spacious and centered */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-lg space-y-10 text-center">
          {/* Headline — Display size per MP §11 */}
          <h1 className="text-display text-text-primary">
            Let&apos;s get you moving again.
          </h1>

          {/* Employer custom welcome message */}
          {data?.welcome_message && (
            <p className="text-body text-text-secondary">
              {data.welcome_message}
            </p>
          )}

          {/* What you'll accomplish */}
          <div className="space-y-4">
            <p className="text-body-sm text-muted uppercase tracking-wider">
              In your first session, you&apos;ll:
            </p>
            <ul className="space-y-3 text-left">
              {bulletItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                      !brandColor && "bg-primary"
                    )}
                    style={brandColor ? { backgroundColor: brandColor } : undefined}
                  />
                  <span className="text-body text-text-primary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Estimated time */}
          <p className="text-body-sm text-muted">
            Estimated time: 15–20 minutes
          </p>

          {/* CTA button */}
          <div className="pt-2">
            <Button
              size="lg"
              className={cn("w-full rounded-sm sm:w-auto")}
              style={brandColor ? { backgroundColor: brandColor } : undefined}
              onClick={() => router.push("/onboarding/import")}
            >
              Start your transition plan
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 pb-8 text-center">
        <p className="text-caption text-muted">Powered by Waypointer</p>
      </footer>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <EmployeeRoute>
      <WelcomeContent />
    </EmployeeRoute>
  );
}
