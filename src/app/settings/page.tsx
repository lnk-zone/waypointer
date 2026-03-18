"use client";

import { useCallback, useEffect, useState } from "react";
import { EmployeeRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "US", label: "United States" }, { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" }, { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" }, { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" }, { value: "IE", label: "Ireland" },
  { value: "SG", label: "Singapore" }, { value: "IN", label: "India" },
  { value: "NG", label: "Nigeria" }, { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" }, { value: "ZA", label: "South Africa" },
  { value: "AE", label: "United Arab Emirates" }, { value: "SA", label: "Saudi Arabia" },
  { value: "BR", label: "Brazil" }, { value: "MX", label: "Mexico" },
  { value: "JP", label: "Japan" }, { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" }, { value: "HK", label: "Hong Kong" },
  { value: "TW", label: "Taiwan" }, { value: "IL", label: "Israel" },
  { value: "SE", label: "Sweden" }, { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" }, { value: "FI", label: "Finland" },
  { value: "CH", label: "Switzerland" }, { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" }, { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" }, { value: "PT", label: "Portugal" },
  { value: "PL", label: "Poland" }, { value: "CZ", label: "Czech Republic" },
  { value: "NZ", label: "New Zealand" }, { value: "PH", label: "Philippines" },
  { value: "MY", label: "Malaysia" }, { value: "TH", label: "Thailand" },
  { value: "VN", label: "Vietnam" }, { value: "ID", label: "Indonesia" },
  { value: "EG", label: "Egypt" }, { value: "CO", label: "Colombia" },
  { value: "AR", label: "Argentina" }, { value: "CL", label: "Chile" },
  { value: "PE", label: "Peru" }, { value: "PK", label: "Pakistan" },
  { value: "BD", label: "Bangladesh" }, { value: "LK", label: "Sri Lanka" },
  { value: "RW", label: "Rwanda" }, { value: "TZ", label: "Tanzania" },
  { value: "UG", label: "Uganda" }, { value: "ET", label: "Ethiopia" },
  { value: "CM", label: "Cameroon" }, { value: "SN", label: "Senegal" },
  { value: "CI", label: "Ivory Coast" }, { value: "ML", label: "Mali" },
] as const;

const NOTIFICATION_STORAGE_KEY = "waypointer_notification_prefs";

interface NotificationPrefs {
  weeklyPlanReminders: boolean;
  jobMatchAlerts: boolean;
  interviewPrepReminders: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  weeklyPlanReminders: true,
  jobMatchAlerts: true,
  interviewPrepReminders: true,
};

function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
      return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      <div className="h-10 w-full rounded-sm bg-gray-200 animate-pulse" />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <FieldSkeleton />
      <FieldSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FieldSkeleton />
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────

function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [nameError, setNameError] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employee/settings");
      if (!res.ok) {
        toast.error({ title: "Failed to load profile data" });
        return;
      }
      const json = await res.json();
      const data = json.data;
      setFullName(data.full_name ?? "");
      setEmail(data.email ?? "");
      setCity(data.location_city ?? "");
      setState(data.location_state ?? "");
      setCountry(data.location_country ?? "");
    } catch {
      toast.error({ title: "Failed to load profile data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSave() {
    setNameError("");

    if (!fullName.trim()) {
      setNameError("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/employee/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          location_city: city.trim() || null,
          location_state: state.trim() || null,
          location_country: country || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error({
          title: "Failed to save changes",
          description: json?.error?.message ?? "Please try again.",
        });
        return;
      }

      toast.success({ title: "Profile updated successfully" });
    } catch {
      toast.error({ title: "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        Profile Information
      </h2>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (nameError) setNameError("");
              }}
              error={!!nameError}
              errorMessage={nameError}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted">
              Contact support to change your email address.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. California"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Change Password Section ──────────────────────────────────────────

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!currentPassword) {
      errs.currentPassword = "Current password is required";
    }
    if (!newPassword) {
      errs.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleUpdatePassword() {
    if (!validate()) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error({
          title: "Failed to update password",
          description: error.message,
        });
        return;
      }

      toast.success({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch {
      toast.error({ title: "Failed to update password" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        Change Password
      </h2>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (errors.currentPassword) {
                setErrors((prev) => ({ ...prev, currentPassword: "" }));
              }
            }}
            error={!!errors.currentPassword}
            errorMessage={errors.currentPassword}
            placeholder="Enter current password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) {
                setErrors((prev) => ({ ...prev, newPassword: "" }));
              }
            }}
            error={!!errors.newPassword}
            errorMessage={errors.newPassword}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }
            }}
            error={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword}
            placeholder="Re-enter new password"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleUpdatePassword} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Notification Preferences Section ─────────────────────────────────

function NotificationSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
    setLoaded(true);
  }, []);

  function updatePref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(prefs));
    toast.success({ title: "Notification preferences saved" });
  }

  if (!loaded) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        Notification Preferences
      </h2>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Weekly plan reminders
            </p>
            <p className="text-xs text-muted">
              Get reminded about your weekly action items
            </p>
          </div>
          <Switch
            checked={prefs.weeklyPlanReminders}
            onCheckedChange={(v) => updatePref("weeklyPlanReminders", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Job match alerts
            </p>
            <p className="text-xs text-muted">
              Receive alerts when new matching jobs are found
            </p>
          </div>
          <Switch
            checked={prefs.jobMatchAlerts}
            onCheckedChange={(v) => updatePref("jobMatchAlerts", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Interview prep reminders
            </p>
            <p className="text-xs text-muted">
              Get reminded to prepare for upcoming interviews
            </p>
          </div>
          <Switch
            checked={prefs.interviewPrepReminders}
            onCheckedChange={(v) => updatePref("interviewPrepReminders", v)}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </div>
    </section>
  );
}

// ─── Delete Account Section ───────────────────────────────────────────

function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function handleDeleteClick() {
    setShowModal(true);
    setConfirmText("");
  }

  function handleCancel() {
    setShowModal(false);
    setConfirmText("");
  }

  function handleConfirmDelete() {
    // API endpoint will be created later — show placeholder toast for now
    toast.warning({
      title: "Account deletion requested",
      description: "This feature is not yet available. Please contact support.",
    });
    setShowModal(false);
    setConfirmText("");
  }

  return (
    <>
      <section className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteClick}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Delete my account and all data
        </Button>
      </section>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-md rounded-lg bg-surface border border-border p-6 shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              This action cannot be undone. All your data including resumes,
              career snapshots, job applications, and interview history will be
              permanently deleted.
            </p>
            <p className="text-sm font-medium text-text-primary mb-2">
              Type <span className="font-mono text-red-600">DELETE</span> to
              confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE"}
                onClick={handleConfirmDelete}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────

function SettingsContent() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your account settings and preferences.
          </p>
        </div>

        <ProfileSection />
        <PasswordSection />
        <NotificationSection />
        <DeleteAccountSection />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <EmployeeRoute>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </EmployeeRoute>
  );
}
