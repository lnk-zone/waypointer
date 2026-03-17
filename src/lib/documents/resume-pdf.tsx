/**
 * Professional PDF resume template using @react-pdf/renderer.
 *
 * Design principles (per 2025–2026 best practices):
 * - Single-column layout for ATS compatibility
 * - Clean typography hierarchy with proper spacing
 * - Minimal decoration — content is the focus
 * - Generous whitespace, no clutter
 * - US Letter, 0.55" margins
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

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  black: "#1A1A1A",
  dark: "#2D2D2D",
  body: "#404040",
  muted: "#666666",
  light: "#999999",
  rule: "#CCCCCC",
  ruleLight: "#E0E0E0",
  accent: "#2563EB",
};

// ─── Styles ──────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    color: C.body,
    lineHeight: 1.45,
  },

  // ── Header ──
  headerName: {
    fontSize: 24,
    fontWeight: 700,
    color: C.black,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  headerContact: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.3,
    marginBottom: 14,
  },

  // ── Section divider (thin horizontal rule) ──
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: C.rule,
    marginBottom: 12,
  },

  // ── Section titles ──
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: C.black,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 14,
  },

  // ── Summary ──
  summary: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: C.dark,
    marginBottom: 2,
  },

  // ── Skills (comma-separated, clean) ──
  skillsText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: C.body,
  },
  skillsBold: {
    fontWeight: 600,
  },

  // ── Experience ──
  expBlock: {
    marginBottom: 10,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 1,
  },
  expCompany: {
    fontSize: 10,
    fontWeight: 700,
    color: C.black,
  },
  expDates: {
    fontSize: 8.5,
    color: C.muted,
  },
  expTitle: {
    fontSize: 9.5,
    fontWeight: 600,
    color: C.dark,
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2.5,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    fontSize: 9.5,
    color: C.muted,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: C.body,
  },

  // ── Education ──
  eduBlock: {
    marginBottom: 4,
  },
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  eduDegree: {
    fontSize: 9.5,
    fontWeight: 600,
    color: C.dark,
  },
  eduYear: {
    fontSize: 8.5,
    color: C.muted,
  },
  eduInstitution: {
    fontSize: 9,
    color: C.muted,
  },

  // ── Certifications ──
  certItem: {
    fontSize: 9,
    color: C.body,
    marginBottom: 2,
  },
});

// ─── Types ───────────────────────────────────────────────────────────

export type ResumePDFProps = ResumeDocumentProps;

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
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Name & Contact ── */}
        <Text style={s.headerName}>{employeeName}</Text>
        {contactInfo && <Text style={s.headerContact}>{contactInfo}</Text>}
        <View style={s.rule} />

        {/* ── Summary ── */}
        <Text style={s.sectionTitle}>Summary</Text>
        <Text style={s.summary}>{summaryStatement}</Text>

        {/* ── Skills ── */}
        {skillsSection.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Skills</Text>
            <Text style={s.skillsText}>
              {skillsSection.map((skill, i) => (
                <React.Fragment key={i}>
                  <Text style={s.skillsBold}>{skill}</Text>
                  {i < skillsSection.length - 1 ? "  \u00B7  " : ""}
                </React.Fragment>
              ))}
            </Text>
          </>
        )}

        {/* ── Experience ── */}
        {experienceSection.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Experience</Text>
            {experienceSection.map((exp, i) => (
              <View key={i} style={s.expBlock} wrap={false}>
                <View style={s.expRow}>
                  <Text style={s.expCompany}>{exp.company}</Text>
                  <Text style={s.expDates}>{exp.dates}</Text>
                </View>
                <Text style={s.expTitle}>{exp.title}</Text>
                {exp.bullets.map((bullet, bi) => (
                  <View key={bi} style={s.bullet}>
                    <Text style={s.bulletDot}>{"\u2022"}</Text>
                    <Text style={s.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── Education ── */}
        {educationSection && educationSection.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Education</Text>
            {educationSection.map((edu, i) => (
              <View key={i} style={s.eduBlock}>
                <View style={s.eduRow}>
                  <Text style={s.eduDegree}>
                    {edu.degree && edu.field
                      ? `${edu.degree} in ${edu.field}`
                      : edu.degree ?? edu.field ?? "Degree"}
                  </Text>
                  {edu.year && <Text style={s.eduYear}>{edu.year}</Text>}
                </View>
                <Text style={s.eduInstitution}>{edu.institution}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Certifications ── */}
        {certificationsSection && certificationsSection.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Certifications</Text>
            {certificationsSection.map((cert, i) => (
              <Text key={i} style={s.certItem}>
                {cert}
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
