/**
 * DOCX resume builder using the `docx` npm package.
 * Uses standard Word styles for ATS compatibility per MP §10.
 * No tables, no text boxes, no headers/footers for content.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  convertInchesToTwip,
  TabStopPosition,
  TabStopType,
} from "docx";

// ─── Types ───────────────────────────────────────────────────────────

import type { ResumeDocumentProps } from "@/types/resume";

export type ResumeDocxProps = ResumeDocumentProps;

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

  // Name (Heading 1, centered)
  children.push(
    new Paragraph({
      text: employeeName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact info
  if (contactInfo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactInfo,
            size: 20, // 10pt
            color: "6B7280",
          }),
        ],
      })
    );
  }

  // Summary section
  children.push(sectionHeader("SUMMARY"));
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: summaryStatement,
          size: 20,
        }),
      ],
    })
  );

  // Key Skills section
  if (skillsSection.length > 0) {
    children.push(sectionHeader("KEY SKILLS"));
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: skillsSection.join(", "),
            size: 20,
          }),
        ],
      })
    );
  }

  // Experience section
  if (experienceSection.length > 0) {
    children.push(sectionHeader("EXPERIENCE"));

    for (const exp of experienceSection) {
      // Company — Title with dates on right
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({
              text: `${exp.company} — ${exp.title}`,
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: `\t${exp.dates}`,
              size: 18,
              color: "6B7280",
            }),
          ],
        })
      );

      // Bullets
      for (const bullet of exp.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: bullet,
                size: 20,
              }),
            ],
          })
        );
      }
    }
  }

  // Education section
  if (educationSection && educationSection.length > 0) {
    children.push(sectionHeader("EDUCATION"));

    for (const edu of educationSection) {
      const degreeText =
        edu.degree && edu.field
          ? `${edu.degree} in ${edu.field}`
          : edu.degree ?? edu.field ?? "Degree";

      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${degreeText} — ${edu.institution}`,
              size: 20,
            }),
            ...(edu.year
              ? [
                  new TextRun({
                    text: `, ${edu.year}`,
                    size: 20,
                    color: "6B7280",
                  }),
                ]
              : []),
          ],
        })
      );
    }
  }

  // Certifications section
  if (certificationsSection && certificationsSection.length > 0) {
    children.push(sectionHeader("CERTIFICATIONS"));

    for (const cert of certificationsSection) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: cert,
              size: 20,
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
            size: 20, // 10pt in half-points
          },
        },
      },
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
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
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
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
      }),
    ],
  });
}
