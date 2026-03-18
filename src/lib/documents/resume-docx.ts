/**
 * Professional DOCX resume builder using the `docx` npm package.
 *
 * Design: Clean modern layout with colored header band and accent highlights.
 * - Full-width navy header with name and contact in white
 * - Blue accent section headers with bottom borders
 * - Skills displayed as inline tags
 * - Clean typography with Inter font
 * - ATS-compatible single-column layout
 * - US Letter, balanced margins
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

const NAVY = "1B2A4A";
const ACCENT = "2563EB";
const WHITE = "FFFFFF";
const BLACK = "111827";
const DARK = "1F2937";
const BODY = "374151";
const MUTED = "6B7280";
const BORDER = "E5E7EB";
const SKILL_BG = "EFF6FF";
const SKILL_TEXT = "1E40AF";

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

  // ── Header Band (Navy background with name + contact) ──
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      children: [
        new TextRun({
          text: " ",
          size: 12,
          color: NAVY,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 40 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      children: [
        new TextRun({
          text: employeeName,
          bold: true,
          size: 48,
          color: WHITE,
          font: "Inter",
        }),
      ],
    })
  );

  if (contactInfo) {
    const parts = contactInfo
      .split(/\s*[|·•]\s*|\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    const contactRuns: TextRun[] = [];
    parts.forEach((part, i) => {
      contactRuns.push(
        new TextRun({
          text: part,
          size: 18,
          color: WHITE,
          font: "Inter",
        })
      );
      if (i < parts.length - 1) {
        contactRuns.push(
          new TextRun({
            text: "    \u007C    ",
            size: 18,
            color: "94A3B8",
            font: "Inter",
          })
        );
      }
    });

    children.push(
      new Paragraph({
        spacing: { before: 0, after: 200 },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: contactRuns,
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      children: [
        new TextRun({
          text: " ",
          size: 12,
          color: NAVY,
        }),
      ],
    })
  );

  // Spacer
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 0 },
      children: [],
    })
  );

  // ── Professional Summary ──
  children.push(accentSectionTitle("PROFESSIONAL SUMMARY"));
  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: summaryStatement,
          size: 19,
          color: DARK,
          font: "Inter",
        }),
      ],
    })
  );

  // ── Skills ──
  if (skillsSection.length > 0) {
    children.push(accentSectionTitle("SKILLS"));

    const skillRuns: TextRun[] = [];
    skillsSection.forEach((skill, i) => {
      skillRuns.push(
        new TextRun({
          text: skill,
          bold: true,
          size: 18,
          color: SKILL_TEXT,
          font: "Inter",
          shading: { type: ShadingType.SOLID, color: SKILL_BG, fill: SKILL_BG },
        })
      );
      if (i < skillsSection.length - 1) {
        skillRuns.push(
          new TextRun({
            text: "    ",
            size: 18,
            color: BODY,
            font: "Inter",
          })
        );
      }
    });

    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: skillRuns,
      })
    );
  }

  // ── Experience ──
  if (experienceSection.length > 0) {
    children.push(accentSectionTitle("EXPERIENCE"));

    for (const exp of experienceSection) {
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
              size: 21,
              color: BLACK,
              font: "Inter",
            }),
            new TextRun({
              text: `\t${exp.dates}`,
              size: 17,
              color: MUTED,
              font: "Inter",
              bold: true,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 19,
              color: ACCENT,
              font: "Inter",
            }),
          ],
        })
      );

      for (const bullet of exp.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: bullet,
                size: 18,
                color: BODY,
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
    children.push(accentSectionTitle("EDUCATION"));

    for (const edu of educationSection) {
      const degreeText =
        edu.degree && edu.field
          ? `${edu.degree} in ${edu.field}`
          : edu.degree ?? edu.field ?? "Degree";

      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
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
              color: DARK,
              font: "Inter",
            }),
            ...(edu.year
              ? [
                  new TextRun({
                    text: `\t${edu.year}`,
                    size: 17,
                    color: MUTED,
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
              color: MUTED,
              font: "Inter",
            }),
          ],
        })
      );
    }
  }

  // ── Certifications ──
  if (certificationsSection && certificationsSection.length > 0) {
    children.push(accentSectionTitle("CERTIFICATIONS"));

    for (const cert of certificationsSection) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: "\u25CF  ",
              size: 16,
              color: ACCENT,
              font: "Inter",
            }),
            new TextRun({
              text: cert,
              size: 18,
              color: BODY,
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
            color: BODY,
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
              text: "\u25CF",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.3),
                    hanging: convertInchesToTwip(0.18),
                  },
                },
                run: {
                  color: ACCENT,
                  font: "Inter",
                  size: 16,
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
              top: convertInchesToTwip(0),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
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

function accentSectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: {
        color: BORDER,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 8,
      },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: ACCENT,
        font: "Inter",
        characterSpacing: 80,
      }),
    ],
  });
}
