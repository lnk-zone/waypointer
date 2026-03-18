/**
 * Professional PDF resume template using @react-pdf/renderer.
 *
 * Design: Full-width navy header band + two-column body.
 * - Header: Full-width navy band with name + contact (no cramping)
 * - Left sidebar (30%): Skills, education, certs
 * - Right main area (70%): Summary, experience
 * - ATS-friendly text order
 * - US Letter
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

import type { ResumeDocumentProps } from "@/types/resume";

// ─── Register fonts ──────────────────────────────────────────────────

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

Font.registerHyphenationCallback((word) => [word]);

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  navy: "#1B2A4A",
  navyLight: "#243556",
  accent: "#2563EB",
  accentLight: "#3B82F6",
  white: "#FFFFFF",
  sidebarBg: "#1E293B",
  sidebarText: "#CBD5E1",
  sidebarHeading: "#E2E8F0",
  black: "#111827",
  dark: "#1F2937",
  body: "#374151",
  muted: "#6B7280",
  light: "#9CA3AF",
  border: "#E5E7EB",
};

// ─── Styles ──────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = "30%";
const MAIN_WIDTH = "70%";

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    color: C.body,
    lineHeight: 1.45,
  },

  // ── Full-width Header Band ──
  headerBand: {
    backgroundColor: C.navy,
    paddingTop: 32,
    paddingBottom: 24,
    paddingLeft: 32,
    paddingRight: 32,
  },
  headerName: {
    fontSize: 28,
    fontWeight: 700,
    color: C.white,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerContactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  headerContactItem: {
    fontSize: 9,
    color: C.sidebarText,
    marginRight: 12,
  },
  headerSeparator: {
    fontSize: 9,
    color: C.light,
    marginRight: 12,
  },

  // ── Two-column body ──
  bodyRow: {
    flexDirection: "row",
    flexGrow: 1,
  },

  // ── Sidebar ──
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: C.sidebarBg,
    paddingTop: 20,
    paddingBottom: 32,
    paddingLeft: 24,
    paddingRight: 18,
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.accentLight,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.navyLight,
  },

  // Skills in sidebar
  skillTag: {
    backgroundColor: C.navyLight,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 5,
    marginBottom: 5,
  },
  skillTagText: {
    fontSize: 8,
    color: C.sidebarHeading,
    fontWeight: 600,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  // Education in sidebar
  eduBlock: {
    marginBottom: 10,
  },
  eduDegree: {
    fontSize: 8.5,
    fontWeight: 600,
    color: C.sidebarHeading,
    lineHeight: 1.4,
  },
  eduInstitution: {
    fontSize: 8,
    color: C.sidebarText,
    marginTop: 1,
  },
  eduYear: {
    fontSize: 7.5,
    color: C.light,
    marginTop: 1,
  },

  // Certifications in sidebar
  certItem: {
    fontSize: 8,
    color: C.sidebarText,
    marginBottom: 4,
    lineHeight: 1.4,
  },

  // ── Main Content ──
  main: {
    width: MAIN_WIDTH,
    paddingTop: 20,
    paddingBottom: 32,
    paddingLeft: 28,
    paddingRight: 32,
    backgroundColor: C.white,
  },
  mainSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  mainSectionTitleFirst: {
    marginTop: 0,
  },

  // Summary
  summary: {
    fontSize: 9.5,
    lineHeight: 1.65,
    color: C.dark,
    marginBottom: 4,
  },

  // Experience
  expBlock: {
    marginBottom: 14,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  expCompany: {
    fontSize: 10.5,
    fontWeight: 700,
    color: C.black,
  },
  expDates: {
    fontSize: 8,
    color: C.muted,
    fontWeight: 600,
    marginTop: 2,
  },
  expTitle: {
    fontSize: 9.5,
    fontWeight: 600,
    color: C.accent,
    marginBottom: 5,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 14,
    fontSize: 9.5,
    color: C.accent,
    fontWeight: 700,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.5,
    color: C.body,
  },
});

// ─── Types ───────────────────────────────────────────────────────────

export type ResumePDFProps = ResumeDocumentProps;

// ─── Helpers ─────────────────────────────────────────────────────────

function parseContactInfo(contactInfo: string): string[] {
  return contactInfo
    .split(/\s*[|·•]\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Main Component ─────────────────────────────────────────────────

export function ResumePDF({
  employeeName,
  contactInfo,
  summaryStatement,
  skillsSection,
  experienceSection,
  educationSection,
  certificationsSection,
}: ResumePDFProps) {
  const contactLines = contactInfo ? parseContactInfo(contactInfo) : [];

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ══════════ FULL-WIDTH HEADER BAND ══════════ */}
        <View style={s.headerBand}>
          <Text style={s.headerName}>{employeeName}</Text>
          {contactLines.length > 0 && (
            <View style={s.headerContactRow}>
              {contactLines.map((line, i) => (
                <React.Fragment key={i}>
                  <Text style={s.headerContactItem}>{line}</Text>
                  {i < contactLines.length - 1 && (
                    <Text style={s.headerSeparator}>{"|"}</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* ══════════ TWO-COLUMN BODY ══════════ */}
        <View style={s.bodyRow}>
          {/* ── LEFT SIDEBAR ── */}
          <View style={s.sidebar}>
            {/* Skills */}
            {skillsSection.length > 0 && (
              <>
                <Text style={s.sidebarSectionTitle}>Skills</Text>
                <View style={s.skillsContainer}>
                  {skillsSection.map((skill, i) => (
                    <View key={i} style={s.skillTag}>
                      <Text style={s.skillTagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Education */}
            {educationSection && educationSection.length > 0 && (
              <>
                <Text style={s.sidebarSectionTitle}>Education</Text>
                {educationSection.map((edu, i) => (
                  <View key={i} style={s.eduBlock}>
                    <Text style={s.eduDegree}>
                      {edu.degree && edu.field
                        ? `${edu.degree} in ${edu.field}`
                        : edu.degree ?? edu.field ?? "Degree"}
                    </Text>
                    <Text style={s.eduInstitution}>{edu.institution}</Text>
                    {edu.year && <Text style={s.eduYear}>{edu.year}</Text>}
                  </View>
                ))}
              </>
            )}

            {/* Certifications */}
            {certificationsSection && certificationsSection.length > 0 && (
              <>
                <Text style={s.sidebarSectionTitle}>Certifications</Text>
                {certificationsSection.map((cert, i) => (
                  <Text key={i} style={s.certItem}>
                    {cert}
                  </Text>
                ))}
              </>
            )}
          </View>

          {/* ── RIGHT MAIN CONTENT ── */}
          <View style={s.main}>
            {/* Summary */}
            <Text style={[s.mainSectionTitle, s.mainSectionTitleFirst]}>
              Professional Summary
            </Text>
            <Text style={s.summary}>{summaryStatement}</Text>

            {/* Experience */}
            {experienceSection.length > 0 && (
              <>
                <Text style={s.mainSectionTitle}>Experience</Text>
                {experienceSection.map((exp, i) => (
                  <View key={i} style={s.expBlock} wrap={false}>
                    <View style={s.expHeader}>
                      <Text style={s.expCompany}>{exp.company}</Text>
                      <Text style={s.expDates}>{exp.dates}</Text>
                    </View>
                    <Text style={s.expTitle}>{exp.title}</Text>
                    {exp.bullets.map((bullet, bi) => (
                      <View key={bi} style={s.bullet}>
                        <Text style={s.bulletDot}>{"\u25CF"}</Text>
                        <Text style={s.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
