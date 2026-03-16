"use client";

/**
 * Company Setup — Screen E1
 *
 * Employer admin configures company profile: name, logo, brand color,
 * welcome message, admin emails, support contact, and program duration.
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployerSetupRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Building2,
  ImagePlus,
  Palette,
  Plus,
  Trash2,
  X,
} from "lucide-react";

// ─── Form State ──────────────────────────────────────────────────────

interface FormState {
  name: string;
  brand_color: string;
  support_email: string;
  welcome_message: string;
  default_program_duration_days: number;
  admin_emails: string[];
}

interface FormErrors {
  name?: string;
  support_email?: string;
  brand_color?: string;
  admin_emails?: string;
  logo?: string;
}

// ─── Validators ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function validateForm(form: FormState, logoFile: File | null): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Company name is required";
  }

  if (!form.support_email.trim()) {
    errors.support_email = "Support email is required";
  } else if (!EMAIL_RE.test(form.support_email)) {
    errors.support_email = "Invalid email format";
  }

  if (!HEX_COLOR_RE.test(form.brand_color)) {
    errors.brand_color = "Invalid hex color (e.g., #2563EB)";
  }

  const invalidEmails = form.admin_emails.filter(
    (e) => e.trim() !== "" && !EMAIL_RE.test(e.trim())
  );
  if (invalidEmails.length > 0) {
    errors.admin_emails = "Some admin emails are invalid";
  }

  if (logoFile && logoFile.size > 2 * 1024 * 1024) {
    errors.logo = "Logo must be under 2MB";
  }

  return errors;
}

// ─── Setup Form ──────────────────────────────────────────────────────

function SetupForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    brand_color: "#2563EB",
    support_email: "",
    welcome_message: "",
    default_program_duration_days: 90,
    admin_emails: [""],
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field updater
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  // Logo handler
  const handleLogoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          logo: "Logo must be PNG, JPEG, WebP, or SVG",
        }));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          logo: "Logo must be under 2MB",
        }));
        return;
      }

      setLogoFile(file);
      setErrors((prev) => ({ ...prev, logo: undefined }));

      // Create preview
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    []
  );

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Admin email handlers
  const addAdminEmail = useCallback(() => {
    setForm((prev) => {
      if (prev.admin_emails.length >= 5) return prev;
      return { ...prev, admin_emails: [...prev.admin_emails, ""] };
    });
  }, []);

  const updateAdminEmail = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const updated = [...prev.admin_emails];
      updated[index] = value;
      return { ...prev, admin_emails: updated };
    });
    setErrors((prev) => ({ ...prev, admin_emails: undefined }));
  }, []);

  const removeAdminEmail = useCallback((index: number) => {
    setForm((prev) => {
      const updated = prev.admin_emails.filter((_, i) => i !== index);
      return {
        ...prev,
        admin_emails: updated.length === 0 ? [""] : updated,
      };
    });
  }, []);

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateForm(form, logoFile);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setSubmitting(true);
      setSubmitError(null);

      try {
        const formData = new FormData();
        formData.append(
          "data",
          JSON.stringify({
            name: form.name.trim(),
            brand_color: form.brand_color,
            support_email: form.support_email.trim(),
            welcome_message: form.welcome_message.trim(),
            default_program_duration_days: form.default_program_duration_days,
            admin_emails: form.admin_emails
              .map((e) => e.trim())
              .filter((e) => e !== ""),
          })
        );

        if (logoFile) {
          formData.append("logo", logoFile);
        }

        const res = await fetch("/api/v1/employer/company", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.error?.message ?? "Failed to create company"
          );
        }

        // Navigate to program settings
        router.push("/employer/program");
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to create company"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, logoFile, router]
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Company Setup
        </h1>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          Set up your company profile. This information will be shown to
          employees during their transition.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Company Name *
          </label>
          <Input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Acme Corp"
            className={cn(errors.name && "border-[#DC2626]")}
          />
          {errors.name && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.name}</p>
          )}
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Company Logo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoSelect}
            className="hidden"
          />
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-lg border border-border overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-text-secondary hover:text-[#DC2626] transition-default"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 p-6 text-center transition-default"
            >
              <ImagePlus className="h-8 w-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                Click to upload logo
              </p>
              <p className="text-[10px] text-text-secondary/70 mt-1">
                PNG, JPEG, WebP, or SVG · Max 2MB
              </p>
            </button>
          )}
          {errors.logo && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.logo}</p>
          )}
        </div>

        {/* Brand Color */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Brand Color
            </span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brand_color}
              onChange={(e) => updateField("brand_color", e.target.value)}
              className="h-10 w-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={form.brand_color}
              onChange={(e) => updateField("brand_color", e.target.value)}
              placeholder="#2563EB"
              className={cn("flex-1", errors.brand_color && "border-[#DC2626]")}
            />
          </div>
          {errors.brand_color && (
            <p className="text-xs text-[#DC2626] mt-1">
              {errors.brand_color}
            </p>
          )}
        </div>

        {/* Support Email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Support Contact Email *
          </label>
          <Input
            type="email"
            value={form.support_email}
            onChange={(e) => updateField("support_email", e.target.value)}
            placeholder="hr@acme.com"
            className={cn(errors.support_email && "border-[#DC2626]")}
          />
          {errors.support_email && (
            <p className="text-xs text-[#DC2626] mt-1">
              {errors.support_email}
            </p>
          )}
        </div>

        {/* Welcome Message */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Welcome Message
          </label>
          <Textarea
            value={form.welcome_message}
            onChange={(e) => updateField("welcome_message", e.target.value)}
            placeholder="We value your contributions and want to support you in this transition..."
            rows={4}
            className="resize-none"
          />
          <p className="text-[10px] text-text-secondary mt-1">
            Shown to employees when they first log in.
            {form.welcome_message.length > 0 && (
              <> · {form.welcome_message.length}/2000</>
            )}
          </p>
        </div>

        {/* Default Program Duration */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Default Program Duration (days)
          </label>
          <Input
            type="number"
            value={form.default_program_duration_days}
            onChange={(e) =>
              updateField(
                "default_program_duration_days",
                Math.max(7, Math.min(365, parseInt(e.target.value) || 90))
              )
            }
            min={7}
            max={365}
          />
          <p className="text-[10px] text-text-secondary mt-1">
            How long employees have access (7–365 days)
          </p>
        </div>

        {/* HR Admin Emails */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            HR Admin Emails
            <span className="text-text-secondary font-normal ml-1">
              (up to 5)
            </span>
          </label>
          <div className="space-y-2">
            {form.admin_emails.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => updateAdminEmail(i, e.target.value)}
                  placeholder={`admin${i + 1}@company.com`}
                  className={cn(
                    "flex-1",
                    errors.admin_emails && "border-[#DC2626]"
                  )}
                />
                {form.admin_emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAdminEmail(i)}
                    className="text-text-secondary hover:text-[#DC2626] transition-default shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.admin_emails && (
            <p className="text-xs text-[#DC2626] mt-1">
              {errors.admin_emails}
            </p>
          )}
          {form.admin_emails.length < 5 && (
            <button
              type="button"
              onClick={addAdminEmail}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-default mt-2"
            >
              <Plus className="h-3 w-3" />
              Add another email
            </button>
          )}
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
          {submitting
            ? "Setting up your company..."
            : "Create Transition Program"}
        </Button>
      </div>
    </form>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function EmployerSetupPage() {
  return (
    <EmployerSetupRoute>
      <EmployerLayout>
        <SetupForm />
      </EmployerLayout>
    </EmployerSetupRoute>
  );
}
