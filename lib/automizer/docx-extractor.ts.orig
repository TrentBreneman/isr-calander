// lib/automizer/docx-extractor.ts
// Extracts plain text from DOCX files using mammoth (runs in browser)
// Also handles TXT and MD file uploads.

/**
 * Extract plain text from a DOCX file using mammoth.
 * Preserves some structural hints by outputting heading text on its own line.
 */
export async function extractDocxText(file: File): Promise<string> {
  // Dynamic import so mammoth only loads when needed
  const mammoth = await import('mammoth/mammoth.browser');

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });

  if (result.messages && result.messages.length > 0) {
    const errs = result.messages.filter((m: { type: string }) => m.type === 'error');
    if (errs.length > 0) {
      console.warn('[DOCX Extractor] mammoth errors:', errs);
    }
  }

  return result.value as string;
}

/**
 * Extract plain text from a TXT or MD file.
 */
export async function extractPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Unified file text extractor. Dispatches by file extension.
 */
export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    return extractDocxText(file);
  }
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return extractPlainText(file);
  }
  throw new Error(`Unsupported file type: ${file.name}. Please upload a .docx, .txt, or .md file.`);
}
