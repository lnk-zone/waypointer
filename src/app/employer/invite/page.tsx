"use client";

/**
 * Invite Employees — Screen E3
 *
 * Three invite methods: CSV upload, manual add, bulk email paste.
 * Preview table with "Ready to Invite" status and "Send Invites" button.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployerRoute } from "@/components/auth/protected-route";
import { EmployerLayout } from "@/components/layout/employer-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Mail,
  Plus,
  Send,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface EmployeeEntry {
  id: string;
  name: string;
  email: string;
  department: string;
  role_family: string;
  last_day: string;
  status: "ready" | "error";
  error?: string;
}

interface InviteResult {
  invited: number;
  skipped_duplicates: number;
  skipped_invalid: number;
  errors: Array<{ email?: string; row?: number; reason: string }>;
}

interface ProgramInfo {
  id: string;
  total_seats: number;
  used_seats: number;
}

type InviteTab = "csv" | "manual" | "bulk";

// ─── Helpers ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Loading Skeleton ─────────────────────────────────────────────────

function InviteSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto h-16 w-16 animate-shimmer rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <div className="h-7 w-48 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <div className="h-4 w-64 mx-auto animate-shimmer rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      </div>
      <div className="h-12 w-full animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      <div className="h-40 w-full animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      <div className="h-64 w-full animate-shimmer rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
    </div>
  );
}

// ─── Invite Page Content ──────────────────────────────────────────────

function InviteContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [activeTab, setActiveTab] = useState<InviteTab>("csv");
  const [employees, setEmployees] = useState<EmployeeEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  // Manual add fields
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  // Bulk email field
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  // CSV state
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarning, setCsvWarning] = useState<string | null>(null);

  // Fetch active program on mount
  useEffect(() => {
    async function fetchProgram() {
      try {
        const res = await fetch("/api/v1/employer/program/active");
        if (!res.ok) {
          // No active program — redirect to program settings
          router.replace("/employer/program");
          return;
        }
        const data = await res.json();
        setProgram(data.data);
      } catch {
        router.replace("/employer/program");
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, [router]);

  // ─── CSV Upload ───────────────────────────────────────────────────

  const handleCSVUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !program) return;

      setCsvError(null);
      setCsvWarning(null);
      setCsvUploading(true);

      try {
        // Parse CSV locally first for preview
        const text = await file.text();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setCsvError("CSV file is empty or has no data rows");
          return;
        }

        const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
        const emailIdx = header.indexOf("email");
        const nameIdx = header.indexOf("employee_name");
        const deptIdx = header.indexOf("department");
        const roleIdx = header.indexOf("role_family");
        const lastDayIdx = header.indexOf("last_day");

        if (emailIdx === -1 || nameIdx === -1) {
          setCsvError(
            "CSV must have 'employee_name' and 'email' columns"
          );
          return;
        }

        const newEntries: EmployeeEntry[] = [];
        const seenEmails = new Set<string>();
        let duplicateCount = 0;
        let invalidCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const email = (cols[emailIdx] ?? "").trim().toLowerCase();
          const name = (cols[nameIdx] ?? "").trim();

          if (!email || !name) {
            invalidCount++;
            continue;
          }

          if (!EMAIL_RE.test(email)) {
            newEntries.push({
              id: generateId(),
              name,
              email,
              department: deptIdx >= 0 ? (cols[deptIdx] ?? "").trim() : "",
              role_family: roleIdx >= 0 ? (cols[roleIdx] ?? "").trim() : "",
              last_day: lastDayIdx >= 0 ? (cols[lastDayIdx] ?? "").trim() : "",
              status: "error",
              error: "Invalid email format",
            });
            invalidCount++;
            continue;
          }

          if (seenEmails.has(email)) {
            duplicateCount++;
            continue;
          }
          seenEmails.add(email);

          // Also check against existing preview entries
          const existsInPreview = employees.some(
            (e) => e.email.toLowerCase() === email
          );
          if (existsInPreview) {
            duplicateCount++;
            continue;
          }

          newEntries.push({
            id: generateId(),
            name,
            email,
            department: deptIdx >= 0 ? (cols[deptIdx] ?? "").trim() : "",
            role_family: roleIdx >= 0 ? (cols[roleIdx] ?? "").trim() : "",
            last_day: lastDayIdx >= 0 ? (cols[lastDayIdx] ?? "").trim() : "",
            status: "ready",
          });
        }

        setEmployees((prev) => [...prev, ...newEntries]);

        const warnings: string[] = [];
        if (duplicateCount > 0)
          warnings.push(`${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} removed`);
        if (invalidCount > 0)
          warnings.push(`${invalidCount} invalid row${invalidCount > 1 ? "s" : ""} flagged`);
        if (warnings.length > 0) setCsvWarning(warnings.join(". "));
      } catch {
        setCsvError("Failed to parse CSV file");
      } finally {
        setCsvUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [program, employees]
  );

  const downloadTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employer/invite/template");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "waypointer-invite-template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  // ─── Manual Add ───────────────────────────────────────────────────

  const handleManualAdd = useCallback(() => {
    setManualError(null);

    const trimmedName = manualName.trim();
    const trimmedEmail = manualEmail.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setManualError("Name and email are required");
      return;
    }

    if (!EMAIL_RE.test(trimmedEmail)) {
      setManualError("Invalid email format");
      return;
    }

    // Check for duplicates in preview
    if (employees.some((e) => e.email.toLowerCase() === trimmedEmail)) {
      setManualError("This email is already in the list");
      return;
    }

    setEmployees((prev) => [
      ...prev,
      {
        id: generateId(),
        name: trimmedName,
        email: trimmedEmail,
        department: "",
        role_family: "",
        last_day: "",
        status: "ready",
      },
    ]);

    setManualName("");
    setManualEmail("");
  }, [manualName, manualEmail, employees]);

  // ─── Bulk Email ───────────────────────────────────────────────────

  const handleBulkAdd = useCallback(() => {
    setBulkError(null);

    const rawEmails = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (rawEmails.length === 0) {
      setBulkError("Please enter at least one email address");
      return;
    }

    const existingEmails = new Set(employees.map((e) => e.email.toLowerCase()));
    const seenEmails = new Set<string>();
    const newEntries: EmployeeEntry[] = [];
    let invalidCount = 0;
    let duplicateCount = 0;

    for (const email of rawEmails) {
      if (!EMAIL_RE.test(email)) {
        invalidCount++;
        continue;
      }

      if (existingEmails.has(email) || seenEmails.has(email)) {
        duplicateCount++;
        continue;
      }

      seenEmails.add(email);
      newEntries.push({
        id: generateId(),
        name: email.split("@")[0],
        email,
        department: "",
        role_family: "",
        last_day: "",
        status: "ready",
      });
    }

    if (newEntries.length === 0) {
      setBulkError(
        invalidCount > 0
          ? `All ${invalidCount} email${invalidCount > 1 ? "s are" : " is"} invalid`
          : "All emails are already in the list"
      );
      return;
    }

    setEmployees((prev) => [...prev, ...newEntries]);
    setBulkEmails("");

    if (invalidCount > 0 || duplicateCount > 0) {
      const parts: string[] = [];
      if (invalidCount > 0) parts.push(`${invalidCount} invalid`);
      if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""}`);
      setBulkError(`Added ${newEntries.length}. Skipped: ${parts.join(", ")}`);
    }
  }, [bulkEmails, employees]);

  // ─── Remove Employee ──────────────────────────────────────────────

  const removeEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setEmployees([]);
    setResult(null);
    setSubmitError(null);
  }, []);

  // ─── Send Invites ─────────────────────────────────────────────────

  const handleSendInvites = useCallback(async () => {
    if (!program) return;

    const validEmployees = employees.filter((e) => e.status === "ready");
    if (validEmployees.length === 0) {
      setSubmitError("No valid employees to invite");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/employer/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: program.id,
          employees: validEmployees.map((e) => ({
            name: e.name,
            email: e.email,
            department: e.department,
            role_family: e.role_family,
            last_day: e.last_day,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ?? "Failed to send invitations"
        );
      }

      const data = await res.json();
      setResult(data.data);

      // Update local program count
      setProgram((prev) =>
        prev
          ? { ...prev, used_seats: prev.used_seats + (data.data.invited || 0) }
          : prev
      );

      // Clear invited employees from preview
      if (data.data.invited > 0) {
        setEmployees([]);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to send invitations"
      );
    } finally {
      setSubmitting(false);
    }
  }, [program, employees]);

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) return <InviteSkeleton />;
  if (!program) return null;

  const readyCount = employees.filter((e) => e.status === "ready").length;
  const errorCount = employees.filter((e) => e.status === "error").length;
  const availableSeats = program.total_seats - program.used_seats;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">
          Invite Employees
        </h1>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          Add employees to your transition program. They&apos;ll receive an
          invitation email to get started.
        </p>
      </div>

      {/* Seat Summary */}
      <div className="rounded-lg border border-border bg-surface p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Seats Available
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              {program.used_seats} of {program.total_seats} seats used
            </p>
          </div>
          <div
            className={cn(
              "text-2xl font-semibold",
              availableSeats > 0 ? "text-[#059669]" : "text-[#DC2626]"
            )}
          >
            {availableSeats}
          </div>
        </div>
        {availableSeats === 0 && (
          <div className="mt-2 rounded-md bg-[#DC2626]/5 border border-[#DC2626]/20 px-3 py-1.5">
            <p className="text-xs text-[#DC2626]">
              All seats are used. Purchase additional seats to invite more
              employees.
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-lg border border-border bg-surface p-1 mb-6">
        {[
          { key: "csv" as const, label: "CSV Upload", Icon: FileSpreadsheet },
          { key: "manual" as const, label: "Manual Add", Icon: UserPlus },
          { key: "bulk" as const, label: "Bulk Email", Icon: Mail },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-default",
              activeTab === key
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-border bg-surface p-6 mb-6">
        {/* CSV Upload Tab */}
        {activeTab === "csv" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-text-primary">
                  Upload CSV File
                </h3>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Upload a CSV with employee_name, email, department, role_family,
                  last_day columns
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCSVUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={csvUploading}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 p-8 text-center transition-default disabled:opacity-50"
            >
              <Upload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                {csvUploading
                  ? "Processing CSV..."
                  : "Click to upload CSV file"}
              </p>
              <p className="text-[10px] text-text-secondary/70 mt-1">
                .csv files up to 5MB
              </p>
            </button>

            {csvError && (
              <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#DC2626] mt-0.5 shrink-0" />
                <p className="text-xs text-[#DC2626]">{csvError}</p>
              </div>
            )}

            {csvWarning && (
              <div className="rounded-md border border-[#D97706]/20 bg-[#D97706]/5 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                <p className="text-xs text-[#D97706]">{csvWarning}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Add Tab */}
        {activeTab === "manual" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                Add Employee Manually
              </h3>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Enter a name and email to add an individual employee
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={manualName}
                  onChange={(e) => {
                    setManualName(e.target.value);
                    setManualError(null);
                  }}
                  placeholder="Employee name"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    setManualError(null);
                  }}
                  placeholder="email@company.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualAdd();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={handleManualAdd}
                size="sm"
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {manualError && (
              <p className="text-xs text-[#DC2626]">{manualError}</p>
            )}
          </div>
        )}

        {/* Bulk Email Tab */}
        {activeTab === "bulk" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">
                Paste Email Addresses
              </h3>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Paste a list of email addresses, separated by commas, semicolons,
                or new lines
              </p>
            </div>

            <Textarea
              value={bulkEmails}
              onChange={(e) => {
                setBulkEmails(e.target.value);
                setBulkError(null);
              }}
              placeholder={`maya@company.com\njohn@company.com\njane@company.com`}
              rows={6}
              className="resize-none font-mono text-sm"
            />

            <div className="flex items-center justify-between">
              <div>
                {bulkError && (
                  <p className="text-xs text-[#D97706]">{bulkError}</p>
                )}
              </div>
              <Button
                type="button"
                onClick={handleBulkAdd}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Emails
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {employees.length > 0 && (
        <div className="rounded-lg border border-border bg-surface mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">
                Employee Preview
              </h3>
              <span className="text-xs text-text-secondary">
                ({readyCount} ready
                {errorCount > 0 && (
                  <>, {errorCount} error{errorCount > 1 ? "s" : ""}</>
                )}
                )
              </span>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-text-secondary hover:text-[#DC2626] transition-default"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-background sticky top-0">
                <tr>
                  <th className="text-left text-[10px] font-medium text-text-secondary px-4 py-2">
                    Name
                  </th>
                  <th className="text-left text-[10px] font-medium text-text-secondary px-4 py-2">
                    Email
                  </th>
                  <th className="text-left text-[10px] font-medium text-text-secondary px-4 py-2">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-medium text-text-secondary px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      emp.status === "error" && "bg-[#DC2626]/5"
                    )}
                  >
                    <td className="px-4 py-2.5 text-sm text-text-primary">
                      {emp.name}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">
                      {emp.email}
                    </td>
                    <td className="px-4 py-2.5">
                      {emp.status === "ready" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#059669] font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready to Invite
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#DC2626] font-medium">
                          <AlertCircle className="h-3 w-3" />
                          {emp.error || "Error"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeEmployee(emp.id)}
                        className="text-text-secondary hover:text-[#DC2626] transition-default"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Seat warning */}
          {readyCount > availableSeats && (
            <div className="px-4 py-2 border-t border-border bg-[#DC2626]/5">
              <p className="text-xs text-[#DC2626]">
                You have {availableSeats} seat{availableSeats !== 1 ? "s" : ""}{" "}
                remaining but {readyCount} employee
                {readyCount > 1 ? "s" : ""} to invite. Purchase additional
                seats to continue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {employees.length === 0 && !result && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center mb-6">
          <Users className="h-8 w-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-secondary">
            No employees added yet. Use one of the methods above to add
            employees.
          </p>
        </div>
      )}

      {/* Result Banner */}
      {result && (
        <div className="rounded-lg border border-[#059669]/20 bg-[#059669]/5 p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#059669]">
                {result.invited} invitation{result.invited !== 1 ? "s" : ""}{" "}
                sent successfully
              </p>
              {(result.skipped_duplicates > 0 ||
                result.skipped_invalid > 0) && (
                <p className="text-xs text-text-secondary mt-1">
                  {result.skipped_duplicates > 0 &&
                    `${result.skipped_duplicates} duplicate${result.skipped_duplicates > 1 ? "s" : ""} skipped. `}
                  {result.skipped_invalid > 0 &&
                    `${result.skipped_invalid} invalid email${result.skipped_invalid > 1 ? "s" : ""} skipped.`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="rounded-md border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-2 mb-6">
          <p className="text-xs text-[#DC2626]">{submitError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSendInvites}
          disabled={submitting || readyCount === 0 || readyCount > availableSeats}
          className="flex-1 gap-2"
        >
          <Send className="h-4 w-4" />
          {submitting
            ? "Sending invitations..."
            : `Send ${readyCount > 0 ? readyCount : ""} Invite${readyCount !== 1 ? "s" : ""}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/employer/dashboard")}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function EmployerInvitePage() {
  return (
    <EmployerRoute>
      <EmployerLayout>
        <InviteContent />
      </EmployerLayout>
    </EmployerRoute>
  );
}
