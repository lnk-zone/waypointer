"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FolderPlus, Pencil, Users, X } from "lucide-react";

interface Program {
  id: string;
  name: string;
  custom_intro_message: string | null;
  is_branded: boolean;
  is_active: boolean;
  created_at: string;
  employee_count: number;
}

interface ProgramFormData {
  name: string;
  custom_intro_message: string;
  is_branded: boolean;
}

const EMPTY_FORM: ProgramFormData = {
  name: "",
  custom_intro_message: "",
  is_branded: true,
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/employer/program");
      const json = await res.json();
      if (res.ok && json.data) {
        setPrograms(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Program name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/v1/employer/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to create program");
        setSaving(false);
        return;
      }
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await fetchPrograms();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) {
      setError("Program name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/v1/employer/program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to update program");
        setSaving(false);
        return;
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchPrograms();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (program: Program) => {
    setEditingId(program.id);
    setShowCreate(false);
    setForm({
      name: program.name,
      custom_intro_message: program.custom_intro_message || "",
      is_branded: program.is_branded,
    });
    setError("");
  };

  const cancelForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  // ─── Loading Skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-5 space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // ─── Inline Form Component ────────────────────────────────────────
  const renderForm = (isEdit: boolean) => (
    <div className="bg-white rounded-lg border border-border p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-text-primary">
          {isEdit ? "Edit program" : "Create a new program"}
        </h3>
        <button onClick={cancelForm} className="text-text-secondary hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Program name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Q1 2026 Transition Cohort"
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Custom intro message <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            value={form.custom_intro_message}
            onChange={(e) => setForm({ ...form, custom_intro_message: e.target.value })}
            placeholder="A message shown to employees when they first access the platform..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_branded"
            checked={form.is_branded}
            onChange={(e) => setForm({ ...form, is_branded: e.target.checked })}
            className="rounded border-border text-primary focus:ring-primary/20"
            disabled={saving}
          />
          <label htmlFor="is_branded" className="text-sm text-text-primary">
            Show company branding to employees
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={cancelForm}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={isEdit ? handleUpdate : handleCreate}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create program"}
        </button>
      </div>
    </div>
  );

  // ─── Main Content ─────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Programs</h1>
          <p className="text-sm text-text-secondary mt-1">
            Organize employees into cohorts or transition events.
          </p>
        </div>
        {!showCreate && !editingId && (
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setForm(EMPTY_FORM); setError(""); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create program
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && renderForm(false)}

      {/* Programs List */}
      {programs.length === 0 && !showCreate ? (
        <div className="bg-white rounded-lg border border-border p-10 text-center">
          <FolderPlus className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">
            No programs yet. Programs help you organize employees by cohort or event.
          </p>
          <button
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setError(""); }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary-light transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create your first program
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program) =>
            editingId === program.id ? (
              <div key={program.id}>{renderForm(true)}</div>
            ) : (
              <div
                key={program.id}
                className="bg-white rounded-lg border border-border p-5 flex items-center justify-between hover:border-primary/20 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-text-primary">{program.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {program.employee_count} employee{program.employee_count !== 1 ? "s" : ""}
                    </span>
                    <span>
                      Created {new Date(program.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(program)}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-md transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
