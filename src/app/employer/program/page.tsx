"use client";

/**
 * Program Settings — Screen E2
 *
 * Employer configures their transition program: name, seats, duration,
 * branded toggle, module toggles, custom intro message, and tier.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { programSchema } from "@/lib/validators/program";
import {
  CheckCircle2,
  Crown,
  MessageSquare,
  Mic,
  Send,
  Settings,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type ProgramTier = "standard" | "plus" | "premium";

interface FormState {
  name: string;
  tier: ProgramTier;
  total_seats: number;
  access_duration_days: number;
  is_branded: boolean;
  custom_intro_message: string;
  interview_coaching_enabled: boolean;
  outreach_builder_enabled: boolean;
}

interface FormErrors {
  name?: string;
  total_seats?: string;
  access_duration_days?: string;
}

// ─── Validators ───────────────────────────────────────────────────────

function validateForm(form: FormState): FormErrors {
  const result = programSchema.safeParse(form);
  if (result.success) return {};

  const fieldErrors = result.error.flatten().fieldErrors;
  const errors: FormErrors = {};

  if (fieldErrors.name?.[0]) errors.name = fieldErrors.name[0];
  if (fieldErrors.total_seats?.[0]) errors.total_seats = fieldErrors.total_seats[0];
  if (fieldErrors.access_duration_days?.[0])
    errors.access_duration_days = fieldErrors.access_duration_days[0];

  return errors;
}

// ─── Constants ────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  ProgramTier,
  { label: string; description: string; color: string; bgColor: string }
> = {
  standard: {
    label: "Standard",
    description: "Core career transition tools",
    color: "text-text-primary",
    bgColor: "bg-gray-100",
  },
  plus: {
    label: "Plus",
    description: "Enhanced coaching and outreach",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  premium: {
    label: "Premium",
    description: "Full suite with all modules",
    color: "text-[#D97706]",
    bgColor: "bg-[#D97706]/10",
  },
};

// ─── Program Form ─────────────────────────────────────────────────────

function ProgramForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    tier: "standard",
    total_seats: 10,
    access_duration_days: 90,
    is_branded: true,
    custom_intro_message: "",
    interview_coaching_enabled: true,
    outreach_builder_enabled: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateForm(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        const res = await fetch("/api/v1/employer/program", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            tier: form.tier,
            total_seats: form.total_seats,
            access_duration_days: form.access_duration_days,
            is_branded: form.is_branded,
            custom_intro_message: form.custom_intro_message.trim(),
            interview_coaching_enabled: form.interview_coaching_enabled,
            outreach_builder_enabled: form.outreach_builder_enabled,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ?? "Failed to create program"
          );
        }

        router.push("/employer/invite");
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to create program"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, router]
  );

  const currentTier = TIER_CONFIG[form.tier];

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Program Settings
        </h1>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          Configure your transition program. You can adjust these settings later.
        </p>
      </div>

      <div className="space-y-6">
        {/* Program Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Program Name *
          </label>
          <Input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Q1 2026 Restructuring"
            className={cn(errors.name && "border-[#DC2626]")}
          />
          {errors.name && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.name}</p>
          )}
        </div>

        {/* Tier Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            <span className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Package Tier
            </span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["standard", "plus", "premium"] as const).map((tier) => {
              const config = TIER_CONFIG[tier];
              const isSelected = form.tier === tier;

              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => updateField("tier", tier)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-default",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-[10px] text-text-secondary">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-text-secondary mt-1">
            Currently on{" "}
            <span className={cn("font-medium", currentTier.color)}>
              {currentTier.label}
            </span>{" "}
            plan
          </p>
        </div>

        {/* Seat Count */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Number of Seats *
            </span>
          </label>
          <Input
            type="number"
            value={form.total_seats}
            onChange={(e) =>
              updateField(
                "total_seats",
                Math.max(1, parseInt(e.target.value) || 1)
              )
            }
            min={1}
            max={10000}
            className={cn(errors.total_seats && "border-[#DC2626]")}
          />
          {errors.total_seats && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.total_seats}</p>
          )}
          <p className="text-[10px] text-text-secondary mt-1">
            Number of employees who can access the program
          </p>
        </div>

        {/* Access Duration */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Access Duration (days)
          </label>
          <Input
            type="number"
            value={form.access_duration_days}
            onChange={(e) =>
              updateField(
                "access_duration_days",
                Math.max(7, Math.min(365, parseInt(e.target.value) || 90))
              )
            }
            min={7}
            max={365}
            className={cn(errors.access_duration_days && "border-[#DC2626]")}
          />
          {errors.access_duration_days && (
            <p className="text-xs text-[#DC2626] mt-1">
              {errors.access_duration_days}
            </p>
          )}
          <p className="text-[10px] text-text-secondary mt-1">
            How long each employee has access from activation (7–365 days)
          </p>
        </div>

        {/* Branded Toggle */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Branded Experience
              </label>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Show your company logo and brand colors to employees
              </p>
            </div>
            <Switch
              checked={form.is_branded}
              onCheckedChange={(checked) => updateField("is_branded", checked)}
            />
          </div>
        </div>

        {/* Module Toggles */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Module Settings
          </label>
          <div className="space-y-3">
            {/* Interview Coaching */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Interview Coaching
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      AI-powered mock interviews and feedback
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.interview_coaching_enabled}
                  onCheckedChange={(checked) =>
                    updateField("interview_coaching_enabled", checked)
                  }
                />
              </div>
            </div>

            {/* Outreach Builder */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Outreach Builder
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      AI-generated networking and outreach messages
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.outreach_builder_enabled}
                  onCheckedChange={(checked) =>
                    updateField("outreach_builder_enabled", checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom Intro Message */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Custom Intro Message
            </span>
          </label>
          <Textarea
            value={form.custom_intro_message}
            onChange={(e) =>
              updateField("custom_intro_message", e.target.value)
            }
            placeholder="Welcome to your career transition program. We're here to support you every step of the way..."
            rows={4}
            className="resize-none"
          />
          <p className="text-[10px] text-text-secondary mt-1">
            Shown to employees when they start the program.
            {form.custom_intro_message.length > 0 && (
              <> &middot; {form.custom_intro_message.length}/2000</>
            )}
          </p>
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-2">
            <p className="text-xs text-[#DC2626]">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gap-2"
        >
          {submitting ? "Saving program..." : "Save Program"}
        </Button>
      </div>
    </form>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function EmployerProgramPage() {
  return (
    <EmployerRoute>
      <EmployerLayout>
        <ProgramForm />
      </EmployerLayout>
    </EmployerRoute>
  );
}
