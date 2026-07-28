import { chromium } from "playwright";
import type {
  GauntletDocument,
  HitchhikersGuide,
  AutomizerDocument,
  HGSubsection,
} from "@/lib/automizer/types";
import { ROMAN_ORDER } from "@/lib/automizer/types";
import fs from "fs/promises";
import path from "path";

async function getGauntletHTML(doc: GauntletDocument): Promise<string> {
    const templatePath = path.join(process.cwd(), 'lib/automizer/templates/gauntlet.html');
    let template = await fs.readFile(templatePath, 'utf-8');
    template = template.replace('Gauntlet Document', doc.metadata.title || 'Gauntlet Document');
    return template;
}

async function getHitchhikersGuideHTML(
  doc: HitchhikersGuide,
): Promise<string> {
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
    .map(
      (challenge) => {
        const orderedSections = ROMAN_ORDER
            .map(key => challenge.sections[key])
            .filter((section): section is NonNullable<typeof section> => !!section);

        return `
    <div class="challenge">
      <h2>${challenge.title}</h2>
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
      }
    )
    .join('<hr class="challenge-separator">');

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${doc.metadata.title || "Hitchhiker's Guide"}</title>
            <meta charset="UTF-8">
        </head>
        <body>
            <div class="document-header">
                <h1>${doc.metadata.title || "Hitchhiker's Guide"}</h1>
                <p class="metadata">${doc.metadata.date || ""} | ${
    doc.metadata.author || ""
  }</p>
            </div>
            ${challengesHTML}
        </body>
        </html>
    `;
}

async function generatePdf(doc: AutomizerDocument): Promise<Uint8Array> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let htmlContent: string;

  if (doc.documentType === 'gauntlet') {
      htmlContent = await getGauntletHTML(doc as GauntletDocument);
  } else {
      htmlContent = await getHitchhikersGuideHTML(doc as HitchhikersGuide);
  }

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const cssPath = path.join(process.cwd(), 'lib/automizer/templates/print.css');
  await page.addStyleTag({ path: cssPath });

  const pdfBytes = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in',
    },
  });

  await browser.close();
  return pdfBytes;
}

export async function POST(request: Request) {
    try {
        const doc = await request.json();
        const pdfBytes = await generatePdf(doc);

        // Ensure compatibility by creating a Node.js Buffer first
        const buffer = Buffer.from(pdfBytes);
        const blob = new Blob([buffer], { type: 'application/pdf' });

        return new Response(blob, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': blob.size.toString(),
            },
        });
    } catch (error) {
        console.error(error);
        return new Response('Failed to generate PDF', { status: 500 });
    }
}
