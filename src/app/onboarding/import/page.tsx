"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ProfileInput } from "@/lib/validators/profile";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

const SENIORITY_OPTIONS = [
  { value: "entry_level", label: "Entry-Level" },
  { value: "mid_level", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "staff_principal", label: "Staff / Principal" },
  { value: "manager", label: "Manager" },
  { value: "senior_manager", label: "Senior Manager" },
  { value: "director", label: "Director" },
  { value: "vp_plus", label: "VP+" },
] as const;

const MANAGEMENT_OPTIONS = [
  { value: "no_direct_reports", label: "No direct reports" },
  { value: "1_to_3", label: "1\u20133 direct reports" },
  { value: "4_to_10", label: "4\u201310 direct reports" },
  { value: "10_plus", label: "10+ direct reports" },
] as const;

const LEVEL_DIRECTION_OPTIONS = [
  { value: "stay_current", label: "I want to stay at my current level" },
  { value: "open_to_step_up", label: "I\u2019m open to a step up" },
  {
    value: "open_to_step_down",
    label: "I\u2019m open to a step down for the right role",
  },
] as const;

const WORK_PREF_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
] as const;

const WORK_AUTH_OPTIONS = [
  { value: "us_citizen", label: "US Citizen" },
  { value: "green_card", label: "Green Card" },
  { value: "h1b", label: "H-1B" },
  { value: "opt", label: "OPT" },
  { value: "other", label: "Other" },
] as const;

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
] as const;

const COMP_MIN = 30000;
const COMP_MAX = 300000;
const COMP_STEP = 10000;

function formatComp(value: number): string {
  if (value >= COMP_MAX) return `$${value / 1000}K+`;
  return `$${value / 1000}K`;
}

const SKELETON_CLASS =
  "animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

type FormState = {
  seniority: ProfileInput["seniority"] | "";
  management_exp: ProfileInput["management_exp"] | "";
  level_dir: ProfileInput["level_dir"] | "";
  location_city: string;
  location_state: string;
  work_pref: ProfileInput["work_pref"] | "";
  comp_range: [number, number];
  work_auth: ProfileInput["work_auth"] | "";
};

function ImportContent() {
  const router = useRouter();

  // File state
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>({
    seniority: "",
    management_exp: "",
    level_dir: "",
    location_city: "",
    location_state: "",
    work_pref: "",
    comp_range: [80000, 150000],
    work_auth: "",
  });

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null);

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File too large. Maximum file size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/employee/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setUploadError(
          json?.error?.message ?? "Upload failed. Please try again."
        );
        return;
      }

      setUploadedFile({ name: file.name, size: file.size });
    } catch {
      setUploadError("Upload failed. Please check your connection.");
    } finally {
      setUploading(false);
    }
  }, []);

  const onDropRejected = useCallback(() => {
    setUploadError("Only PDF and DOCX files are accepted.");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
  });

  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const isFormComplete = useMemo(() => {
    return (
      uploadedFile !== null &&
      form.seniority !== "" &&
      form.management_exp !== "" &&
      form.level_dir !== "" &&
      form.location_city.trim() !== "" &&
      form.location_state !== "" &&
      form.work_pref !== "" &&
      form.work_auth !== ""
    );
  }, [uploadedFile, form]);

  const handleSubmit = useCallback(async () => {
    if (!isFormComplete) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/v1/employee/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniority: form.seniority,
          management_exp: form.management_exp,
          level_dir: form.level_dir,
          location_city: form.location_city.trim(),
          location_state: form.location_state,
          work_pref: form.work_pref,
          comp_target_min: form.comp_range[0],
          comp_target_max: form.comp_range[1],
          work_auth: form.work_auth,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setSubmitError(
          json?.error?.message ?? "Failed to save profile. Please try again."
        );
        return;
      }

      router.push("/onboarding/extracting");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [isFormComplete, form, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background animate-fade-in">
      {/* Header */}
      <header className="flex w-full items-center justify-center px-6 pt-12 pb-4">
        <span className="text-h2 text-text-secondary">Waypointer</span>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-12">
        <div className="space-y-10">
          {/* Page title */}
          <div className="space-y-2 text-center">
            <h1 className="text-display text-text-primary">
              Import your background
            </h1>
            <p className="text-body text-text-secondary">
              Upload your resume and tell us about yourself so we can build your
              personalized transition plan.
            </p>
          </div>

          {/* Resume upload zone */}
          <section className="space-y-3">
            <Label>Resume</Label>
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center rounded-sm border-2 border-dashed px-6 py-10 text-center transition-default cursor-pointer",
                isDragActive
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface hover:border-primary/50",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-2">
                  <div
                    className={cn("mx-auto h-4 w-48", SKELETON_CLASS)}
                  />
                  <p className="text-body-sm text-muted">
                    Uploading your resume...
                  </p>
                </div>
              ) : uploadedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-success"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-body font-medium text-text-primary">
                      {uploadedFile.name}
                    </span>
                  </div>
                  <p className="text-body-sm text-muted">
                    {(uploadedFile.size / 1024).toFixed(0)} KB — Drop a new
                    file to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto text-muted"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-body text-text-primary">
                    {isDragActive
                      ? "Drop your resume here"
                      : "Drag and drop your resume, or click to browse"}
                  </p>
                  <p className="text-body-sm text-muted">
                    PDF or DOCX, up to 10MB
                  </p>
                </div>
              )}
            </div>
            {uploadError && (
              <p className="text-body-sm text-danger">{uploadError}</p>
            )}
          </section>

          {/* LinkedIn placeholder */}
          <section>
            <Button
              variant="outline"
              className="w-full rounded-sm"
              disabled
            >
              Import from LinkedIn — Coming soon
            </Button>
          </section>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-body-sm text-muted">Your details</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Seniority */}
          <fieldset className="space-y-2">
            <Label htmlFor="seniority">Seniority level</Label>
            <Select
              value={form.seniority}
              onValueChange={(v) =>
                updateForm("seniority", v as FormState["seniority"])
              }
            >
              <SelectTrigger id="seniority">
                <SelectValue placeholder="Select your seniority level" />
              </SelectTrigger>
              <SelectContent>
                {SENIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>

          {/* Management experience */}
          <fieldset className="space-y-2">
            <Label htmlFor="management_exp">Management experience</Label>
            <Select
              value={form.management_exp}
              onValueChange={(v) =>
                updateForm("management_exp", v as FormState["management_exp"])
              }
            >
              <SelectTrigger id="management_exp">
                <SelectValue placeholder="Select your management experience" />
              </SelectTrigger>
              <SelectContent>
                {MANAGEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>

          {/* Level direction */}
          <fieldset className="space-y-3">
            <Label>Level direction</Label>
            <RadioGroup
              value={form.level_dir}
              onValueChange={(v) =>
                updateForm("level_dir", v as FormState["level_dir"])
              }
            >
              {LEVEL_DIRECTION_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-3">
                  <RadioGroupItem value={opt.value} id={`level-${opt.value}`} />
                  <Label
                    htmlFor={`level-${opt.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          {/* Location */}
          <fieldset className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Input
                  placeholder="City"
                  value={form.location_city}
                  onChange={(e) => updateForm("location_city", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Select
                  value={form.location_state}
                  onValueChange={(v) => updateForm("location_state", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Work preference */}
          <fieldset className="space-y-3">
            <Label>Work preference</Label>
            <RadioGroup
              value={form.work_pref}
              onValueChange={(v) =>
                updateForm("work_pref", v as FormState["work_pref"])
              }
            >
              {WORK_PREF_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-3">
                  <RadioGroupItem
                    value={opt.value}
                    id={`workpref-${opt.value}`}
                  />
                  <Label
                    htmlFor={`workpref-${opt.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          {/* Compensation range */}
          <fieldset className="space-y-4">
            <Label>Compensation target</Label>
            <div className="space-y-3">
              <Slider
                value={form.comp_range}
                onValueChange={(v) =>
                  updateForm("comp_range", v as [number, number])
                }
                min={COMP_MIN}
                max={COMP_MAX}
                step={COMP_STEP}
              />
              <div className="flex items-center justify-between text-body-sm text-text-secondary">
                <span>{formatComp(form.comp_range[0])}</span>
                <span>{formatComp(form.comp_range[1])}</span>
              </div>
            </div>
          </fieldset>

          {/* Work authorization */}
          <fieldset className="space-y-2">
            <Label htmlFor="work_auth">Work authorization</Label>
            <Select
              value={form.work_auth}
              onValueChange={(v) =>
                updateForm("work_auth", v as FormState["work_auth"])
              }
            >
              <SelectTrigger id="work_auth">
                <SelectValue placeholder="Select your work authorization" />
              </SelectTrigger>
              <SelectContent>
                {WORK_AUTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>

          {/* Submit error */}
          {submitError && (
            <p className="text-body-sm text-danger text-center">
              {submitError}
            </p>
          )}

          {/* Continue button */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full rounded-sm"
              disabled={!isFormComplete || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Saving..." : "Continue"}
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

export default function ImportPage() {
  return (
    <EmployeeRoute>
      <ImportContent />
    </EmployeeRoute>
  );
}
