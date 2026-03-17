/**
 * Professional DOCX resume builder using the `docx` npm package.
 * Clean, modern design with blue accent color, proper typography hierarchy,
 * and ATS-friendly structure. US Letter, 0.6" margins.
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  convertInchesToTwip,
  TabStopPosition,
  TabStopType,
  BorderStyle,
  ShadingType,
} from "docx";

import type { ResumeDocumentProps } from "@/types/resume";

export type ResumeDocxProps = ResumeDocumentProps;

// ─── Colors ──────────────────────────────────────────────────────────

const BLUE = "2563EB";       // Waypointer Blue
const TEXT = "111827";         // Gray-900
const TEXT_SECONDARY = "4B5563"; // Gray-600
const TEXT_MUTED = "6B7280";   // Gray-500
const SKILL_BG = "F3F4F6";    // Gray-100
const BORDER = "D1D5DB";      // Gray-300

// ─── Builder ─────────────────────────────────────────────────────────

export async function buildResumeDocx(
  props: ResumeDocxProps
): Promise<Buffer> {
  const {
    employeeName,
    contactInfo,
    summaryStatement,
    skillsSection,
    experienceSection,
    educationSection,
    certificationsSection,
  } = props;

  const children: Paragraph[] = [];

  // ── Name (large, bold, dark) ──
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: employeeName,
          bold: true,
          size: 44, // 22pt
          color: TEXT,
          font: "Inter",
        }),
      ],
    })
  );

  // ── Contact info ──
  if (contactInfo) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: contactInfo,
            size: 18, // 9pt
            color: TEXT_MUTED,
            font: "Inter",
          }),
        ],
      })
    );
  }

  // ── Blue divider line ──
  children.push(blueRule());

  // ── Summary ──
  children.push(sectionHeader("PROFESSIONAL SUMMARY"));
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: summaryStatement,
          size: 19, // 9.5pt
          color: TEXT_SECONDARY,
          font: "Inter",
        }),
      ],
    })
  );

  // ── Core Competencies (skills as inline tags) ──
  if (skillsSection.length > 0) {
    children.push(sectionHeader("CORE COMPETENCIES"));

    // Create skills as a formatted paragraph with pipe separators
    const skillRuns: TextRun[] = [];
    skillsSection.forEach((skill, i) => {
      skillRuns.push(
        new TextRun({
          text: skill,
          bold: true,
          size: 18,
          color: TEXT_SECONDARY,
          font: "Inter",
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: SKILL_BG,
          },
        })
      );
      if (i < skillsSection.length - 1) {
        skillRuns.push(
          new TextRun({
            text: "  \u00B7  ", // middle dot separator
            size: 18,
            color: BORDER,
            font: "Inter",
          })
        );
      }
    });

    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: skillRuns,
      })
    );
  }

  // ── Thin divider ──
  children.push(thinRule());

  // ── Experience ──
  if (experienceSection.length > 0) {
    children.push(sectionHeader("PROFESSIONAL EXPERIENCE"));

    for (const exp of experienceSection) {
      // Company name (bold, dark)
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              size: 21, // 10.5pt
              color: TEXT,
              font: "Inter",
            }),
            new TextRun({
              text: `\t${exp.dates}`,
              size: 17,
              color: TEXT_MUTED,
              font: "Inter",
            }),
          ],
        })
      );

      // Title (blue, semibold)
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 19,
              color: BLUE,
              font: "Inter",
            }),
          ],
        })
      );

      // Bullets
      for (const bullet of exp.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: bullet,
                size: 19,
                color: TEXT_SECONDARY,
                font: "Inter",
              }),
            ],
          })
        );
      }
    }
  }

  // ── Education ──
  if (educationSection && educationSection.length > 0) {
    children.push(sectionHeader("EDUCATION"));

    for (const edu of educationSection) {
      const degreeText =
        edu.degree && edu.field
          ? `${edu.degree} in ${edu.field}`
          : edu.degree ?? edu.field ?? "Degree";

      children.push(
        new Paragraph({
          spacing: { after: 40 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({
              text: degreeText,
              bold: true,
              size: 19,
              color: TEXT,
              font: "Inter",
            }),
            ...(edu.year
              ? [
                  new TextRun({
                    text: `\t${edu.year}`,
                    size: 17,
                    color: TEXT_MUTED,
                    font: "Inter",
                  }),
                ]
              : []),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: edu.institution,
              size: 18,
              color: TEXT_SECONDARY,
              font: "Inter",
            }),
          ],
        })
      );
    }
  }

  // ── Certifications ──
  if (certificationsSection && certificationsSection.length > 0) {
    children.push(sectionHeader("CERTIFICATIONS"));

    for (const cert of certificationsSection) {
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: cert,
              size: 19,
              color: TEXT_SECONDARY,
              font: "Inter",
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Inter",
            size: 19,
            color: TEXT,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "default-bullet",
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.25),
                    hanging: convertInchesToTwip(0.15),
                  },
                },
                run: {
                  color: BLUE,
                  font: "Inter",
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text: "\u258C ", // left block character for visual accent
        size: 22,
        color: BLUE,
        font: "Inter",
      }),
      new TextRun({
        text,
        bold: true,
        size: 22, // 11pt
        color: BLUE,
        font: "Inter",
      }),
    ],
  });
}

function blueRule(): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    border: {
      bottom: {
        color: BLUE,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 12, // 1.5pt
      },
    },
    children: [],
  });
}

function thinRule(): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    border: {
      bottom: {
        color: "E5E7EB",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 4,
      },
    },
    children: [],
  });
}
