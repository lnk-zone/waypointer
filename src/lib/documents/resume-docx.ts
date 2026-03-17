/**
 * Professional DOCX resume builder using the `docx` npm package.
 *
 * Design principles (per 2025–2026 best practices):
 * - Single-column layout for ATS compatibility
 * - Clean typography hierarchy with proper spacing
 * - Minimal decoration — content is the focus
 * - Generous whitespace, no clutter
 * - US Letter, 0.55" margins
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
} from "docx";

import type { ResumeDocumentProps } from "@/types/resume";

export type ResumeDocxProps = ResumeDocumentProps;

// ─── Colors ──────────────────────────────────────────────────────────

const BLACK = "1A1A1A";
const DARK = "2D2D2D";
const BODY = "404040";
const MUTED = "666666";
const RULE = "CCCCCC";

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

  // ── Name ──
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: employeeName,
          bold: true,
          size: 48, // 24pt
          color: BLACK,
          font: "Inter",
        }),
      ],
    })
  );

  // ── Contact ──
  if (contactInfo) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: contactInfo,
            size: 18, // 9pt
            color: MUTED,
            font: "Inter",
          }),
        ],
      })
    );
  }

  // ── Divider ──
  children.push(horizontalRule());

  // ── Summary ──
  children.push(sectionTitle("SUMMARY"));
  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: summaryStatement,
          size: 19, // 9.5pt
          color: DARK,
          font: "Inter",
        }),
      ],
    })
  );

  // ── Skills ──
  if (skillsSection.length > 0) {
    children.push(sectionTitle("SKILLS"));

    const skillRuns: TextRun[] = [];
    skillsSection.forEach((skill, i) => {
      skillRuns.push(
        new TextRun({
          text: skill,
          bold: true,
          size: 18,
          color: BODY,
          font: "Inter",
        })
      );
      if (i < skillsSection.length - 1) {
        skillRuns.push(
          new TextRun({
            text: "  \u00B7  ",
            size: 18,
            color: MUTED,
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
    children.push(sectionTitle("EXPERIENCE"));

    for (const exp of experienceSection) {
      // Company + Dates (right-aligned)
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 20 },
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
              size: 20, // 10pt
              color: BLACK,
              font: "Inter",
            }),
            new TextRun({
              text: `\t${exp.dates}`,
              size: 17,
              color: MUTED,
              font: "Inter",
            }),
          ],
        })
      );

      // Title
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: 19,
              color: DARK,
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
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: bullet,
                size: 19,
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
    children.push(sectionTitle("EDUCATION"));

    for (const edu of educationSection) {
      const degreeText =
        edu.degree && edu.field
          ? `${edu.degree} in ${edu.field}`
          : edu.degree ?? edu.field ?? "Degree";

      children.push(
        new Paragraph({
          spacing: { after: 20 },
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
    children.push(sectionTitle("CERTIFICATIONS"));

    for (const cert of certificationsSection) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: cert,
              size: 19,
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
                  color: MUTED,
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
              top: convertInchesToTwip(0.55),
              bottom: convertInchesToTwip(0.55),
              left: convertInchesToTwip(0.55),
              right: convertInchesToTwip(0.55),
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

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 20, // 10pt
        color: BLACK,
        font: "Inter",
        characterSpacing: 60, // ~1.5pt letter spacing
      }),
    ],
  });
}

function horizontalRule(): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    border: {
      bottom: {
        color: RULE,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [],
  });
}
