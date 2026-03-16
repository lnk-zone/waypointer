import Link from "next/link";
import {
  Target,
  FileText,
  Linkedin,
  Search,
  MessageSquare,
  Mic,
  CalendarCheck,
  Rocket,
  DollarSign,
  BarChart3,
  Palette,
  Eye,
  Building2,
  Users,
  RefreshCw,
  Shield,
  Zap,
  LinkIcon,
} from "lucide-react";
import { WaypointerLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/landing/faq-accordion";

const employeeFeatures = [
  {
    icon: Target,
    title: "Role targeting",
    body: "Identify the most realistic, highest-fit next roles.",
  },
  {
    icon: FileText,
    title: "Resume rebuilding",
    body: "Generate tailored resume versions for different target paths.",
  },
  {
    icon: Linkedin,
    title: "LinkedIn optimization",
    body: "Refresh headlines, summaries, and positioning fast.",
  },
  {
    icon: Search,
    title: "Job search guidance",
    body: "Review relevant opportunities with fit-based recommendations.",
  },
  {
    icon: MessageSquare,
    title: "Outreach support",
    body: "Draft better messages to recruiters, hiring managers, and referrals.",
  },
  {
    icon: Mic,
    title: "Interview practice",
    body: "Prepare through realistic mock interviews and instant feedback.",
  },
  {
    icon: CalendarCheck,
    title: "Weekly action plans",
    body: "Turn overwhelm into structure with clear next steps.",
  },
] as const;

const employerFeatures = [
  {
    icon: Rocket,
    title: "Fast deployment",
    body: "Launch quickly with no heavy implementation burden.",
  },
  {
    icon: DollarSign,
    title: "Affordable per-seat model",
    body: "Support more employees for a fraction of traditional outplacement cost.",
  },
  {
    icon: BarChart3,
    title: "Employer dashboard",
    body: "Track activations, engagement, and overall program usage.",
  },
  {
    icon: Palette,
    title: "Branded experience",
    body: "Offer support in a way that reflects your company\u2019s values.",
  },
  {
    icon: Eye,
    title: "Outcome visibility",
    body: "See whether employees are using the tools designed to help them move forward.",
  },
] as const;

const howItWorks = [
  {
    step: 1,
    title: "Import career history",
    body: "Employees upload a resume or import their LinkedIn profile. Waypointer analyzes their experience and transferable skills.",
  },
  {
    step: 2,
    title: "Define target roles",
    body: "The platform recommends strongest-fit role paths based on background, strengths, and market direction.",
  },
  {
    step: 3,
    title: "Rebuild materials",
    body: "Tailored resume versions, LinkedIn rewrites, and clear positioning for each target path.",
  },
  {
    step: 4,
    title: "Pursue opportunities",
    body: "Relevant job matches, application kits, outreach drafts, and structured weekly action plans.",
  },
  {
    step: 5,
    title: "Practice & improve",
    body: "Mock interviews and AI feedback to sharpen answers and build confidence.",
  },
] as const;

const useCases = [
  {
    icon: Building2,
    title: "Company-wide layoffs",
    body: "Give every affected employee meaningful transition support, not just a resource sheet.",
  },
  {
    icon: Users,
    title: "Department restructures",
    body: "Support targeted groups quickly and consistently with a ready-to-launch platform.",
  },
  {
    icon: RefreshCw,
    title: "Ongoing workforce changes",
    body: "Make transition support a repeatable part of your offboarding process.",
  },
  {
    icon: Shield,
    title: "Employer brand protection",
    body: "Show departing employees — and remaining ones — that your company handles hard moments with care.",
  },
] as const;

const faqs = [
  {
    q: "Is Waypointer a job application bot?",
    a: "No. Waypointer does not mass-apply to jobs on behalf of employees. It helps users run a higher-quality, more focused search by improving materials, guiding targeting, drafting outreach, and supporting interview prep.",
  },
  {
    q: "Who is Waypointer for?",
    a: "Waypointer is built for employers who want to offer practical transition support to laid-off or departing employees, especially beyond the executive tier.",
  },
  {
    q: "Does this replace traditional outplacement?",
    a: "For many employee groups, Waypointer can serve as a more scalable and affordable alternative. Some companies may also use it alongside higher-touch services for senior leaders.",
  },
  {
    q: "How quickly can we launch?",
    a: "Waypointer is designed for fast setup so teams can move quickly when workforce changes happen. Most companies are up and running within days.",
  },
  {
    q: "Do you require HRIS or ATS integrations?",
    a: "No heavy integrations are required for initial deployment. Simple CSV upload gets your employees access immediately.",
  },
  {
    q: "What do employers see in reporting?",
    a: "Employers get program-level visibility into activations, engagement, and usage trends. Individual-sensitive outcomes are handled with employee consent and privacy in mind.",
  },
] as const;

const comparisonRows = [
  { feature: "Eligibility", traditional: "Executives only", waypointer: "Every employee" },
  { feature: "Response time", traditional: "Days to weeks", waypointer: "Immediate / Instant" },
  { feature: "Resume support", traditional: "One-time review", waypointer: "Unlimited AI tailoring" },
  { feature: "Interview prep", traditional: "Limited coaching", waypointer: "Unlimited AI mock interviews" },
  { feature: "Scalability", traditional: "Hard to roll out broadly", waypointer: "Built for broad rollout" },
  { feature: "Cost per seat", traditional: "$2,500+", waypointer: "A fraction of the cost" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6f6f8] text-slate-900 antialiased">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <WaypointerLogo size={28} variant="full" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">How it Works</Link>
            <Link href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">Pricing</Link>
            <Link href="/login" className="border-l border-slate-200 pl-8 text-sm font-medium text-slate-600 transition-colors hover:text-primary">Login</Link>
            <Button size="sm" asChild>
              <Link href="/login">Book a Demo</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-3 md:hidden">
            <Button size="sm" asChild>
              <Link href="/login">Book a Demo</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-16 pb-12 lg:pt-28 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-[3.5rem]">
                Outplacement support for every employee,{" "}
                <span className="text-primary">not just executives.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Waypointer gives departing employees immediate AI-powered transition
                support — from resume rebuilding and LinkedIn rewrites to targeted job
                search guidance and interview prep — at a price companies can actually
                roll out broadly.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="rounded-lg" asChild>
                  <Link href="/login">Book a demo</Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-lg" asChild>
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>
            </div>
            {/* Hero visual — abstract dashboard preview */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  {/* Simulated dashboard chrome */}
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                    <div className="h-3 w-3 rounded-full bg-red-300" />
                    <div className="h-3 w-3 rounded-full bg-yellow-300" />
                    <div className="h-3 w-3 rounded-full bg-green-300" />
                    <div className="ml-4 h-5 w-48 rounded bg-slate-100" />
                  </div>
                  <div className="p-6">
                    {/* Mini sidebar + content */}
                    <div className="flex gap-6">
                      <div className="w-32 shrink-0 space-y-3">
                        <div className="h-4 w-20 rounded bg-primary/20" />
                        <div className="h-3 w-24 rounded bg-slate-100" />
                        <div className="h-3 w-16 rounded bg-slate-100" />
                        <div className="h-3 w-20 rounded bg-slate-100" />
                        <div className="h-3 w-12 rounded bg-slate-100" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="h-5 w-40 rounded bg-slate-200" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg bg-primary/10 p-3">
                            <div className="mb-1 h-3 w-12 rounded bg-primary/30" />
                            <div className="h-6 w-8 rounded bg-primary/40" />
                          </div>
                          <div className="rounded-lg bg-green-50 p-3">
                            <div className="mb-1 h-3 w-12 rounded bg-green-200" />
                            <div className="h-6 w-8 rounded bg-green-300" />
                          </div>
                          <div className="rounded-lg bg-amber-50 p-3">
                            <div className="mb-1 h-3 w-12 rounded bg-amber-200" />
                            <div className="h-6 w-8 rounded bg-amber-300" />
                          </div>
                        </div>
                        <div className="h-24 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                        <div className="space-y-2">
                          <div className="h-3 w-full rounded bg-slate-100" />
                          <div className="h-3 w-4/5 rounded bg-slate-100" />
                          <div className="h-3 w-3/5 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Strip ─── */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Zap className="h-5 w-5 text-primary" />
              Deploy in days
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <LinkIcon className="h-5 w-5 text-primary" />
              No heavy integrations
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Users className="h-5 w-5 text-primary" />
              Built for People Ops
            </div>
          </div>
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section className="bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
            Most laid-off employees get a goodbye email. Maybe a severance package.{" "}
            <span className="text-danger">Rarely real support.</span>
          </h2>
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <p className="text-lg leading-relaxed text-slate-600 md:text-xl">
              Traditional outplacement is usually reserved for executives and senior
              leaders because it&apos;s too expensive to offer broadly. That leaves most
              employees navigating one of the hardest moments of their career
              alone — rewriting resumes, updating LinkedIn, figuring out what roles to
              target, and preparing for interviews under stress.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl">
              Employers feel that gap too. They want to support people well, protect
              employer brand, and show the rest of the company that difficult exits are
              still handled with care. But the usual options are too costly, too manual,
              or too limited to scale.
            </p>
            <div className="mt-8 inline-block rounded-full bg-primary/10 px-6 py-3 text-lg font-bold text-primary">
              Waypointer closes that gap.
            </div>
          </div>
        </div>
      </section>

      {/* ─── What Waypointer Is ─── */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
              AI-powered transition support employees can use immediately
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
              Waypointer helps laid-off employees regain momentum fast. Each user gets
              a guided transition experience — not an application bot, but a practical
              platform that helps people run a better, more focused job search.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: FileText, title: "Resume Rebuilding", body: "AI-optimized resumes tailored to specific roles and target paths automatically." },
              { icon: Linkedin, title: "LinkedIn Optimization", body: "Complete profile rewrites that highlight key achievements and attract recruiters." },
              { icon: Mic, title: "Interview Prep", body: "Unlimited AI mock interviews with feedback on answers, delivery, and confidence." },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-8 transition-all hover:border-primary/20 hover:shadow-md">
                <card.icon className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-xl font-bold">{card.title}</h3>
                <p className="text-slate-600">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="bg-[#f6f6f8] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-20 text-center text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            A better path from layoff to next role
          </h2>
          <div className="relative">
            {/* Horizontal progress line (desktop) */}
            <div className="absolute left-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 bg-primary/10 lg:block" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {howItWorks.map((item) => (
                <div key={item.step} className="relative z-10 rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white shadow-md shadow-primary/20">
                    {item.step}
                  </div>
                  <h4 className="mb-2 text-lg font-bold">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Benefits: Employees + Employers side by side ─── */}
      <section id="features" className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-16 lg:grid-cols-2">
            {/* For Employees */}
            <div className="space-y-6">
              <h3 className="flex items-center gap-3 text-2xl font-bold text-primary">
                <Users className="h-6 w-6" />
                For Employees
              </h3>
              <p className="text-slate-600">
                Everything a departing employee needs to get moving again.
              </p>
              <div className="space-y-4">
                {employeeFeatures.map((feat) => (
                  <div
                    key={feat.title}
                    className="flex gap-4 rounded-2xl border-l-4 border-primary bg-slate-50 p-5"
                  >
                    <feat.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h4 className="font-bold">{feat.title}</h4>
                      <p className="mt-0.5 text-sm text-slate-600">{feat.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Employers */}
            <div className="space-y-6">
              <h3 className="flex items-center gap-3 text-2xl font-bold text-primary">
                <Building2 className="h-6 w-6" />
                For Employers
              </h3>
              <p className="text-slate-600">
                Support employees at scale — without executive-outplacement pricing.
              </p>
              <div className="space-y-4">
                {employerFeatures.map((feat) => (
                  <div
                    key={feat.title}
                    className="flex gap-4 rounded-2xl border-l-4 border-primary bg-slate-50 p-5"
                  >
                    <feat.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h4 className="font-bold">{feat.title}</h4>
                      <p className="mt-0.5 text-sm text-slate-600">{feat.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why This Matters ─── */}
      <section className="bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
            Because how people leave your company still shapes how people talk about it
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-slate-600">
            Layoffs are never easy. But the support employees receive afterward
            affects more than just the individuals leaving. It shapes morale inside
            the company, brand perception outside it, and how leadership is remembered
            during difficult moments.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Waypointer helps employers offer something practical, immediate, and
            dignified — not just to a select few, but to everyone who needs it.
          </p>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-16 text-center text-3xl font-bold text-slate-900">
            Why teams choose Waypointer over traditional outplacement
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-5 text-sm font-bold lg:p-6 lg:text-base">Feature</th>
                  <th className="border-l border-slate-700 p-5 text-sm font-bold lg:p-6 lg:text-base">Traditional</th>
                  <th className="border-l border-slate-700 bg-primary p-5 text-sm font-bold lg:p-6 lg:text-base">Waypointer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="p-5 font-medium text-slate-900 lg:p-6">{row.feature}</td>
                    <td className="p-5 italic text-slate-500 lg:p-6">{row.traditional}</td>
                    <td className="p-5 font-bold text-primary lg:p-6">{row.waypointer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="bg-[#f6f6f8] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-16 text-center text-3xl font-bold text-slate-900">
            Built for the moments HR teams need support most
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <uc.icon className="h-6 w-6" />
                </div>
                <h4 className="mb-3 font-bold">{uc.title}</h4>
                <p className="text-sm text-slate-600">{uc.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Teaser ─── */}
      <section id="pricing" className="rounded-t-[3rem] bg-slate-900 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Practical pricing for broad rollout
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-slate-400">
            Traditional outplacement is priced to be exclusive. Waypointer is priced
            to be inclusive. Simple per-seat pricing based on seats and support
            duration — designed for fast approval and fast deployment.
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              asChild
              className="rounded-xl bg-primary px-10 py-5 text-lg font-bold shadow-xl hover:bg-primary/90"
            >
              <Link href="/login">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-16 text-center text-3xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
          <FaqAccordion faqs={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative overflow-hidden bg-primary py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-primary/20 backdrop-blur-3xl" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center text-white">
          <h2 className="text-4xl font-black md:text-5xl">
            Give every departing employee a better next step
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl opacity-90">
            Waypointer helps companies offer fast, practical, and scalable transition
            support when it matters most.
          </p>
          <div className="mt-12 flex flex-col justify-center gap-6 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="rounded-2xl bg-white px-10 py-5 text-lg font-bold text-primary shadow-2xl hover:bg-gray-50"
            >
              <Link href="/login">Book a demo</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-2xl border-2 border-white/20 bg-transparent px-10 py-5 text-lg font-bold text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 md:flex-row">
          <WaypointerLogo size={24} variant="full" />
          <div className="flex gap-8 text-sm font-medium text-slate-500">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
          <span className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Waypointer. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
