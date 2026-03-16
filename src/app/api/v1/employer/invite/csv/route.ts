/**
 * POST /api/v1/employer/invite/csv
 *
 * Parses a CSV file upload, validates rows, deduplicates, and creates
 * seat records. Expected columns: employee_name, email, department,
 * role_family, last_day.
 *
 * Uses Node.js Runtime — file upload handling.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployer,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

// ─── Types ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow {
  employee_name: string;
  email: string;
  department: string;
  role_family: string;
  last_day: string;
}

interface RowError {
  row: number;
  email: string;
  reason: string;
}

interface ProgramRecord {
  id: string;
  company_id: string;
  total_seats: number;
  used_seats: number;
}

// ─── CSV Parser ───────────────────────────────────────────────────────

/**
 * Splits a CSV line respecting quoted fields.
 * Handles fields like: "Sales, East Coast" correctly.
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: RowError[] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, email: "", reason: "CSV file is empty or has no data rows" }] };
  }

  // Parse header
  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  const emailIdx = header.indexOf("email");
  const nameIdx = header.indexOf("employee_name");
  const deptIdx = header.indexOf("department");
  const roleIdx = header.indexOf("role_family");
  const lastDayIdx = header.indexOf("last_day");

  if (emailIdx === -1) {
    return { rows: [], errors: [{ row: 1, email: "", reason: "Missing required 'email' column in CSV header" }] };
  }

  if (nameIdx === -1) {
    return { rows: [], errors: [{ row: 1, email: "", reason: "Missing required 'employee_name' column in CSV header" }] };
  }

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    const name = (cols[nameIdx] ?? "").trim();

    if (!email) {
      errors.push({ row: i + 1, email: "", reason: "Missing email" });
      continue;
    }

    if (!EMAIL_RE.test(email)) {
      errors.push({ row: i + 1, email, reason: "Invalid email format" });
      continue;
    }

    if (!name) {
      errors.push({ row: i + 1, email, reason: "Missing employee name" });
      continue;
    }

    rows.push({
      employee_name: name,
      email,
      department: deptIdx >= 0 ? (cols[deptIdx] ?? "").trim() : "",
      role_family: roleIdx >= 0 ? (cols[roleIdx] ?? "").trim() : "",
      last_day: lastDayIdx >= 0 ? (cols[lastDayIdx] ?? "").trim() : "",
    });
  }

  return { rows, errors };
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployer(auth);
  if (roleError) return roleError;

  if (!auth.companyId) {
    return apiError(
      ERROR_CODES.NOT_FOUND,
      "No company found. Please complete company setup first."
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const programId = formData.get("program_id");

    if (!file || !(file instanceof File)) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "CSV file is required");
    }

    if (!programId || typeof programId !== "string") {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "Program ID is required");
    }

    // Validate file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "File must be a CSV (.csv)"
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "CSV file must be under 5MB"
      );
    }

    const csvText = await file.text();
    const { rows, errors: parseErrors } = parseCSV(csvText);

    if (parseErrors.length > 0 && rows.length === 0) {
      return apiError(ERROR_CODES.VALIDATION_ERROR, "No valid rows in CSV", {
        errors: parseErrors,
      });
    }

    const supabase = createServiceClient();

    // Verify program belongs to this company
    const { data: rawProgram, error: programError } = await supabase
      .from("transition_programs")
      .select("id, company_id, total_seats, used_seats")
      .eq("id", programId)
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .single();

    if (programError || !rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "Active transition program not found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    // Deduplicate within the CSV
    const seenEmails = new Set<string>();
    const uniqueRows: ParsedRow[] = [];
    let skippedDuplicates = 0;

    for (const row of rows) {
      if (seenEmails.has(row.email)) {
        skippedDuplicates++;
        continue;
      }
      seenEmails.add(row.email);
      uniqueRows.push(row);
    }

    // Check for existing seats in batches to avoid URL length limits
    const existingEmails = new Set<string>();
    if (uniqueRows.length > 0) {
      const emailList = uniqueRows.map((r) => r.email);
      const BATCH_SIZE = 50;
      for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
        const batch = emailList.slice(i, i + BATCH_SIZE);
        const { data: existingSeats } = await supabase
          .from("seats")
          .select("employee_email")
          .eq("program_id", programId)
          .in("employee_email", batch);

        if (existingSeats) {
          for (const seat of existingSeats as unknown as Array<{ employee_email: string }>) {
            existingEmails.add(seat.employee_email);
          }
        }
      }
    }

    const newRows = uniqueRows.filter((row) => {
      if (existingEmails.has(row.email)) {
        skippedDuplicates++;
        return false;
      }
      return true;
    });

    // Check seat availability
    const availableSeats = program.total_seats - program.used_seats;
    if (newRows.length > availableSeats) {
      return apiError(
        ERROR_CODES.VALIDATION_ERROR,
        `You have ${availableSeats} seat${availableSeats !== 1 ? "s" : ""} remaining. Purchase additional seats to continue.`
      );
    }

    // Atomically increment used_seats before creating records
    let invited = 0;
    if (newRows.length > 0) {
      const { error: rpcError } = await supabase.rpc(
        "increment_used_seats_batch",
        { p_program_id: programId, p_count: newRows.length }
      );

      if (rpcError) {
        return apiError(
          ERROR_CODES.VALIDATION_ERROR,
          `You have ${availableSeats} seat${availableSeats !== 1 ? "s" : ""} remaining. Purchase additional seats to continue.`
        );
      }

      // Create seat records
      const seatRecords = newRows.map((row) => ({
        program_id: programId,
        employee_email: row.email,
        employee_name: row.employee_name || null,
        department: row.department || null,
        role_family: row.role_family || null,
        last_day: row.last_day || null,
        status: "invited" as const,
      }));

      const { error: insertError } = await supabase
        .from("seats")
        .insert(seatRecords);

      if (insertError) {
        // Rollback: decrement used_seats
        Promise.resolve(supabase.rpc("increment_used_seats_batch", {
          p_program_id: programId,
          p_count: -newRows.length,
        })).catch(() => {});
        return apiError(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create seat records"
        );
      }

      invited = newRows.length;
    }

    return NextResponse.json({
      data: {
        invited,
        skipped_duplicates: skippedDuplicates,
        skipped_invalid: parseErrors.length,
        errors: parseErrors,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to process CSV upload"
    );
  }
}
