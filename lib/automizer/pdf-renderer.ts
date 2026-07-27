// lib/automizer/pdf-renderer.ts
// Renders canonical GauntletDocument or HitchhikersGuide to PDF using pdf-lib.
// All rendering is done client-side in the browser.

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import type {
  GauntletDocument,
  HitchhikersGuide,
  AutomizerDocument,
  HGSectionNumber,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Layout Constants (letter size: 612 × 792 pt)
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_LEFT = 58;
const MARGIN_RIGHT = 58;
const MARGIN_TOP = 72; // space for header
const MARGIN_BOTTOM = 60; // space for footer
const BODY_WIDTH = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const HEADER_Y = PAGE_H - 32;
const FOOTER_Y = 28;

// Colors
const COLOR_BLACK = rgb(0.05, 0.05, 0.08);
const COLOR_GRAY = rgb(0.45, 0.45, 0.5);
const COLOR_PRIMARY = rgb(0.0, 0.34, 0.72); // iSolvRisk blue
const COLOR_DIVIDER = rgb(0.8, 0.8, 0.82);

// Font sizes
const SIZE_HEADER = 8;
const SIZE_META_TITLE = 16;
const SIZE_META_SUB = 9;
const SIZE_COMPANY = 13;
const SIZE_CHALLENGE = 11;
const SIZE_SECTION_HEAD = 9.5;
const SIZE_BODY = 9;
const SIZE_LIST_ITEM = 9;

// Vertical spacing
const LINE_H_BODY = 13;

const SECTION_GAP = 10;
const CHALLENGE_GAP = 18;

// ─────────────────────────────────────────────────────────────────────────────
// Renderer State
// ─────────────────────────────────────────────────────────────────────────────
interface RenderState {
  doc: PDFDocument;
  pages: PDFPage[];
  currentPageIndex: number;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  headerTitle: string;
  pageCount: number;
}

function currentPage(state: RenderState): PDFPage {
  return state.pages[state.currentPageIndex];
}

async function addPage(state: RenderState): Promise<void> {
  const page = state.doc.addPage([PAGE_W, PAGE_H]);
  state.pages.push(page);
  state.currentPageIndex = state.pages.length - 1;
  state.y = PAGE_H - MARGIN_TOP;
  state.pageCount++;
  drawPageChrome(state);
}

function drawPageChrome(state: RenderState) {
  const page = currentPage(state);

  page.drawText(state.headerTitle, {
    x: MARGIN_LEFT,
    y: HEADER_Y,
    size: SIZE_HEADER,
    font: state.regular,
    color: COLOR_GRAY,
  });

  page.drawText("iSolvRisk", {
    x: PAGE_W - MARGIN_RIGHT - 42,
    y: HEADER_Y,
    size: SIZE_HEADER + 1,
    font: state.bold,
    color: COLOR_PRIMARY,
  });

  page.drawLine({
    start: { x: MARGIN_LEFT, y: HEADER_Y - 6 },
    end: { x: PAGE_W - MARGIN_RIGHT, y: HEADER_Y - 6 },
    thickness: 0.5,
    color: COLOR_DIVIDER,
  });

  const footerText = `Page ${state.pageCount}`;
  const footerWidth = state.regular.widthOfTextAtSize(footerText, SIZE_HEADER);
  page.drawText(footerText, {
    x: PAGE_W - MARGIN_RIGHT - footerWidth,
    y: FOOTER_Y,
    size: SIZE_HEADER,
    font: state.regular,
    color: COLOR_GRAY,
  });
}

function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB01/g, "fi")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const sanitized = sanitizeText(text);
  const words = sanitized.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawText(
  state: RenderState,
  text: string,
  opts: {
    font?: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    indent?: number;
    lineH?: number;
    spaceBefore?: number;
    spaceAfter?: number;
  } = {},
): Promise<void> {
  if (!text) return;
  const sanitizedText = sanitizeText(text);
  if (!sanitizedText) return;
  const font = opts.font ?? state.regular;
  const size = opts.size ?? SIZE_BODY;
  const color = opts.color ?? COLOR_BLACK;
  const indent = opts.indent ?? 0;
  const lineH = opts.lineH ?? LINE_H_BODY;
  const x = MARGIN_LEFT + indent;
  const maxW = BODY_WIDTH - indent;

  if (opts.spaceBefore) state.y -= opts.spaceBefore;

  const lines = wrapText(sanitizedText, font, size, maxW);
  for (const line of lines) {
    if (state.y - lineH < MARGIN_BOTTOM) {
      await addPage(state);
    }
    currentPage(state).drawText(line, { x, y: state.y, size, font, color });
    state.y -= lineH;
  }

  if (opts.spaceAfter) state.y -= opts.spaceAfter;
}

async function drawDivider(
  state: RenderState,
  spaceBefore = 6,
  spaceAfter = 6,
): Promise<void> {
  if (state.y - 1 < MARGIN_BOTTOM) await addPage(state);
  state.y -= spaceBefore;
  currentPage(state).drawLine({
    start: { x: MARGIN_LEFT, y: state.y },
    end: { x: PAGE_W - MARGIN_RIGHT, y: state.y },
    thickness: 0.5,
    color: COLOR_DIVIDER,
  });
  state.y -= spaceAfter;
}

async function drawMetadata(
  state: RenderState,
  doc: AutomizerDocument,
): Promise<void> {
  const metadata = doc.metadata || {};
  const title = metadata.title || "";
  const date = metadata.date || "";
  const author = metadata.author || "";

  await drawText(state, title, {
    font: state.bold,
    size: SIZE_META_TITLE,
    color: COLOR_PRIMARY,
    spaceBefore: 8,
  });
  await drawText(state, `${date} | ${author}`, {
    font: state.regular,
    size: SIZE_META_SUB,
    color: COLOR_GRAY,
    spaceBefore: 2,
    spaceAfter: 4,
  });
  await drawDivider(state);
}

async function renderGauntlet(
  state: RenderState,
  doc: GauntletDocument,
): Promise<void> {
  await drawMetadata(state, doc);

  for (const section of doc.sections || []) {
    await drawText(state, (section.sectionTitle || "").toUpperCase(), {
      font: state.bold,
      size: SIZE_COMPANY,
      color: COLOR_PRIMARY,
      spaceBefore: CHALLENGE_GAP,
      spaceAfter: 4,
    });
    await drawDivider(state, 2, 8);

    for (const challenge of section.challenges || []) {
      const bodyH = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
      if (state.y < MARGIN_BOTTOM + bodyH * 0.3) {
        await addPage(state);
      }

      await drawText(state, challenge.title || "", {
        font: state.bold,
        size: SIZE_CHALLENGE,
        color: COLOR_BLACK,
        spaceBefore: CHALLENGE_GAP,
        spaceAfter: 6,
      });

      await drawText(state, "Scenario", {
        font: state.bold,
        size: SIZE_SECTION_HEAD,
        color: COLOR_PRIMARY,
        spaceAfter: 3,
      });
      for (const para of challenge.scenario || []) {
        await drawText(state, para, { size: SIZE_BODY, spaceAfter: 4 });
      }

      await drawText(state, "Task", {
        font: state.bold,
        size: SIZE_SECTION_HEAD,
        color: COLOR_PRIMARY,
        spaceBefore: SECTION_GAP,
        spaceAfter: 3,
      });
      await drawText(state, challenge.task || "", {
        size: SIZE_BODY,
        spaceAfter: 4,
      });

      if (challenge.modelComponents) {
        await drawText(state, "Model Components", {
          font: state.bold,
          size: SIZE_SECTION_HEAD,
          color: COLOR_PRIMARY,
          spaceBefore: SECTION_GAP,
          spaceAfter: 4,
        });

        if (challenge.modelComponents.goal) {
          await drawText(state, "- Goal/Objective", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceAfter: 2,
          });
          await drawText(state, `- ${challenge.modelComponents.goal}`, {
            size: SIZE_LIST_ITEM,
            indent: 20,
            spaceAfter: 4,
          });
        }

        if (challenge.modelComponents.relevantFactors?.length > 0) {
          await drawText(state, "- Relevant Factors", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceAfter: 2,
          });
          for (const f of challenge.modelComponents.relevantFactors) {
            await drawText(state, `- ${f}`, {
              size: SIZE_LIST_ITEM,
              indent: 20,
              spaceAfter: 2,
            });
          }
          state.y -= 2;
        }

        if (challenge.modelComponents.possibleOutcomes?.length > 0) {
          await drawText(state, "- Possible Outcomes", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceBefore: 2,
            spaceAfter: 2,
          });
          for (const o of challenge.modelComponents.possibleOutcomes) {
            await drawText(state, `- ${o}`, {
              size: SIZE_LIST_ITEM,
              indent: 20,
              spaceAfter: 2,
            });
          }
        }
      }

      if (challenge.targetOutcome) {
        await drawText(
          state,
          `Target Outcome: ${challenge.targetOutcome.name || ""}`,
          {
            font: state.bold,
            size: SIZE_SECTION_HEAD,
            color: COLOR_PRIMARY,
            spaceBefore: SECTION_GAP,
            spaceAfter: 3,
          },
        );
        if (state.y < MARGIN_BOTTOM + 40) await addPage(state);
        await drawText(state, challenge.targetOutcome.explanation || "", {
          size: SIZE_BODY,
          spaceAfter: 4,
        });
      }

      if (challenge.alternateComponents) {
        await drawText(state, "Alternate Components", {
          font: state.bold,
          size: SIZE_SECTION_HEAD,
          color: COLOR_PRIMARY,
          spaceBefore: SECTION_GAP,
          spaceAfter: 4,
        });

        if (challenge.alternateComponents.goals?.length > 0) {
          await drawText(state, "- Alternate Goal Options", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceAfter: 2,
          });
          for (const g of challenge.alternateComponents.goals) {
            await drawText(state, `- ${g}`, {
              size: SIZE_LIST_ITEM,
              indent: 20,
              spaceAfter: 2,
            });
          }
        }
        if (challenge.alternateComponents.factors?.length > 0) {
          await drawText(state, "- Alternate Factor Options", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceBefore: 2,
            spaceAfter: 2,
          });
          for (const f of challenge.alternateComponents.factors) {
            await drawText(state, `- ${f}`, {
              size: SIZE_LIST_ITEM,
              indent: 20,
              spaceAfter: 2,
            });
          }
        }
        if (challenge.alternateComponents.outcomes?.length > 0) {
          await drawText(state, "- Alternate Outcome Options", {
            font: state.bold,
            size: SIZE_LIST_ITEM,
            indent: 8,
            spaceBefore: 2,
            spaceAfter: 2,
          });
          for (const o of challenge.alternateComponents.outcomes) {
            await drawText(state, `- ${o}`, {
              size: SIZE_LIST_ITEM,
              indent: 20,
              spaceAfter: 2,
            });
          }
        }
      }

      if (challenge.hints) {
        const hasHints =
          (challenge.hints.goalHints?.length || 0) > 0 ||
          (challenge.hints.factorHints?.length || 0) > 0 ||
          (challenge.hints.outcomeHints?.length || 0) > 0;

        if (hasHints) {
          await drawText(state, "Hints", {
            font: state.bold,
            size: SIZE_SECTION_HEAD,
            color: COLOR_PRIMARY,
            spaceBefore: SECTION_GAP,
            spaceAfter: 4,
          });
          if (challenge.hints.goalHints?.length > 0) {
            await drawText(state, "- Goal Hints", {
              font: state.bold,
              size: SIZE_LIST_ITEM,
              indent: 8,
              spaceAfter: 2,
            });
            for (const h of challenge.hints.goalHints) {
              await drawText(state, `- ${h}`, {
                size: SIZE_LIST_ITEM,
                indent: 20,
                spaceAfter: 2,
              });
            }
          }
          if (challenge.hints.factorHints?.length > 0) {
            await drawText(state, "- Factor Hints", {
              font: state.bold,
              size: SIZE_LIST_ITEM,
              indent: 8,
              spaceBefore: 2,
              spaceAfter: 2,
            });
            for (const h of challenge.hints.factorHints) {
              await drawText(state, `- ${h}`, {
                size: SIZE_LIST_ITEM,
                indent: 20,
                spaceAfter: 2,
              });
            }
          }
          if (challenge.hints.outcomeHints?.length > 0) {
            await drawText(state, "- Outcome Hints", {
              font: state.bold,
              size: SIZE_LIST_ITEM,
              indent: 8,
              spaceBefore: 2,
              spaceAfter: 2,
            });
            for (const h of challenge.hints.outcomeHints) {
              await drawText(state, `- ${h}`, {
                size: SIZE_LIST_ITEM,
                indent: 20,
                spaceAfter: 2,
              });
            }
          }
        }
      }
    }
  }
}

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

function getHitchhikerSections(
  challenge: HitchhikersGuide["challenges"][number],
) {
  const source = (challenge as any)?.sections ?? challenge ?? {};

  if (Array.isArray(source)) {
    return source.filter(Boolean);
  }

  if (source && typeof source === "object") {
    return ROMAN_ORDER.map((numeral) => {
      const section = source[numeral];
      if (!section) return null;
      return {
        ...section,
        number: section.number || numeral,
        title: section.title || "",
      };
    }).filter(Boolean);
  }

  return [];
}

async function renderHitchhikersGuide(
  state: RenderState,
  doc: HitchhikersGuide,
): Promise<void> {
  await drawMetadata(state, doc);

  const challenges = doc.challenges || (doc as any).sections || [];

  for (let ci = 0; ci < challenges.length; ci++) {
    const challenge = challenges[ci];
    if (ci > 0) await addPage(state);

    await drawText(state, challenge.title || `Challenge ${ci + 1}`, {
      font: state.bold,
      size: SIZE_CHALLENGE + 1,
      color: COLOR_PRIMARY,
      spaceBefore: 4,
      spaceAfter: 8,
    });
    await drawDivider(state, 0, 10);

    const sections = getHitchhikerSections(challenge);

    for (const section of sections) {
      const numeral = section.number || "";
      if (!section) continue;

      if (state.y < MARGIN_BOTTOM + 60) await addPage(state);

      await drawText(state, `${numeral}. ${section.title || ""}`, {
        font: state.bold,
        size: SIZE_SECTION_HEAD,
        color: COLOR_PRIMARY,
        spaceBefore: SECTION_GAP,
        spaceAfter: 4,
      });

      const subsections = section.subsections || (section as any).steps || [];
      for (const sub of subsections) {
        if (state.y < MARGIN_BOTTOM + 30) await addPage(state);

        const subLabel = sub.label ? `${sub.label}. ` : "";
        const subContent = sub.content || (sub as any).text || "";
        const points = sub.points || [];

        await drawText(state, `${subLabel}${subContent}`, {
          font: points.length > 0 ? state.bold : state.regular,
          size: SIZE_BODY,
          indent: 12,
          spaceAfter: points.length > 0 ? 2 : 4,
        });

        for (let pi = 0; pi < points.length; pi++) {
          if (state.y < MARGIN_BOTTOM + LINE_H_BODY) await addPage(state);
          await drawText(state, `${pi + 1}. ${points[pi]}`, {
            size: SIZE_BODY,
            indent: 24,
            spaceAfter: 2,
          });
        }
        if (points.length > 0) state.y -= 2;
      }
    }
  }
}

export async function renderToPDF(doc: AutomizerDocument): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const [regular, bold, italic, boldItalic] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  ]);

  const firstPage = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const state: RenderState = {
    doc: pdfDoc,
    pages: [firstPage],
    currentPageIndex: 0,
    y: PAGE_H - MARGIN_TOP,
    regular,
    bold,
    italic,
    boldItalic,
    headerTitle: doc.metadata?.headerTitle || "",
    pageCount: 1,
  };

  drawPageChrome(state);

  if (doc.documentType === "gauntlet") {
    await renderGauntlet(state, doc as GauntletDocument);
  } else {
    await renderHitchhikersGuide(state, doc as HitchhikersGuide);
  }

  return pdfDoc.save();
}
