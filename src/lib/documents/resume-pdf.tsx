/**
 * PDF resume template using @react-pdf/renderer.
 * Layout follows MP §10: US Letter, 0.75" margins, Inter typography.
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

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 54, // 0.75"
    paddingBottom: 54,
    paddingLeft: 54,
    paddingRight: 54,
    color: "#111827",
  },
  // Name block
  nameBlock: {
    textAlign: "center",
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  contact: {
    fontSize: 10,
    color: "#6B7280",
  },
  // Section
  sectionHeader: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12,
    color: "#111827",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 3,
  },
  // Summary
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  // Skills
  skills: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  // Experience
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  expTitleCompany: {
    fontSize: 10,
    fontWeight: 600,
  },
  expDates: {
    fontSize: 9,
    color: "#6B7280",
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 3,
    paddingLeft: 12,
  },
  bulletDot: {
    position: "absolute",
    left: 0,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bulletDotText: {
    width: 12,
    fontSize: 10,
    lineHeight: 1.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
  },
  // Education / Certs
  eduItem: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  expBlock: {
    marginBottom: 8,
  },
});

// ─── Types ───────────────────────────────────────────────────────────

import type { ResumeDocumentProps } from "@/types/resume";

export type ResumePDFProps = ResumeDocumentProps;

// ─── Component ───────────────────────────────────────────────────────

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
        {/* Name and contact */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{employeeName}</Text>
          {contactInfo && <Text style={styles.contact}>{contactInfo}</Text>}
        </View>

        {/* Summary */}
        <Text style={styles.sectionHeader}>Summary</Text>
        <Text style={styles.summary}>{summaryStatement}</Text>

        {/* Key Skills */}
        {skillsSection.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Key Skills</Text>
            <Text style={styles.skills}>{skillsSection.join(", ")}</Text>
          </>
        )}

        {/* Experience */}
        {experienceSection.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Experience</Text>
            {experienceSection.map((exp, i) => (
              <View key={i} style={styles.expBlock}>
                <View style={styles.expHeader}>
                  <Text style={styles.expTitleCompany}>
                    {exp.company} — {exp.title}
                  </Text>
                  <Text style={styles.expDates}>{exp.dates}</Text>
                </View>
                {exp.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bulletRow}>
                    <Text style={styles.bulletDotText}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {educationSection && educationSection.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Education</Text>
            {educationSection.map((edu, i) => (
              <Text key={i} style={styles.eduItem}>
                {edu.degree && edu.field
                  ? `${edu.degree} in ${edu.field}`
                  : edu.degree ?? edu.field ?? "Degree"}{" "}
                — {edu.institution}
                {edu.year ? `, ${edu.year}` : ""}
              </Text>
            ))}
          </>
        )}

        {/* Certifications */}
        {certificationsSection && certificationsSection.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Certifications</Text>
            {certificationsSection.map((cert, i) => (
              <Text key={i} style={styles.eduItem}>
                {cert}
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
