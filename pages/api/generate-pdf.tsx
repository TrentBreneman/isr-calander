import type { NextApiRequest, NextApiResponse } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import { HitchhikersGuideTemplate } from "@/components/Automizer/HitchhikersGuideTemplate";
import { GauntletTemplate } from "@/components/Automizer/GauntletTemplate";
import { AutomizerDocument } from "@/lib/automizer/types";
import path from "path";
import fs from "fs/promises";

async function getLogoBuffer() {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "assets",
    "branding",
    "isolvrisk-logo.svg",
  );
  return fs.readFile(logoPath);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  let browser;

  try {
    const document = req.body as AutomizerDocument;

    if (
      !document ||
      (document.documentType !== "hitchhikers-guide" &&
        document.documentType !== "gauntlet")
    ) {
      return res.status(400).send("Invalid document data");
    }

    const element =
      document.documentType === "hitchhikers-guide" ? (
        <HitchhikersGuideTemplate document={document} />
      ) : (
        <GauntletTemplate document={document} />
      );
    const html = renderToStaticMarkup(element);

    const logoBuffer = await getLogoBuffer();
    const logoBase64 = logoBuffer.toString("base64");

    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    const defaultHeaderTitle =
      document.documentType === "hitchhikers-guide"
        ? "iSolvRisk - Hitchhiker's Guide"
        : "iSolvRisk - Gauntlet Challenges";

    const headerTemplate = `
      <div style="font-family: Helvetica, sans-serif; font-size: 9px; color: #666; display: flex; justify-content: space-between; align-items: flex-start; margin: 0 1in; width: calc(100% - 2in);">
        <span>${document.metadata.headerTitle || defaultHeaderTitle}</span>
        <img src="data:image/svg+xml;base64,${logoBase64}" style="width: 52px; height: auto;" />
      </div>`;

    const footerTemplate = `
      <div style="font-family: Helvetica, sans-serif; font-size: 9px; color: #666; width: 100%; text-align: right; margin: 0 1in; width: calc(100% - 2in);">
        Page <span class="pageNumber"></span>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
      margin: {
        top: "1in",
        bottom: "0.8in",
        left: "0.75in",
        right: "0.75in",
      },
    });

    await browser.close();
    browser = undefined;

    const defaultFilename =
      document.documentType === "hitchhikers-guide"
        ? "Hitchhikers-Guide"
        : "Gauntlet-Challenges";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.metadata.title || defaultFilename}.pdf"`,
    );
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    res.status(500).send("Failed to generate PDF");
  }
}
