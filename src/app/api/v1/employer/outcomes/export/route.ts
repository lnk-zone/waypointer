/**
 * GET /api/v1/employer/outcomes/export
 *
 * Generates a PDF summary report or CSV data export for the employer's
 * transition program outcomes.
 *
 * Query params: ?format=pdf | csv
 *
 * Uses Node.js Runtime — document generation libraries require Node APIs.
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
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  EmployerReportPDF,
  type EmployerReportData,
} from "@/lib/documents/employer-report-pdf";
import React from "react";
import {
  computeOutcomeMetrics,
  type ProgramRecord,
  type SeatRecord,
} from "@/lib/employer/outcome-metrics";

const querySchema = z.object({
  format: z.enum(["pdf", "csv"]),
});

const GENERATION_TIMEOUT_MS = 30000;

// ─── Types ────────────────────────────────────────────────────────────

interface CompanyRecord {
  id: string;
  name: string;
  logo_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeCSVField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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

  // Validate query params (outside try block so format is available in catch)
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    format: url.searchParams.get("format"),
  });

  if (!parsed.success) {
    return apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Query parameter 'format' must be 'pdf' or 'csv'"
    );
  }

  const { format } = parsed.data;

  try {
    const supabase = createServiceClient();

    // ── Fetch program ─────────────────────────────────────────────────
    const { data: rawProgram } = await supabase
      .from("transition_programs")
      .select("id, company_id, total_seats, access_duration_days, created_at")
      .eq("company_id", auth.companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!rawProgram) {
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No active transition program found"
      );
    }

    const program = rawProgram as unknown as ProgramRecord;

    // ── Fetch company ─────────────────────────────────────────────────
    const { data: rawCompany } = await supabase
      .from("companies")
      .select("id, name, logo_url")
      .eq("id", auth.companyId)
      .single();

    const company = (rawCompany as unknown as CompanyRecord | null) ?? {
      id: auth.companyId,
      name: "Company",
      logo_url: null,
    };

    // ── Fetch seats ───────────────────────────────────────────────────
    const { data: rawSeats } = await supabase
      .from("seats")
      .select("id, status, activated_at")
      .eq("program_id", program.id);

    const seats = (rawSeats as unknown as SeatRecord[] | null) ?? [];
    const activeSeatIds = seats
      .filter((s) => s.status === "activated" || s.status === "active")
      .map((s) => s.id);
    const seatsActivated = activeSeatIds.length;

    if (seatsActivated === 0) {
      if (format === "csv") {
        const csv = "Metric,Value\nNote,No employees have activated yet\n";
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="usage-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }
      return apiError(
        ERROR_CODES.NOT_FOUND,
        "No employees have activated. Cannot generate a report."
      );
    }

    // ── Compute metrics via shared utility ─────────────────────────────
    const metrics = await computeOutcomeMetrics(
      supabase,
      program,
      activeSeatIds,
      seatsActivated
    );

    // Company logo presigned URL
    let logoUrl: string | null = null;
    if (company.logo_url) {
      const { data: signedData } = await supabase.storage
        .from("waypointer-files")
        .createSignedUrl(company.logo_url, 300);
      logoUrl = signedData?.signedUrl ?? null;
    }

    // ── Generate output ───────────────────────────────────────────────

    const now = new Date();
    const programStart = new Date(program.created_at);
    const dateRange = `${formatDate(programStart)} — ${formatDate(now)}`;

    if (format === "csv") {
      const rows: string[][] = [
        ["Metric", "Value", "Notes"],
        ["Company", company.name, ""],
        ["Report Date", formatDate(now), ""],
        ["Date Range", dateRange, ""],
        [""],
        ["Key Metrics", "", ""],
        [
          "Activation Rate",
          `${Math.round(metrics.activationRate * 100)}%`,
          `${metrics.seatsActivated} of ${program.total_seats} seats`,
        ],
        [
          "Engagement Rate",
          `${Math.round(metrics.pctEngaged * 100)}%`,
          "Logged in 3+ times",
        ],
        [
          "Interview Readiness",
          `${Math.round(metrics.pctInterviewReady * 100)}%`,
          "Resume + mock interview",
        ],
        [
          "Satisfaction Score",
          `${metrics.avgSatisfaction}/5`,
          "Average self-reported",
        ],
        [""],
        ["Outcome Data", "", ""],
        [
          "Placement Rate (Opt-in)",
          `${Math.round(metrics.optInPlacementRate * 100)}%`,
          `${metrics.optInCount} reports`,
        ],
        [
          "Avg. Time to First Interview",
          `${metrics.avgTimeToFirstInterview} days`,
          "",
        ],
        [
          "Avg. Time to Placement",
          `${metrics.avgTimeToPlacement} days`,
          "Self-reported",
        ],
        [
          "Confidence Improvement",
          `+${metrics.avgConfidenceLift}`,
          "On 1–5 scale",
        ],
        [""],
        ["Module Usage", "Count", ""],
        ...metrics.moduleUsage.map((m) => [m.module, String(m.count), ""]),
        [""],
        ["Most Active Days", "Activity Count", ""],
        ...metrics.mostActivePeriods.map((p) => [p.day, String(p.count), ""]),
        [""],
        ["Note", metrics.note, ""],
      ];

      const csv = rows
        .map((row) => row.map(escapeCSVField).join(","))
        .join("\n");

      const fileName = `usage-${now.toISOString().slice(0, 10)}.csv`;

      // Upload to Supabase Storage
      const storagePath = `reports/${auth.companyId}/${fileName}`;
      await supabase.storage
        .from("waypointer-files")
        .upload(storagePath, Buffer.from(csv, "utf-8"), {
          contentType: "text/csv",
          upsert: true,
        });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // ── PDF generation ────────────────────────────────────────────────

    const reportData: EmployerReportData = {
      companyName: company.name,
      logoUrl,
      dateRange,
      generatedAt: formatDate(now),
      seatsActivated: metrics.seatsActivated,
      totalSeats: program.total_seats,
      activationRate: metrics.activationRate,
      pctEngaged: metrics.pctEngaged,
      pctInterviewReady: metrics.pctInterviewReady,
      avgSatisfaction: metrics.avgSatisfaction,
      optInPlacementRate: metrics.optInPlacementRate,
      optInCount: metrics.optInCount,
      avgTimeToFirstInterviewDays: metrics.avgTimeToFirstInterview,
      avgTimeToPlacementDays: metrics.avgTimeToPlacement,
      avgConfidenceLift: metrics.avgConfidenceLift,
      note: metrics.note,
      moduleUsage: metrics.moduleUsage,
      mostActivePeriods: metrics.mostActivePeriods,
    };

    const pdfElement = React.createElement(EmployerReportPDF, {
      data: reportData,
    });

    const generationPromise = renderToBuffer(
      pdfElement as unknown as React.ReactElement
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("PDF generation timed out")),
        GENERATION_TIMEOUT_MS
      )
    );

    const pdfBuffer = await Promise.race([generationPromise, timeoutPromise]);
    const fileBuffer = Buffer.from(pdfBuffer);

    // Upload to Supabase Storage
    const fileName = `summary-${now.toISOString().slice(0, 10)}.pdf`;
    const storagePath = `reports/${auth.companyId}/${fileName}`;

    await supabase.storage
      .from("waypointer-files")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      `Failed to generate ${format} export`
    );
  }
}
