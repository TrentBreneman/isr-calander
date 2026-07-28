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

// Function to read image file and convert to data URI
async function getImageDataUri(filePath: string): Promise<string> {
    const absolutePath = path.join(process.cwd(), filePath);
    try {
        const imageBuffer = await fs.readFile(absolutePath);
        const extension = path.extname(filePath).substring(1);
        return `data:image/${extension};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Error reading image file at ${absolutePath}:`, error);
        return ''; // Return empty string or a placeholder if image is not found
    }
}

async function getGauntletHTML(doc: GauntletDocument): Promise<string> {
    const templatePath = path.join(process.cwd(), 'lib/automizer/templates/gauntlet.html');
    let template = await fs.readFile(templatePath, 'utf-8');
    template = template.replace('Gauntlet Document', doc.metadata.title || 'Gauntlet Document');
    return template;
}

async function getHitchhikersGuideHTML(
  doc: HitchhikersGuide,
): Promise<string> {
  const templatePath = path.join(process.cwd(), 'lib/automizer/templates/hitchhikers.html');
  let template = await fs.readFile(templatePath, 'utf-8');

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
      <h2 class="challenge-title">${challenge.title}</h2>
      ${challenge.subtitle ? `<p class="challenge-subtitle">${challenge.subtitle}</p>` : ''}
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
      }
    )
    .join('');

    template = template.replace('{{DOC_TITLE}}', doc.metadata.title || "Hitchhiker's Guide");
    template = template.replace('{{DOC_META}}', `${doc.metadata.date || ""} | ${doc.metadata.author || ""}`);
    template = template.replace('<!-- Challenges will be injected here -->', challengesHTML);

    return template;
}

async function generatePdf(doc: AutomizerDocument): Promise<Uint8Array> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let htmlContent: string;
  let headerTemplate = `<div></div>`;
  let footerTemplate = `<div></div>`;

  if (doc.documentType === 'gauntlet') {
      htmlContent = await getGauntletHTML(doc as GauntletDocument);
      // Basic footer for gauntlet for now
      footerTemplate = `<div style="font-size: 10px; width: 100%; text-align: right; padding-right: 1in;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`;
  } else {
      const hhDoc = doc as HitchhikersGuide;
      htmlContent = await getHitchhikersGuideHTML(hhDoc);
      
      const logoDataUri = await getImageDataUri('public/assets/branding/isolvrisk-logo.png');

      headerTemplate = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #555; display: flex; justify-content: space-between; align-items: center; padding: 0 1in; width: 100%; border-bottom: 1px solid #ccc;">
          <p>${hhDoc.metadata.headerTitle || hhDoc.metadata.title}</p>
          <img src="${logoDataUri}" alt="iSolvRisk Logo" style="max-height: 40px;">
        </div>
      `;
      
      footerTemplate = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #555; width: 100%; text-align: right; padding: 0 1in;">
          <span>Page <span class="pageNumber"></span></span>
        </div>
      `;
  }

  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

  // Add common styles first
  const commonCssPath = path.join(process.cwd(), 'lib/automizer/templates/print.css');
  await page.addStyleTag({ path: commonCssPath });

  // Add specific styles if it's a hitchhiker's guide
  if (doc.documentType === 'hitchhikers-guide') {
    const hgCssPath = path.join(process.cwd(), 'lib/automizer/templates/hitchhikers.css');
    await page.addStyleTag({ path: hgCssPath });
  }

  const pdfBytes = await page.pdf({
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: headerTemplate,
    footerTemplate: footerTemplate,
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
        const buffer = Buffer.from(pdfBytes);
        const base64 = buffer.toString('base64');

        return new Response(JSON.stringify({ pdfBase64: base64 }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          }
        });
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new Response(JSON.stringify({ error: `Failed to generate PDF: ${errorMessage}` }), { status: 500, headers: {'Content-Type': 'application/json'} });
    }
}
