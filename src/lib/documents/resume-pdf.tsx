/**
 * Professional PDF resume template using @react-pdf/renderer.
 * Clean, modern design with Waypointer Blue accent, proper typography hierarchy,
 * and ATS-friendly structure. US Letter, 0.6" margins, Inter font.
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

// ─── Colors ──────────────────────────────────────────────────────────

const COLORS = {
  primary: "#2563EB",     // Waypointer Blue
  primaryLight: "#EFF6FF", // Blue-50
  text: "#111827",         // Gray-900
  textSecondary: "#4B5563", // Gray-600
  textMuted: "#6B7280",    // Gray-500
  border: "#D1D5DB",       // Gray-300
  borderLight: "#E5E7EB",  // Gray-200
  white: "#FFFFFF",
  skillBg: "#F3F4F6",      // Gray-100
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    paddingTop: 43,    // ~0.6"
    paddingBottom: 43,
    paddingLeft: 43,
    paddingRight: 43,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // ── Header ──
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  contact: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },

  // ── Sections ──
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionHeaderBar: {
    width: 3,
    height: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ── Summary ──
  summary: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: COLORS.textSecondary,
  },

  // ── Skills ──
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  skillPill: {
    backgroundColor: COLORS.skillBg,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8.5,
    fontWeight: 600,
    color: COLORS.textSecondary,
  },

  // ── Experience ──
  expBlock: {
    marginBottom: 10,
  },
  expHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  expLeft: {
    flex: 1,
  },
  expCompany: {
    fontSize: 10.5,
    fontWeight: 700,
    color: COLORS.text,
  },
  expTitle: {
    fontSize: 9.5,
    fontWeight: 600,
    color: COLORS.primary,
    marginTop: 1,
  },
  expDates: {
    fontSize: 8.5,
    color: COLORS.textMuted,
    textAlign: "right",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 14,
    fontSize: 9.5,
    color: COLORS.primary,
    fontWeight: 700,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: COLORS.textSecondary,
  },

  // ── Education / Certs ──
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eduDegree: {
    fontSize: 9.5,
    fontWeight: 600,
    color: COLORS.text,
  },
  eduInstitution: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  eduYear: {
    fontSize: 8.5,
    color: COLORS.textMuted,
  },
  certItem: {
    fontSize: 9.5,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },

  // ── Divider ──
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
    marginBottom: 14,
  },
});

// ─── Types ───────────────────────────────────────────────────────────

export type ResumePDFProps = ResumeDocumentProps;

// ─── Section Header Component ────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderBar} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
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
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header — Name + Contact with blue bottom border */}
        <View style={styles.header}>
          <Text style={styles.name}>{employeeName}</Text>
          {contactInfo && <Text style={styles.contact}>{contactInfo}</Text>}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <SectionHeader title="Professional Summary" />
          <Text style={styles.summary}>{summaryStatement}</Text>
        </View>

        {/* Skills as pills */}
        {skillsSection.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Core Competencies" />
            <View style={styles.skillsContainer}>
              {skillsSection.map((skill, i) => (
                <Text key={i} style={styles.skillPill}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Experience */}
        {experienceSection.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Professional Experience" />
            {experienceSection.map((exp, i) => (
              <View key={i} style={styles.expBlock}>
                <View style={styles.expHeaderRow}>
                  <View style={styles.expLeft}>
                    <Text style={styles.expCompany}>{exp.company}</Text>
                    <Text style={styles.expTitle}>{exp.title}</Text>
                  </View>
                  <Text style={styles.expDates}>{exp.dates}</Text>
                </View>
                {exp.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>&#8226;</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {educationSection && educationSection.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Education" />
            {educationSection.map((edu, i) => (
              <View key={i} style={styles.eduRow}>
                <View>
                  <Text style={styles.eduDegree}>
                    {edu.degree && edu.field
                      ? `${edu.degree} in ${edu.field}`
                      : edu.degree ?? edu.field ?? "Degree"}
                  </Text>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                </View>
                {edu.year && <Text style={styles.eduYear}>{edu.year}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certificationsSection && certificationsSection.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Certifications" />
            {certificationsSection.map((cert, i) => (
              <Text key={i} style={styles.certItem}>
                {cert}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
