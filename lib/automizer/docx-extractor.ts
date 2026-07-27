// lib/automizer/docx-extractor.ts
// Extracts plain text from DOCX, PDF, TXT, and MD files in the browser.

/**
 * Extract plain text from a DOCX file using mammoth.
 * Preserves some structural hints by outputting heading text on its own line.
 */
export async function extractDocxText(file: File): Promise<string> {
  // Dynamic import so mammoth only loads when needed
  // @ts-ignore
  const mammoth = await import("mammoth/mammoth.browser");

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });

  if (result.messages && result.messages.length > 0) {
    const errs = result.messages.filter(
      (m: { type: string }) => m.type === "error",
    );
    if (errs.length > 0) {
      console.warn("[DOCX Extractor] mammoth errors:", errs);
    }
  }

  return result.value as string;
}

/**
 * Extract plain text from a PDF file using pdfjs-dist.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const arrayBuffer = await file.arrayBuffer();

  const workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const workerOptions = (
    pdfjs as typeof pdfjs & {
      GlobalWorkerOptions?: { workerSrc?: string };
    }
  ).GlobalWorkerOptions;
  if (workerOptions) {
    workerOptions.workerSrc = workerSrc;
  }

  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
  } as never);
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        // Check if the item is a TextItem (which has a 'str' property)
        if ("str" in item && typeof item.str === "string") {
          return item.str;
        }
        return "";
      })
      .join(" ");
    const normalized = text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u00A0/g, " ")
      .replace(/\uFB03/g, "ffi")
      .replace(/\uFB02/g, "fl")
      .replace(/\uFB01/g, "fi")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    pages.push(normalized.trim());
  }

  return pages.filter(Boolean).join("\n\n").trim();
}

/**
 * Extract plain text from a TXT or MD file.
 */
export async function extractPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}

/**
 * Unified file text extractor. Dispatches by file extension.
 */
export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }
  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return extractPlainText(file);
  }
  throw new Error(
    `Unsupported file type: ${file.name}. Please upload a .docx, .pdf, .txt, or .md file.`,
  );
}
