// lib/automizer/normalizer.ts
// Stage 1: Text normalization — strips drafting artifacts before parsing

/** AI/ChatGPT residue phrases to strip from output */
const AI_ARTIFACT_PHRASES: RegExp[] = [
  /^Here is the revised (challenge|guide|document)[^.]*\.\s*/im,
  /^Certainly[!,.]?\s*/im,
  /^Let me know what you think[!.]?\s*/im,
  /^Below is the completed (guide|challenge|document)[^.]*\.\s*/im,
  /^I made the following changes[^.]*\.\s*/im,
  /^Draft response[:\s]*/im,
  /^Assistant answer[:\s]*/im,
  /^Version \d+[:\s]*/im,
  /^Revised version below[:\s]*/im,
  /^Sure[!,.]? Here['']s?\s*/im,
  /^Of course[!,.]?\s*/im,
  /^Here['']s the (revised|updated|completed|formatted)\s*/im,
];

/** Chat transcript labels to strip */
const CHAT_LABELS = /^(User|Assistant|Human|AI|ChatGPT|GPT)[:\s]+/gim;

/** HTML tags */
const HTML_TAGS = /<\/?[^>]+(>|$)/g;

/** Markdown heading markers */
const MD_HEADINGS = /^#{1,6}\s+/gm;

/** Markdown bold/italic */
const MD_EMPHASIS = /(\*{1,3}|_{1,3})(.*?)\1/g;

/** Triple backticks (code blocks) */
const MD_CODE_BLOCKS = /```[\s\S]*?```/g;

/** Single backtick inline code */
const MD_INLINE_CODE = /`([^`]*)`/g;

/** Stray page numbers from copy-paste (e.g., lone "3" or "- 3 -" on a line) */
const STRAY_PAGE_NUMBERS = /^\s*[-–—]?\s*\d{1,3}\s*[-–—]?\s*$/gm;

/** Normalize bullet symbols to a consistent dash */
const BULLET_VARIANTS = /^[\s]*[•·◦▪▸►‣⁃]\s*/gm;

/** Leading/trailing whitespace per line */
function trimLines(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n');
}

/** Collapse runs of 3+ blank lines to 2 */
function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Full normalization pipeline.
 * Returns cleaned plain text ready for the deterministic parser.
 */
export function normalize(raw: string): string {
  let text = raw;

  // 1. Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Convert tabs to spaces
  text = text.replace(/\t/g, '    ');

  // 3. Strip HTML tags
  text = text.replace(HTML_TAGS, '');

  // 4. Strip markdown code blocks first (before heading/emphasis)
  text = text.replace(MD_CODE_BLOCKS, '');
  text = text.replace(MD_INLINE_CODE, '$1');

  // 5. Strip markdown headings (preserve the heading text)
  text = text.replace(MD_HEADINGS, '');

  // 6. Strip markdown bold/italic (preserve inner text)
  text = text.replace(MD_EMPHASIS, '$2');

  // 7. Strip chat transcript labels
  text = text.replace(CHAT_LABELS, '');

  // 8. Strip AI artifact intro phrases
  for (const pattern of AI_ARTIFACT_PHRASES) {
    text = text.replace(pattern, '');
  }

  // 9. Normalize bullet symbols to "- "
  text = text.replace(BULLET_VARIANTS, '- ');

  // 10. Strip stray page numbers
  text = text.replace(STRAY_PAGE_NUMBERS, '');

  // 11. Trim each line
  text = trimLines(text);

  // 12. Collapse excess blank lines
  text = collapseBlankLines(text);

  return text.trim();
}

/**
 * Split normalized text into logical paragraphs (double-newline separated).
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Detect whether a line looks like a heading/label.
 * Returns true for short lines (< 120 chars) that end with nothing,
 * a colon, or a dash — and don't start with a bullet.
 */
export function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('-') || trimmed.startsWith('•')) return false;
  if (trimmed.length > 120) return false;
  return /^[A-Z0-9\s/'"()&-]{3,}[:\s\-–]?\s*$/.test(trimmed) ||
         /^[IVX]+\.\s+\w/.test(trimmed) ||         // Roman numerals
         /^[A-Z]\.\s+\w/.test(trimmed);             // Alphabetical subsections
}

/**
 * Extract the label from a line that is "Label: content" format,
 * returning { label, content } or null if no colon label detected.
 */
export function extractInlineLabel(line: string): { label: string; content: string } | null {
  const match = line.match(/^([^:]{1,60}):\s+(.+)$/);
  if (!match) return null;
  return { label: match[1].trim(), content: match[2].trim() };
}
