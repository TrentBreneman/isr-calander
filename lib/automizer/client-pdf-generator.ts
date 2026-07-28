// lib/automizer/client-pdf-generator.ts
import html2pdf from "html2pdf.js";
import type {
  AutomizerDocument,
  GauntletDocument,
  HitchhikersGuide,
  HGSubsection,
} from "./types";
import { ROMAN_ORDER } from "./types";

const GAUNTLET_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gauntlet Document</title>
    <style>
        /* Styles will be injected here */
    </style>
</head>
<body>
    <h1>Gauntlet Document</h1>
    <p>Placeholder content.</p>
</body>
</html>
`;

const HITCHHIKERS_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{DOC_TITLE}}</title>
    <style>
        /* Styles will be injected here */
    </style>
</head>
<body>
    <main>
        <div class="title-container">
            <h1 class="main-title">{{DOC_TITLE}}</h1>
            <p class="doc-meta">{{DOC_META}}</p>
        </div>
        <div id="challenge-content">
            <!-- Challenges will be injected here -->
        </div>
    </main>
</body>
</html>
`;

const HITCHHIKERS_CSS = `
/* hitchhikers.css */
body { font-family: 'Times New Roman', Times, serif; color: #333; line-height: 1.5; }
h1, h2, h3, p { margin: 0; padding: 0; }
header, footer { position: fixed; width: 100%; font-size: 10pt; color: #555; }
header { top: 0; display: flex; justify-content: space-between; align-items: center; padding: 0 1in; border-bottom: 1px solid #ccc; }
.logo { max-height: 40px; }
footer { bottom: 0; text-align: right; padding: 0 1in; }
main { padding-top: 1in; padding-bottom: 1in; }
.title-container { text-align: center; margin-bottom: 0.5in; }
.main-title { font-size: 24pt; font-weight: bold; margin-bottom: 12px; }
.doc-meta { font-size: 12pt; color: #444; }
.challenge { page-break-before: always; }
.challenge:first-child { page-break-before: avoid; }
.challenge-title { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 0.25in; }
.challenge-subtitle { font-size: 12pt; font-style: italic; text-align: center; margin-bottom: 0.25in; color: #555; }
.separator { border: 0; height: 1px; background: #333; margin: 0.25in 0; }
ol.roman { list-style-type: none; counter-reset: roman-counter; padding-left: 0; }
ol.roman > li { counter-increment: roman-counter; margin-bottom: 24px; padding-left: 40px; position: relative; }
ol.roman > li::before { content: counter(roman-counter, upper-roman) "."; position: absolute; left: 0; font-weight: bold; }
.section-title { font-size: 14pt; font-weight: bold; margin-bottom: 12px; }
ol.subsections { list-style-type: none; counter-reset: alpha-counter; padding-left: 0; margin-top: 12px; }
ol.subsections > li { counter-increment: alpha-counter; margin-bottom: 12px; padding-left: 40px; position: relative; }
ol.subsections > li::before { content: counter(alpha-counter, upper-alpha) "."; position: absolute; left: 0; font-weight: normal; }
ol.points { list-style-type: none; counter-reset: number-counter; padding-left: 20px; margin-top: 8px; }
ol.points > li { counter-increment: number-counter; margin-bottom: 8px; padding-left: 30px; position: relative; }
ol.points > li::before { content: counter(number-counter) "."; position: absolute; left: 0; }
`;

const PRINT_CSS = `
/* Print-specific styles */
body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #333; }
h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; color: #111; }
h1 { font-size: 24pt; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 5px; }
.metadata { font-size: 10pt; color: #666; margin-bottom: 20px; }
h2 { font-size: 18pt; margin-top: 40px; }
h3 { font-size: 14pt; margin-top: 20px; }
.challenge-separator { border: 0; border-top: 1px solid #ddd; margin-top: 40px; }
ol.roman { list-style-type: upper-roman; padding-left: 40px; margin-top: 20px; }
ol.roman > li { padding-left: 10px; }
p.section-title { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; color: #111; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
ol.subsections { list-style-type: upper-alpha; padding-left: 20px; margin-top: 10px; font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: normal; color: #333; }
ol.points { list-style-type: decimal; padding-left: 40px; }
li { margin-bottom: 10px; }
p { margin-top: 0; }
`;

function getGauntletHTML(doc: GauntletDocument): string {
  let template = GAUNTLET_TEMPLATE_HTML;
  template = template.replace(
    "Gauntlet Document",
    doc.metadata.title || "Gauntlet Document",
  );
  template = template.replace("/* Styles will be injected here */", PRINT_CSS);
  return template;
}

function getHitchhikersGuideHTML(doc: HitchhikersGuide): string {
  let template = HITCHHIKERS_TEMPLATE_HTML;

  const renderSubsections = (subsections: HGSubsection[]) => {
    if (!subsections || subsections.length === 0) return "";
    let html = '<ol class="subsections">';
    for (const sub of subsections) {
      html += "<li>";
      html += `<p>${sub.content}</p>`;
      if (sub.points && sub.points.length > 0) {
        html += '<ol class="points">';
        for (const point of sub.points) {
          html += `<li>${point}</li>`;
        }
        html += "</ol>";
      }
      html += "</li>";
    }
    html += "</ol>";
    return html;
  };

  const challengesHTML = doc.challenges
    .map((challenge) => {
      const orderedSections = ROMAN_ORDER.map((key) => challenge.sections[key]).filter(
        (section): section is NonNullable<typeof section> => !!section,
      );

      return `
    <div class="challenge">
      <h2 class="challenge-title">${challenge.title}</h2>
      ${
        challenge.subtitle
          ? `<p class="challenge-subtitle">${challenge.subtitle}</p>`
          : ""
      }
      <hr class="separator" />
      <ol class="roman">
      ${orderedSections
        .map(
          (section) => `
          <li>
            <p class="section-title">${section.title}</p>
            ${renderSubsections(section.subsections)}
          </li>
        `,
        )
        .join("")}
      </ol>
    </div>
  `;
    })
    .join("");

  template = template.replace(
    "{{DOC_TITLE}}",
    doc.metadata.title || "Hitchhiker's Guide",
  );
  template = template.replace(
    "{{DOC_META}}",
    `${doc.metadata.date || ""} | ${doc.metadata.author || ""}`,
  );
  template = template.replace(
    "<!-- Challenges will be injected here -->",
    challengesHTML,
  );
  template = template.replace(
    "/* Styles will be injected here */",
    `${PRINT_CSS}
${HITCHHIKERS_CSS}`,
  );

  return template;
}

export function generatePdfOnClient(doc: AutomizerDocument) {
  const element =
    doc.documentType === "gauntlet"
      ? getGauntletHTML(doc as GauntletDocument)
      : getHitchhikersGuideHTML(doc as HitchhikersGuide);

  const opt = {
    margin: 10,
    filename: `${doc.metadata.title || "document"}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  html2pdf().from(element).set(opt).save();
}
