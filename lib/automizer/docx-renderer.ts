// lib/automizer/docx-renderer.ts
// Renders canonical GauntletDocument or HitchhikersGuide to DOCX using the docx npm package.
// Runs entirely client-side in the browser.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
  BorderStyle,
} from "docx";
import type {
  GauntletDocument,
  HitchhikersGuide,
  AutomizerDocument,
  HGSectionNumber,
} from "./types";

// Add the IIndentAttributes interface
interface IIndentAttributes {
  left?: number | string;
  right?: number | string;
  hanging?: number | string;
  firstLine?: number | string;
  start?: number | string;
  end?: number | string;
}


// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY_COLOR = "00 57B8".replace(" ", ""); // iSolvRisk blue
const GRAY_COLOR = "6B7280";

function bodyPara(text: string, indent = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18 })],
    spacing: { before: 60, after: 60 },
    indent: indent > 0 ? { left: convertInchesToTwip(indent) } : undefined,
  });
}
function bulletItem(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18 })],
    bullet: { level },
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.25 * (level + 1)) },
  });
}

function divider(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { color: "CCCCCC", space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 120, after: 120 },
    text: "",
  });
}

function metaParagraph(date: string, author: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${date || ""} | `, color: GRAY_COLOR, size: 17 }),
      new TextRun({ text: author || "", color: GRAY_COLOR, size: 17 }),
    ],
    spacing: { before: 40, after: 80 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ pageBreakBefore: true, text: "" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauntlet DOCX
// ─────────────────────────────────────────────────────────────────────────────
function buildGauntletChildren(doc: GauntletDocument): Paragraph[] {
  const children: Paragraph[] = [];

  // Document title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: doc.metadata.title,
          bold: true,
          size: 32,
          color: PRIMARY_COLOR,
        }),
      ],
      spacing: { before: 0, after: 80 },
    }),
  );
  children.push(
    metaParagraph(doc.metadata.date || "", doc.metadata.author || ""),
  );
  children.push(divider());

  for (const section of doc.sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.sectionTitle.toUpperCase(),
            bold: true,
            size: 22,
            color: PRIMARY_COLOR,
          }),
        ],
        spacing: { before: 280, after: 80 },
      }),
    );
    children.push(divider());

    for (const challenge of section.challenges) {
      children.push(
        new Paragraph({
          text: challenge.title,
          heading: "Heading1",
          spacing: { before: 240, after: 120 },
        }),
      );

      // Scenario
      children.push(
        new Paragraph({
          text: "Scenario",
          heading: "Heading2",
          spacing: { before: 200, after: 80 },
        }),
      );
      for (const para of challenge.scenario) {
        children.push(bodyPara(para));
      }

      // Task
      children.push(
        new Paragraph({
          text: "Task",
          heading: "Heading2",
          spacing: { before: 200, after: 80 },
        }),
      );
      children.push(bodyPara(challenge.task));

      // Model Components
      children.push(
        new Paragraph({
          text: "Model Components",
          heading: "Heading2",
          spacing: { before: 200, after: 80 },
        }),
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Goal/Objective", bold: true, size: 18 }),
          ],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        }),
      );
      children.push(bulletItem(`○ ${challenge.modelComponents.goal}`, 1));

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Relevant Factors", bold: true, size: 18 }),
          ],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        }),
      );
      for (const f of challenge.modelComponents.relevantFactors) {
        children.push(bulletItem(`○ ${f}`, 1));
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Possible Outcomes", bold: true, size: 18 }),
          ],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        }),
      );
      for (const o of challenge.modelComponents.possibleOutcomes) {
        children.push(bulletItem(`○ ${o}`, 1));
      }

      // Target Outcome
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Target Outcome: ",
              bold: true,
              size: 18,
              color: PRIMARY_COLOR,
            }),
            new TextRun({ text: challenge.targetOutcome.name, size: 18 }),
          ],
          spacing: { before: 160, after: 60 },
        }),
      );
      children.push(bodyPara(challenge.targetOutcome.explanation));

      // Alternate Components
      children.push(
        new Paragraph({
          text: "Alternate Components",
          heading: "Heading2",
          spacing: { before: 200, after: 80 },
        }),
      );
      if (challenge.alternateComponents.goals.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Alternate Goal Options",
                bold: true,
                size: 18,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
            spacing: { before: 60, after: 30 },
          }),
        );
        for (const g of challenge.alternateComponents.goals) {
          children.push(bulletItem(`○ ${g}`, 1));
        }
      }
      if (challenge.alternateComponents.factors.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Alternate Factor Options",
                bold: true,
                size: 18,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
            spacing: { before: 60, after: 30 },
          }),
        );
        for (const f of challenge.alternateComponents.factors) {
          children.push(bulletItem(`○ ${f}`, 1));
        }
      }
      if (challenge.alternateComponents.outcomes.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Alternate Outcome Options",
                bold: true,
                size: 18,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
            spacing: { before: 60, after: 30 },
          }),
        );
        for (const o of challenge.alternateComponents.outcomes) {
          children.push(bulletItem(`○ ${o}`, 1));
        }
      }

      // Hints
      const hasHints =
        challenge.hints.goalHints.length > 0 ||
        challenge.hints.factorHints.length > 0 ||
        challenge.hints.outcomeHints.length > 0;

      if (hasHints) {
        children.push(
          new Paragraph({
            text: "Hints",
            heading: "Heading2",
            spacing: { before: 200, after: 80 },
          }),
        );
        if (challenge.hints.goalHints.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Goal Hints", bold: true, size: 18 }),
              ],
              indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
              spacing: { before: 60, after: 30 },
            }),
          );
          for (const h of challenge.hints.goalHints) {
            children.push(bulletItem(`○ ${h}`, 1));
          }
        }
        if (challenge.hints.factorHints.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Factor Hints", bold: true, size: 18 }),
              ],
              indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
              spacing: { before: 60, after: 30 },
            }),
          );
          for (const h of challenge.hints.factorHints) {
            children.push(bulletItem(`○ ${h}`, 1));
          }
        }
        if (challenge.hints.outcomeHints.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Outcome Hints", bold: true, size: 18 }),
              ],
              indent: { left: convertInchesToTwip(0.25) } as IIndentAttributes,
              spacing: { before: 60, after: 30 },
            }),
          );
          for (const h of challenge.hints.outcomeHints) {
            children.push(bulletItem(`○ ${h}`, 1));
          }
        }
      }
    }
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hitchhiker's Guide DOCX
// ─────────────────────────────────────────────────────────────────────────────
const ROMAN_ORDER: HGSectionNumber[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
];

function buildHGChildren(doc: HitchhikersGuide): Paragraph[] {
  const children: Paragraph[] = [];

  // Document title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: doc.metadata.title,
          bold: true,
          size: 32,
          color: PRIMARY_COLOR,
        }),
      ],
      spacing: { before: 0, after: 80 },
    }),
  );
  children.push(
    metaParagraph(doc.metadata.date || "", doc.metadata.author || ""),
  );
  children.push(divider());

  for (let ci = 0; ci < doc.challenges.length; ci++) {
    const challenge = doc.challenges[ci];
    if (ci > 0) children.push(pageBreak());

    children.push(
      new Paragraph({
        text: challenge.title,
        heading: "Heading1",
        spacing: { before: 240, after: 120 },
      }),
    );
    children.push(divider());

    for (const numeral of ROMAN_ORDER) {
      const section = challenge.sections[numeral];
      if (!section) continue;

      children.push(
        new Paragraph({
          text: `${numeral}. ${section.title}`,
          heading: "Heading2",
          spacing: { before: 200, after: 80 },
        }),
      );

      for (const sub of section.subsections) {
        children.push(
          new Paragraph({
            text: `${sub.label}. ${sub.content}`,
            heading: sub.points.length > 0 ? "Heading3" : undefined,
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 80, after: sub.points.length > 0 ? 40 : 80 },
          }),
        );

        for (let pi = 0; pi < sub.points.length; pi++) {
          children.push(bulletItem(`${pi + 1}. ${sub.points[pi]}`, 1));
        }
      }
    }
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────
export async function renderToDOCX(doc: AutomizerDocument): Promise<Blob> {
  const children =
    doc.documentType === "gauntlet"
      ? buildGauntletChildren(doc)
      : buildHGChildren(doc);

  const docxDoc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 18, color: "1A1A1A" },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal", // This should be HeadingLevel.HEADING_1
          next: "Normal",
          quickFormat: true,
          run: { bold: true, size: 24, color: PRIMARY_COLOR },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal", // This should be HeadingLevel.HEADING_2
          next: "Normal",
          quickFormat: true,
          run: { bold: true, size: 20, color: PRIMARY_COLOR },
          paragraph: { spacing: { before: 180, after: 80 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal", // This should be HeadingLevel.HEADING_3
          next: "Normal",
          quickFormat: true,
          run: { bold: true, size: 18 },
          paragraph: { spacing: { before: 140, after: 60 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: doc.metadata.headerTitle,
                    color: GRAY_COLOR,
                    size: 16,
                  }),
                  new TextRun({ text: "\t\t\t", size: 16 }),
                  new TextRun({
                    text: "iSolvRisk",
                    bold: true,
                    size: 16,
                    color: PRIMARY_COLOR,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Page ", size: 16, color: GRAY_COLOR }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: GRAY_COLOR,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(docxDoc);
}
