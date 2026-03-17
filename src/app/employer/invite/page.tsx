"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus, Send, Trash2, Upload, Users, X } from "lucide-react";

interface SeatBalance {
  total_purchased: number;
  total_assigned: number;
  available: number;
}

interface Program {
  id: string;
  name: string;
}

interface EmployeeEntry {
  name: string;
  email: string;
  department: string;
  role_family: string;
  last_day: string;
}

const EMPTY_EMPLOYEE: EmployeeEntry = {
  name: "",
  email: "",
  department: "",
  role_family: "",
  last_day: "",
};

export default function InvitePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<SeatBalance | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [employees, setEmployees] = useState<EmployeeEntry[]>([{ ...EMPTY_EMPLOYEE }]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, programsRes] = await Promise.all([
        fetch("/api/v1/employer/seats"),
        fetch("/api/v1/employer/program"),
      ]);

      const balanceJson = await balanceRes.json();
      const programsJson = await programsRes.json();

      if (balanceRes.ok && balanceJson.data) setBalance(balanceJson.data);
      if (programsRes.ok && programsJson.data) setPrograms(programsJson.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addRow = () => {
    setEmployees([...employees, { ...EMPTY_EMPLOYEE }]);
  };

  const removeRow = (index: number) => {
    if (employees.length === 1) return;
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const updateEmployee = (index: number, field: keyof EmployeeEntry, value: string) => {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  };

  const handleSubmit = async () => {
    const validEmployees = employees.filter((e) => e.name.trim() && e.email.trim());
    if (validEmployees.length === 0) {
      setError("Please add at least one employee with a name and email.");
      return;
    }

    if (balance && validEmployees.length > balance.available) {
      setError(`You only have ${balance.available} available seat${balance.available !== 1 ? "s" : ""}. Purchase more seats to continue.`);
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, unknown> = { employees: validEmployees };
      if (selectedProgramId) {
        body.program_id = selectedProgramId;
      }

      const res = await fetch("/api/v1/employer/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Failed to send invitations");
        setSending(false);
        return;
      }

      const data = json.data;
      setSuccess(
        `Successfully invited ${data.invited} employee${data.invited !== 1 ? "s" : ""}.` +
        (data.skipped_duplicates > 0 ? ` ${data.skipped_duplicates} duplicate${data.skipped_duplicates !== 1 ? "s" : ""} skipped.` : "")
      );
      setEmployees([{ ...EMPTY_EMPLOYEE }]);
      // Refresh balance
      const balanceRes = await fetch("/api/v1/employer/seats");
      const balanceJson = await balanceRes.json();
      if (balanceRes.ok && balanceJson.data) setBalance(balanceJson.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ─── CSV Upload ───────────────────────────────────────────────────
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) return; // header + at least 1 row

      const newEmployees: EmployeeEntry[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          newEmployees.push({
            name: cols[0],
            email: cols[1],
            department: cols[2] || "",
            role_family: cols[3] || "",
            last_day: cols[4] || "",
          });
        }
      }

      if (newEmployees.length > 0) {
        setEmployees(newEmployees);
        setSuccess(`Loaded ${newEmployees.length} employee${newEmployees.length !== 1 ? "s" : ""} from CSV.`);
        setError("");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const noSeats = balance && balance.available <= 0;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Invite employees</h1>
        <p className="text-sm text-text-secondary mt-1">
          Send career transition access invitations to departing employees.
        </p>
      </div>

      {/* Seat Balance */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-text-secondary uppercase tracking-wide">Available seats</p>
            <p className={cn("text-2xl font-semibold mt-1", noSeats ? "text-red-600" : "text-primary")}>
              {balance.available}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-text-secondary uppercase tracking-wide">Assigned</p>
            <p className="text-2xl font-semibold mt-1 text-text-primary">{balance.total_assigned}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-text-secondary uppercase tracking-wide">Total purchased</p>
            <p className="text-2xl font-semibold mt-1 text-text-primary">{balance.total_purchased}</p>
          </div>
        </div>
      )}

      {/* No Seats Warning */}
      {noSeats && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">No available seats</p>
            <p className="text-sm text-red-700 mt-1">
              You need to purchase more seats before inviting employees.
            </p>
            <button
              onClick={() => router.push("/employer/billing")}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
            >
              Go to billing →
            </button>
          </div>
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white rounded-lg border border-border">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-medium text-text-primary">Employee details</h2>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add row
            </button>
          </div>
        </div>

        {/* Optional Program Selector */}
        {programs.length > 0 && (
          <div className="px-5 py-3 border-b border-border bg-gray-50">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-secondary whitespace-nowrap">
                Assign to program (optional):
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">No program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Employee Rows */}
        <div className="divide-y divide-border">
          {employees.map((emp, i) => (
            <div key={i} className="px-5 py-3 grid grid-cols-12 gap-3 items-center">
              <input
                type="text"
                placeholder="Full name *"
                value={emp.name}
                onChange={(e) => updateEmployee(i, "name", e.target.value)}
                className="col-span-3 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={sending}
              />
              <input
                type="email"
                placeholder="Email *"
                value={emp.email}
                onChange={(e) => updateEmployee(i, "email", e.target.value)}
                className="col-span-3 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={sending}
              />
              <input
                type="text"
                placeholder="Department"
                value={emp.department}
                onChange={(e) => updateEmployee(i, "department", e.target.value)}
                className="col-span-2 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={sending}
              />
              <input
                type="text"
                placeholder="Role"
                value={emp.role_family}
                onChange={(e) => updateEmployee(i, "role_family", e.target.value)}
                className="col-span-2 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={sending}
              />
              <input
                type="date"
                placeholder="Last day"
                value={emp.last_day}
                onChange={(e) => updateEmployee(i, "last_day", e.target.value)}
                className="col-span-1 px-2 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={sending}
              />
              <button
                onClick={() => removeRow(i)}
                disabled={employees.length === 1 || sending}
                className="col-span-1 p-2 text-text-secondary hover:text-red-600 disabled:opacity-30 transition-colors justify-self-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            {employees.filter((e) => e.name.trim() && e.email.trim()).length} employee{employees.filter((e) => e.name.trim() && e.email.trim()).length !== 1 ? "s" : ""} ready to invite
          </p>
          <button
            onClick={handleSubmit}
            disabled={sending || !!noSeats}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-colors",
              sending || noSeats
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending invitations..." : "Send invitations"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
          <button onClick={() => setSuccess("")} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
