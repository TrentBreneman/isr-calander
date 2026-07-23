// lib/automizer/docx-renderer.ts
// Renders canonical GauntletDocument or HitchhikersGuide to DOCX using the docx npm package.
// Runs entirely client-side in the browser.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  UnderlineType,
  LevelFormat,
  convertInchesToTwip,
  BorderStyle,
  TableOfContents,
} from 'docx';
import type { GauntletDocument, HitchhikersGuide, AutomizerDocument, HGSectionNumber } from './types';
import { HG_SECTION_TITLES } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY_COLOR = '00 57B8'.replace(' ', '');  // iSolvRisk blue
const GRAY_COLOR = '6B7280';

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 60 },
  });
}

function bodyPara(text: string, indent = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18 })],
    spacing: { before: 60, after: 60 },
    indent: indent > 0 ? { left: convertInchesToTwip(indent) } : undefined,
  });
}

function boldLabel(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18 }),
      new TextRun({ text: value, size: 18 }),
    ],
    spacing: { before: 60, after: 60 },
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
      bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: { before: 120, after: 120 },
    text: '',
  });
}

function metaParagraph(date: string, author: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${date} | `, color: GRAY_COLOR, size: 17 }),
      new TextRun({ text: author, color: GRAY_COLOR, size: 17 }),
    ],
    spacing: { before: 40, after: 80 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ pageBreakBefore: true, text: '' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauntlet DOCX
// ─────────────────────────────────────────────────────────────────────────────
function buildGauntletChildren(doc: GauntletDocument): Paragraph[] {
  const children: Paragraph[] = [];

  // Document title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: doc.metadata.title, bold: true, size: 32, color: PRIMARY_COLOR })],
      spacing: { before: 0, after: 80 },
    })
  );
  children.push(metaParagraph(doc.metadata.date, doc.metadata.author));
  children.push(divider());

  for (const section of doc.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.sectionTitle.toUpperCase(), bold: true, size: 22, color: PRIMARY_COLOR })],
        spacing: { before: 280, after: 80 },
      })
    );
    children.push(divider());

    for (const challenge of section.challenges) {
      children.push(heading1(challenge.title));

      // Scenario
      children.push(heading2('Scenario'));
      for (const para of challenge.scenario) {
        children.push(bodyPara(para));
      }

      // Task
      children.push(heading2('Task'));
      children.push(bodyPara(challenge.task));

      // Model Components
      children.push(heading2('Model Components'));

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '• Goal/Objective', bold: true, size: 18 })],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
      children.push(bulletItem(`○ ${challenge.modelComponents.goal}`, 1));

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '• Relevant Factors', bold: true, size: 18 })],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
      for (const f of challenge.modelComponents.relevantFactors) {
        children.push(bulletItem(`○ ${f}`, 1));
      }

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '• Possible Outcomes', bold: true, size: 18 })],
          spacing: { before: 60, after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        })
      );
      for (const o of challenge.modelComponents.possibleOutcomes) {
        children.push(bulletItem(`○ ${o}`, 1));
      }

      // Target Outcome
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Target Outcome: ', bold: true, size: 18, color: PRIMARY_COLOR }),
            new TextRun({ text: challenge.targetOutcome.name, size: 18 }),
          ],
          spacing: { before: 160, after: 60 },
        })
      );
      children.push(bodyPara(challenge.targetOutcome.explanation));

      // Alternate Components
      children.push(heading2('Alternate Components'));
      if (challenge.alternateComponents.goals.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '• Alternate Goal Options', bold: true, size: 18 })],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 60, after: 30 },
          })
        );
        for (const g of challenge.alternateComponents.goals) {
          children.push(bulletItem(`○ ${g}`, 1));
        }
      }
      if (challenge.alternateComponents.factors.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '• Alternate Factor Options', bold: true, size: 18 })],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 60, after: 30 },
          })
        );
        for (const f of challenge.alternateComponents.factors) {
          children.push(bulletItem(`○ ${f}`, 1));
        }
      }
      if (challenge.alternateComponents.outcomes.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '• Alternate Outcome Options', bold: true, size: 18 })],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 60, after: 30 },
          })
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
        children.push(heading2('Hints'));
        if (challenge.hints.goalHints.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '• Goal Hints', bold: true, size: 18 })],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { before: 60, after: 30 },
            })
          );
          for (const h of challenge.hints.goalHints) {
            children.push(bulletItem(`○ ${h}`, 1));
          }
        }
        if (challenge.hints.factorHints.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '• Factor Hints', bold: true, size: 18 })],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { before: 60, after: 30 },
            })
          );
          for (const h of challenge.hints.factorHints) {
            children.push(bulletItem(`○ ${h}`, 1));
          }
        }
        if (challenge.hints.outcomeHints.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '• Outcome Hints', bold: true, size: 18 })],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { before: 60, after: 30 },
            })
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
const ROMAN_ORDER: HGSectionNumber[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function buildHGChildren(doc: HitchhikersGuide): Paragraph[] {
  const children: Paragraph[] = [];

  // Document title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: doc.metadata.title, bold: true, size: 32, color: PRIMARY_COLOR })],
      spacing: { before: 0, after: 80 },
    })
  );
  children.push(metaParagraph(doc.metadata.date, doc.metadata.author));
  children.push(divider());

  for (let ci = 0; ci < doc.challenges.length; ci++) {
    const challenge = doc.challenges[ci];
    if (ci > 0) children.push(pageBreak());

    children.push(heading1(challenge.title));
    children.push(divider());

    for (const numeral of ROMAN_ORDER) {
      const section = challenge.sections[numeral];
      if (!section) continue;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${numeral}. `, bold: true, size: 20, color: PRIMARY_COLOR }),
            new TextRun({ text: section.title, bold: true, size: 20, color: PRIMARY_COLOR }),
          ],
          spacing: { before: 200, after: 80 },
        })
      );

      for (const sub of section.subsections) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${sub.label}. `, bold: sub.points.length > 0, size: 18 }),
              new TextRun({ text: sub.content, bold: sub.points.length > 0, size: 18 }),
            ],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 80, after: sub.points.length > 0 ? 40 : 80 },
          })
        );

        for (let pi = 0; pi < sub.points.length; pi++) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${pi + 1}. `, size: 18 }),
                new TextRun({ text: sub.points[pi], size: 18 }),
              ],
              indent: { left: convertInchesToTwip(0.5) },
              spacing: { before: 40, after: 40 },
            })
          );
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
    doc.documentType === 'gauntlet'
      ? buildGauntletChildren(doc)
      : buildHGChildren(doc as HitchhikersGuide);

  const docxDoc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 18, color: '1A1A1A' },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 24, color: PRIMARY_COLOR },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, size: 20, color: PRIMARY_COLOR },
          paragraph: { spacing: { before: 180, after: 80 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
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
                  new TextRun({ text: doc.metadata.headerTitle, color: GRAY_COLOR, size: 16 }),
                  new TextRun({ text: '\t\t\t', size: 16 }),
                  new TextRun({ text: 'iSolvRisk', bold: true, size: 16, color: PRIMARY_COLOR }),
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
                  new TextRun({ text: 'Page ', size: 16, color: GRAY_COLOR }),
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
