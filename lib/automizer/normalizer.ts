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

const CHAT_LABELS = /^(User|Assistant|Human|AI|ChatGPT|GPT)[:\s]+/gim;
const HTML_TAGS = /<\/?[^>]+(>|$)/g;
const MD_HEADINGS = /^#{1,6}\s+/gm;
const MD_EMPHASIS = /(\*{1,3}|_{1,3})(.*?)\1/g;
const MD_CODE_BLOCKS = /```[\s\S]*?```/g;
const MD_INLINE_CODE = /`([^`]*)`/g;
const STRAY_PAGE_NUMBERS = /^\s*[-–—]?\s*\d{1,3}\s*[-–—]?\s*$/gm;
const BULLET_VARIANTS = /^[\s]*[•·◦▪▸►‣⁃]\s*/gm;

function trimLines(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n");
}

function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export function normalize(raw: string): string {
  let text = raw;
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/\t/g, "    ");
  text = text.replace(HTML_TAGS, "");
  text = text.replace(MD_CODE_BLOCKS, "");
  text = text.replace(MD_INLINE_CODE, "$1");
  text = text.replace(MD_HEADINGS, "");
  text = text.replace(MD_EMPHASIS, "$2");
  text = text.replace(CHAT_LABELS, "");

  for (const pattern of AI_ARTIFACT_PHRASES) {
    text = text.replace(pattern, "");
  }

  text = text.replace(BULLET_VARIANTS, "- ");
  text = text.replace(STRAY_PAGE_NUMBERS, "");
  text = trimLines(text);
  text = collapseBlankLines(text);

  return text.trim();
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("-") || trimmed.startsWith("•")) return false;
  if (trimmed.length > 120) return false;
  return (
    /^[A-Z0-9\s/'"()&-]{3,}[:\s\-–]?\s*$/.test(trimmed) ||
    /^[IVX]+\.\s+\w/.test(trimmed) ||
    /^[A-Z]\.\s+\w/.test(trimmed)
  );
}

export function extractInlineLabel(
  line: string,
): { label: string; content: string } | null {
  const match = line.match(/^([^:]{1,60}):\s+(.+)$/);
  if (!match) return null;
  return { label: match[1].trim(), content: match[2].trim() };
}
