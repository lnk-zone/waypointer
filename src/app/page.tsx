import Link from "next/link";
import { Zap, Plug, Calendar, BarChart3, DollarSign } from "lucide-react";
import { WaypointerLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const proofPoints = [
  {
    icon: Zap,
    title: "Live in one day",
    body: "No implementation project. No IT tickets. You\u2019re sending invitations within 24 hours.",
  },
  {
    icon: Plug,
    title: "No integrations required",
    body: "No HRIS hookup needed. Upload a CSV, and your employees get immediate access.",
  },
  {
    icon: Calendar,
    title: "90-day guided support",
    body: "A structured transition path from day one through placement \u2014 not a one-time resource dump.",
  },
  {
    icon: BarChart3,
    title: "Employer dashboard included",
    body: "Track engagement and outcomes in real time, without ever seeing individual employee data.",
  },
  {
    icon: DollarSign,
    title: "A fraction of the cost",
    body: "Enterprise outplacement quality at a price point that lets you cover every departing employee.",
  },
] as const;

const steps = [
  {
    number: 1,
    title: "Upload your employee list",
    body: "Add employees by CSV or one at a time. Each receives a secure, personalized invitation.",
  },
  {
    number: 2,
    title: "Employees get AI-powered support",
    body: "Resume tailoring, job matching, LinkedIn optimization, and interview coaching \u2014 available instantly.",
  },
  {
    number: 3,
    title: "Track outcomes on your dashboard",
    body: "See engagement rates, interview readiness, and placement outcomes \u2014 all aggregated, never individual.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Section 1: Sticky Navbar */}
      <nav className="sticky top-0 z-50 h-16 border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <WaypointerLogo size={28} variant="full" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="link" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Section 2: Hero */}
      <section className="px-6 pb-24 pt-24 md:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            Career transition support for every employee — not just the C-suite.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary md:text-xl">
            Give departing employees immediate, AI-powered transition support — from resume
            rewrites and job matching to interview prep — at a price that lets you cover everyone.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 3: Proof Points */}
      <section id="features" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-center text-body-sm uppercase tracking-wider text-muted">
            Why companies choose Waypointer
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {proofPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-lg bg-surface p-6 shadow-sm"
              >
                <point.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-h3 font-bold text-text-primary">
                  {point.title}
                </h3>
                <p className="mt-2 text-body text-text-secondary">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="bg-surface px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-16 text-center text-h1 text-text-primary">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white md:mx-0">
                  {step.number}
                </div>
                <h3 className="mt-4 text-h2 text-text-primary">{step.title}</h3>
                <p className="mt-2 text-body text-text-secondary">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Footer CTA + Footer */}
      <section className="bg-primary px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold text-white">
            Ready to support your team?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Get your employees the career transition support they deserve.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="bg-white text-primary hover:bg-gray-100"
              size="lg"
            >
              <Link href="/login">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>
      <footer className="border-t border-white/20 bg-primary px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-sm text-white/60">&copy; 2026 Waypointer</span>
          <span className="text-sm text-white/60">getwaypointer.com</span>
        </div>
      </footer>
    </div>
  );
}
