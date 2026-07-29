import type { NextApiRequest, NextApiResponse } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { HitchhikersGuideTemplate } from '@/components/Automizer/HitchhikersGuideTemplate';
import { HitchhikersGuide } from '@/lib/automizer/types';
import path from 'path';
import fs from 'fs/promises';

// Helper function to read the logo file
async function getLogoBuffer() {
  const logoPath = path.join(process.cwd(), 'public', 'assets', 'branding', 'isolvrisk-logo.png');
  return fs.readFile(logoPath);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const document = req.body as HitchhikersGuide;
    if (!document || document.documentType !== 'hitchhikers-guide') {
      return res.status(400).send('Invalid document data');
    }

    // With a .tsx file, we can use JSX syntax directly to create the element.
    const element = <HitchhikersGuideTemplate document={document} />;
    const html = renderToStaticMarkup(element);

    const logoBuffer = await getLogoBuffer();
    const logoBase64 = logoBuffer.toString('base64');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    const headerTemplate = `
      <div style="font-family: Helvetica, sans-serif; font-size: 9px; color: #666; display: flex; justify-content: space-between; align-items: flex-start; margin: 0 1in; width: calc(100% - 2in);">
        <span>${document.metadata.headerTitle || 'iSolvRisk - Hitchhiker’s Guide'}</span>
        <img src="data:image/png;base64,${logoBase64}" style="width: 52px; height: auto;" />
      </div>`;

    const footerTemplate = `
      <div style="font-family: Helvetica, sans-serif; font-size: 9px; color: #666; width: 100%; text-align: right; margin: 0 1in; width: calc(100% - 2in);">
        Page <span class="pageNumber"></span>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
      margin: {
        top: '1in',
        bottom: '0.8in',
        left: '0.75in',
        right: '0.75in',
      },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.metadata.title || 'Hitchhikers-Guide'}.pdf"`);
    res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).send('Failed to generate PDF');
  }
}
