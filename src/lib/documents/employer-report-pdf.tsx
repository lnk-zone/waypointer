/**
 * Employer Transition Support Summary — PDF Report
 *
 * 4-page report per MP §10:
 *   Page 1: Cover (company name, title, date)
 *   Page 2: Key Metrics (activation, engagement, interview readiness, satisfaction)
 *   Page 3: Outcome Data (placement rate, time to interview, confidence improvement)
 *   Page 4: Module Usage Breakdown
 *
 * Uses @react-pdf/renderer with Inter font, Waypointer Blue #2563EB.
 */

import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Rect,
} from "@react-pdf/renderer";

// ─── Register Inter font ─────────────────────────────────────────────

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZs.woff",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZs.woff",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZs.woff",
      fontWeight: 700,
    },
  ],
});

// ─── Constants ────────────────────────────────────────────────────────

const BLUE = "#2563EB";
const GRAY_700 = "#374151";
const GRAY_500 = "#6B7280";
const GRAY_200 = "#E5E7EB";
const GRAY_50 = "#F9FAFB";

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 54,
    paddingBottom: 54,
    paddingLeft: 54,
    paddingRight: 54,
    color: GRAY_700,
  },
  // Cover page
  coverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverBrand: {
    fontSize: 14,
    fontWeight: 600,
    color: BLUE,
    marginBottom: 48,
    letterSpacing: 1,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: GRAY_700,
    textAlign: "center",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: GRAY_500,
    textAlign: "center",
    marginBottom: 48,
  },
  coverDate: {
    fontSize: 11,
    color: GRAY_500,
    textAlign: "center",
  },
  coverFooter: {
    position: "absolute",
    bottom: 54,
    left: 54,
    right: 54,
    textAlign: "center",
  },
  coverFooterText: {
    fontSize: 9,
    color: GRAY_500,
  },
  // Section headers
  pageTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: GRAY_700,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
    paddingBottom: 8,
  },
  // Metric card
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: "47%",
    backgroundColor: GRAY_50,
    borderRadius: 6,
    padding: 14,
    borderWidth: 0.5,
    borderColor: GRAY_200,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: GRAY_500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: BLUE,
  },
  metricNote: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 4,
  },
  // Bar chart
  barContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  barLabel: {
    width: 100,
    fontSize: 9,
    fontWeight: 600,
    color: GRAY_700,
  },
  barValue: {
    fontSize: 9,
    color: GRAY_500,
    marginLeft: 8,
    width: 40,
    textAlign: "right",
  },
  // Note block
  noteBlock: {
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  noteText: {
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 36,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: GRAY_500,
  },
});

// ─── Types ────────────────────────────────────────────────────────────

export interface EmployerReportData {
  companyName: string;
  logoUrl: string | null;
  dateRange: string;
  generatedAt: string;
  // Key metrics (Page 2)
  seatsActivated: number;
  totalSeats: number;
  activationRate: number;
  pctEngaged: number;
  pctInterviewReady: number;
  avgSatisfaction: number;
  // Outcome data (Page 3)
  optInPlacementRate: number;
  optInCount: number;
  avgTimeToFirstInterviewDays: number;
  avgTimeToPlacementDays: number;
  avgConfidenceLift: number;
  note: string;
  // Module usage (Page 4)
  moduleUsage: Array<{ module: string; count: number }>;
  mostActivePeriods: Array<{ day: string; count: number }>;
}

// ─── Helper: Simple SVG bar ──────────────────────────────────────────

function BarChart({ data, maxWidth }: { data: Array<{ label: string; value: number }>; maxWidth: number }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.barContainer}>
      {data.map((item, i) => {
        const barWidth = Math.max(4, (item.value / maxValue) * maxWidth);
        return (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Svg width={maxWidth + 4} height={16}>
              <Rect x={0} y={2} width={barWidth} height={12} rx={3} fill={BLUE} />
            </Svg>
            <Text style={styles.barValue}>{item.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Helper: Format percentage ───────────────────────────────────────

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ─── PDF Document ────────────────────────────────────────────────────

export function EmployerReportPDF({ data }: { data: EmployerReportData }) {
  return (
    <Document title={`Transition Support Summary — ${data.companyName}`}>
      {/* ── Page 1: Cover ──────────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.coverContainer}>
          {data.logoUrl ? (
            <Image
              src={data.logoUrl}
              style={{ width: 80, height: 80, marginBottom: 24, objectFit: "contain" }}
            />
          ) : null}
          <Text style={styles.coverBrand}>WAYPOINTER</Text>
          <Text style={styles.coverTitle}>Transition Support Summary</Text>
          <Text style={styles.coverSubtitle}>{data.companyName}</Text>
          <Text style={styles.coverDate}>{data.dateRange}</Text>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            Generated by Waypointer on {data.generatedAt}
          </Text>
        </View>
      </Page>

      {/* ── Page 2: Key Metrics ────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Key Metrics</Text>
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Activation Rate</Text>
            <Text style={styles.metricValue}>{fmtPct(data.activationRate)}</Text>
            <Text style={styles.metricNote}>
              {data.seatsActivated} of {data.totalSeats} seats activated
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Engagement Rate</Text>
            <Text style={styles.metricValue}>{fmtPct(data.pctEngaged)}</Text>
            <Text style={styles.metricNote}>
              Logged in at least 3 times
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Interview Readiness</Text>
            <Text style={styles.metricValue}>{fmtPct(data.pctInterviewReady)}</Text>
            <Text style={styles.metricNote}>
              Completed resume + mock interview
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Satisfaction Score</Text>
            <Text style={styles.metricValue}>{data.avgSatisfaction}/5</Text>
            <Text style={styles.metricNote}>
              Average self-reported score
            </Text>
          </View>
        </View>

        {/* Bar chart visualization of key rates */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: GRAY_700, marginBottom: 10 }}>
            Rate Comparison
          </Text>
          <BarChart
            data={[
              { label: "Activation", value: Math.round(data.activationRate * 100) },
              { label: "Engagement", value: Math.round(data.pctEngaged * 100) },
              { label: "Interview Ready", value: Math.round(data.pctInterviewReady * 100) },
            ]}
            maxWidth={320}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Waypointer — Transition Support Summary</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* ── Page 3: Outcome Data ───────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Outcome Data</Text>
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Placement Rate (Opt-in)</Text>
            <Text style={styles.metricValue}>{fmtPct(data.optInPlacementRate)}</Text>
            <Text style={styles.metricNote}>
              {data.optInCount} self-report{data.optInCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg. Time to First Interview</Text>
            <Text style={styles.metricValue}>{data.avgTimeToFirstInterviewDays} days</Text>
            <Text style={styles.metricNote}>
              From profile creation
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg. Time to Placement</Text>
            <Text style={styles.metricValue}>{data.avgTimeToPlacementDays} days</Text>
            <Text style={styles.metricNote}>
              Of those who self-reported
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Confidence Improvement</Text>
            <Text style={styles.metricValue}>+{data.avgConfidenceLift}</Text>
            <Text style={styles.metricNote}>
              Average lift on 1–5 scale
            </Text>
          </View>
        </View>

        {data.note ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteText}>{data.note}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Waypointer — Transition Support Summary</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>

      {/* ── Page 4: Module Usage ───────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.pageTitle}>Module Usage Breakdown</Text>

        <BarChart
          data={data.moduleUsage.map((m) => ({
            label: m.module,
            value: m.count,
          }))}
          maxWidth={320}
        />

        {data.mostActivePeriods.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: GRAY_700, marginBottom: 12 }}>
              Most Active Periods
            </Text>
            <BarChart
              data={data.mostActivePeriods.map((p) => ({
                label: p.day,
                value: p.count,
              }))}
              maxWidth={320}
            />
          </View>
        ) : null}

        <View style={styles.noteBlock}>
          <Text style={styles.noteText}>
            Module usage counts represent the total number of feature interactions
            across all activated employees. Higher usage indicates stronger
            engagement with that area of the transition support program.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Waypointer — Transition Support Summary</Text>
          <Text style={styles.footerText}>Page 4</Text>
        </View>
      </Page>
    </Document>
  );
}
