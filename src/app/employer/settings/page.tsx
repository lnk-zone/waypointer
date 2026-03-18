"use client";

/**
 * Employer Settings Page
 *
 * Sections: Company Information, Admin Profile, Change Password,
 * Notification Preferences.
 */

import { useCallback, useEffect, useState } from "react";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Building2, ImageIcon, Loader2, Lock, Bell, User } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface SettingsData {
  company: {
    name: string;
    logo_url: string | null;
    industry: string | null;
  };
  admin: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface NotificationPreferences {
  newEmployeeActivation: boolean;
  weeklyUsageReports: boolean;
  seatExpiryReminders: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  newEmployeeActivation: true,
  weeklyUsageReports: true,
  seatExpiryReminders: true,
};

const NOTIFICATIONS_STORAGE_KEY = "waypointer_employer_notification_prefs";

// ─── Helpers ─────────────────────────────────────────────────────────

function loadNotificationPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATIONS;
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
      return { ...DEFAULT_NOTIFICATIONS, ...parsed };
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_NOTIFICATIONS;
}

function saveNotificationPrefs(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(prefs));
}

// ─── Skeleton ────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 lg:px-6 space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6">
          <div className="space-y-4">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────

function EmployerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Company form state
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  // Admin form state
  const [fullName, setFullName] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // ─── Fetch settings ───────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/employer/settings");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to load settings");
      }
      const { data } = await res.json();
      setSettings(data as SettingsData);
      setCompanyName(data.company.name ?? "");
      setIndustry(data.company.industry ?? "");
      setFullName(data.admin.full_name ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load settings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    setNotifications(loadNotificationPrefs());
  }, [fetchSettings]);

  // ─── Save Company ────────────────────────────────────────────────

  async function handleSaveCompany() {
    if (!companyName.trim()) {
      toast.error({ title: "Company name is required" });
      return;
    }
    setSavingCompany(true);
    try {
      const res = await fetch("/api/v1/employer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          industry: industry.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to save company info");
      }
      toast.success({ title: "Company information updated" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error({ title: message });
    } finally {
      setSavingCompany(false);
    }
  }

  // ─── Save Admin Profile ──────────────────────────────────────────

  async function handleSaveAdmin() {
    if (!fullName.trim()) {
      toast.error({ title: "Full name is required" });
      return;
    }
    setSavingAdmin(true);
    try {
      const res = await fetch("/api/v1/employer/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to save profile");
      }
      toast.success({ title: "Profile updated" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error({ title: message });
    } finally {
      setSavingAdmin(false);
    }
  }

  // ─── Change Password ─────────────────────────────────────────────

  async function handleChangePassword() {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();

      // Verify current password by re-signing in
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email;
      if (!email) {
        setPasswordError("Unable to verify current session");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError("Current password is incorrect");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }

      toast.success({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  }

  // ─── Save Notification Preferences ───────────────────────────────

  function handleSaveNotifications() {
    setSavingNotifications(true);
    saveNotificationPrefs(notifications);
    // Simulate brief save to give visual feedback
    setTimeout(() => {
      setSavingNotifications(false);
      toast.success({ title: "Notification preferences saved" });
    }, 300);
  }

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 lg:px-6">
        <Card className="p-6 text-center">
          <p className="text-text-secondary mb-4">{error}</p>
          <Button variant="outline" onClick={fetchSettings}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 lg:px-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-h2 text-text-primary">Settings</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Manage your company and account settings
        </p>
      </div>

      {/* ── Section 1: Company Information ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-body font-semibold text-text-primary">
            Company Information
          </h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          {/* Logo placeholder */}
          <div className="space-y-1.5">
            <Label>Company Logo</Label>
            <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-md bg-background">
              <div className="flex flex-col items-center gap-1 text-muted">
                <ImageIcon className="h-6 w-6" />
                <span className="text-caption">Upload logo</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology, Healthcare, Finance"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveCompany}
              disabled={savingCompany}
            >
              {savingCompany && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Section 2: Admin Profile ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-body font-semibold text-text-primary">
            Admin Profile
          </h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={settings?.admin.email ?? ""}
              disabled
              className="opacity-60"
            />
            <p className="text-caption text-muted">
              Contact support to change your email address
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveAdmin}
              disabled={savingAdmin}
            >
              {savingAdmin && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Section 3: Change Password ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-body font-semibold text-text-primary">
            Change Password
          </h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setPasswordError(null);
              }}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError(null);
              }}
              placeholder="Min 8 characters"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError(null);
              }}
              placeholder="Repeat new password"
            />
          </div>

          {passwordError && (
            <p className="text-caption text-danger">{passwordError}</p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Password
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Section 4: Notification Preferences ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-body font-semibold text-text-primary">
            Notification Preferences
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm font-medium text-text-primary">
                New employee activation alerts
              </p>
              <p className="text-caption text-text-secondary">
                Get notified when an employee activates their account
              </p>
            </div>
            <Switch
              checked={notifications.newEmployeeActivation}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({
                  ...prev,
                  newEmployeeActivation: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm font-medium text-text-primary">
                Weekly usage reports
              </p>
              <p className="text-caption text-text-secondary">
                Receive a summary of platform usage each week
              </p>
            </div>
            <Switch
              checked={notifications.weeklyUsageReports}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({
                  ...prev,
                  weeklyUsageReports: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm font-medium text-text-primary">
                Seat expiry reminders
              </p>
              <p className="text-caption text-text-secondary">
                Get reminded before employee seats expire
              </p>
            </div>
            <Switch
              checked={notifications.seatExpiryReminders}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({
                  ...prev,
                  seatExpiryReminders: checked,
                }))
              }
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
            >
              {savingNotifications && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────

export default function EmployerSettingsPageWrapper() {
  return (
    <EmployerRoute>
      <EmployerLayout>
        <EmployerSettingsPage />
      </EmployerLayout>
    </EmployerRoute>
  );
}
