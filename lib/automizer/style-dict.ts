// lib/automizer/style-dict.ts
// iSolvRisk terminology dictionary — applied as a post-parse text normalization pass

export interface StyleDictEntry {
  incorrect: string | RegExp;
  preferred: string;
  caseSensitive?: boolean;
  warnOnly?: boolean;
  isProtected?: boolean; // proofreading tools should NOT touch this
}

export const STYLE_DICTIONARY: StyleDictEntry[] = [
  // Brand name corrections
  { incorrect: /IsolvRisk/gi,          preferred: 'iSolvRisk',             caseSensitive: false },
  { incorrect: /iSolv Risk/g,          preferred: 'iSolvRisk',             caseSensitive: true },
  { incorrect: /iSolvrisk/gi,          preferred: 'iSolvRisk',             caseSensitive: false },
  { incorrect: /ISOLVRISK/g,           preferred: 'iSolvRisk',             caseSensitive: true },

  // Document terminology
  { incorrect: /Correct Outcome/gi,    preferred: 'Target Outcome',        caseSensitive: false },
  { incorrect: /Correct Goal/gi,       preferred: 'Goal/Objective',        caseSensitive: false },
  { incorrect: /Goal Objective/g,      preferred: 'Goal/Objective',        caseSensitive: true },
  { incorrect: /Hitchhikers Guide/gi,  preferred: "Hitchhiker's Guide",    caseSensitive: false },
  { incorrect: /Gauntlet challenge game/gi, preferred: 'Gauntlet',        caseSensitive: false },
  { incorrect: /Gauntlet Challenge Game/g,  preferred: 'Gauntlet',        caseSensitive: true },

  // Capitalization and formality
  {
    incorrect: /\benterprise risk committee\b/gi,
    preferred: 'Enterprise Risk Management Committee',
    warnOnly: true,
  },
  { incorrect: /\bfactors and outcome\b/gi, preferred: 'Factors and Outcomes', caseSensitive: false },

  // Alumni usage
  {
    incorrect: /\balumni\b/g,
    preferred: 'alumnus or alum',
    warnOnly: true,
    caseSensitive: false,
  },
];

/**
 * Protected terms that no proofreading tool should modify.
 * Any suggestion touching these words should be filtered out.
 */
export const PROTECTED_TERMS: string[] = [
  'iSolvRisk',
  'Gauntlet',
  "Hitchhiker's Guide",
  'Target Outcome',
  'Goal/Objective',
  'Relevant Factors',
  'Possible Outcomes',
  'Alternate Components',
  'Model Components',
];

/**
 * Apply the style dictionary to a block of text.
 * Returns corrected text and a list of replacements made.
 */
export function applyStyleDictionary(
  text: string
): { corrected: string; replacements: Array<{ original: string; preferred: string; warnOnly: boolean }> } {
  let corrected = text;
  const replacements: Array<{ original: string; preferred: string; warnOnly: boolean }> = [];

  for (const entry of STYLE_DICTIONARY) {
    const regex =
      entry.incorrect instanceof RegExp
        ? entry.incorrect
        : new RegExp(
            entry.incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            entry.caseSensitive ? 'g' : 'gi'
          );

    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(corrected)) !== null) {
      replacements.push({
        original: match[0],
        preferred: entry.preferred,
        warnOnly: entry.warnOnly ?? false,
      });
      regex.lastIndex = 0; // reset to avoid infinite loop after replacement
      if (!entry.warnOnly) {
        corrected = corrected.replace(regex, entry.preferred);
      }
      break; // one replacement at a time to avoid infinite loops
    }

    if (!entry.warnOnly) {
      corrected = corrected.replace(regex, entry.preferred);
    }
  }

  return { corrected, replacements };
}

/**
 * Apply style dictionary to all text fields in a canonical JSON structure.
 * Returns the cleaned object and a flat list of all replacements.
 */
export function applyStyleDictionaryToObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return applyStyleDictionary(obj).corrected as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(applyStyleDictionaryToObject) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = applyStyleDictionaryToObject(value);
    }
    return result as T;
  }
  return obj;
}
