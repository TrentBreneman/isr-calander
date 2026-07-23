// lib/automizer/parser.ts
// Stage 2: Deterministic parsing of normalized text into canonical JSON

import { normalize, splitParagraphs, extractInlineLabel } from './normalizer';
import { applyStyleDictionaryToObject } from './style-dict';
import {
  GauntletDocument,
  GauntletChallenge,
  GauntletSection,
  HitchhikersGuide,
  HGChallenge,
  HGSection,
  HGSubsection,
  HGSectionNumber,
  HG_SECTION_TITLES,
  DocumentMetadata,
  ParseError,
  ModelComponents,
  TargetOutcome,
  AlternateComponents,
  Hints,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Heading Alias Map
// ─────────────────────────────────────────────────────────────────────────────
type GauntletFieldKey =
  | 'scenario' | 'task' | 'goal' | 'relevantFactors' | 'possibleOutcomes'
  | 'targetOutcome' | 'targetOutcomeExplanation' | 'alternateGoals'
  | 'alternateFactors' | 'alternateOutcomes' | 'goalHints' | 'factorHints'
  | 'outcomeHints' | 'modelComponents' | 'alternateComponents' | 'hints';

const HEADING_ALIASES: Record<GauntletFieldKey, string[]> = {
  scenario: ['scenario', 'case', 'case scenario', 'decision context', 'situation', 'background'],
  task: ['task', 'assignment', 'challenge task', 'participant task', 'your task', 'the task'],
  goal: ['goal', 'goal/objective', 'correct goal', 'objective', 'correct objective', 'goal objective'],
  relevantFactors: [
    'relevant factors', 'factors', 'correct factors', 'key factors',
    'relevant factor', 'factor', 'model factors',
  ],
  possibleOutcomes: [
    'possible outcomes', 'outcomes', 'correct outcomes', 'decision options',
    'possible outcome', 'outcome options',
  ],
  targetOutcome: [
    'target outcome', 'correct outcome', 'recommended outcome', 'answer',
    'target', 'best outcome', 'selected outcome',
  ],
  targetOutcomeExplanation: ['explanation', 'target outcome explanation', 'rationale', 'reasoning'],
  alternateGoals: ['alternate goal options', 'alternate goals', 'incorrect goals', 'other goals', 'alternative goals'],
  alternateFactors: ['alternate factor options', 'alternate factors', 'incorrect factors', 'alternative factors'],
  alternateOutcomes: ['alternate outcome options', 'alternate outcomes', 'incorrect outcomes', 'alternative outcomes'],
  goalHints: ['goal hints', 'hints for goal', 'goal hint'],
  factorHints: ['factor hints', 'hints for factors', 'factor hint'],
  outcomeHints: ['outcome hints', 'hints for outcomes', 'outcome hint'],
  modelComponents: ['model components', 'model', 'components'],
  alternateComponents: ['alternate components', 'alternates', 'alternative components', 'incorrect components'],
  hints: ['hints', 'hint section', 'facilitation hints'],
};

function matchHeading(line: string): GauntletFieldKey | null {
  const normalized = line.toLowerCase().replace(/[^a-z0-9\s/]/g, '').trim();
  for (const [key, aliases] of Object.entries(HEADING_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === alias || normalized.startsWith(alias + ' ')) {
        return key as GauntletFieldKey;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function generateId(prefix: string, index: number): string {
  return `${prefix}-${String(index + 1).padStart(2, '0')}`;
}

/** Extract list items from a block of lines */
function extractListItems(lines: string[]): string[] {
  const items: string[] = [];
  let current = '';

  for (const line of lines) {
    const listMatch = line.match(/^[-•*\d]+[.)]\s+(.+)/);
    if (listMatch) {
      if (current) items.push(current.trim());
      current = listMatch[1];
    } else if (line.match(/^\s{2,}/) && current) {
      // continuation
      current += ' ' + line.trim();
    } else if (line.trim() && current) {
      items.push(current.trim());
      current = '';
      // might be unlabeled continuation
      if (!matchHeading(line)) {
        current = line.trim();
      }
    }
  }
  if (current.trim()) items.push(current.trim());
  return items.filter(Boolean);
}

/** Split normalized text into lines */
function toLines(text: string): string[] {
  return text.split('\n');
}

/** Is this a company-level section heading? */
function isCompanySectionHeading(line: string): boolean {
  // e.g. "Bimbo Bakeries Gauntlet Challenges" or "Draft Bimbo Bakeries Gauntlet Challenges"
  return /gauntlet challenges?$/i.test(line.trim()) || /^draft\s+\w/i.test(line.trim());
}

/** Is this likely a challenge title (not a section heading or field label)? */
function isChallengeTitleLine(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (matchHeading(trimmed)) return false;
  if (isCompanySectionHeading(trimmed)) return false;
  // Challenge titles tend to be title-cased, short, and followed by "Scenario" content
  const titleCase = trimmed.split(' ').every(w => !w || /^[A-Z]/.test(w) || /^(a|an|the|of|in|and|or|for|to|at|by|on)$/i.test(w));
  const isShort = trimmed.split(' ').length <= 12;
  const nextIsScenario = nextLine ? /^scenario/i.test(nextLine.trim()) : false;
  return titleCase && isShort && (nextIsScenario || trimmed.length < 80);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauntlet Parser
// ─────────────────────────────────────────────────────────────────────────────
export interface GauntletParseResult {
  document: Partial<GauntletDocument>;
  errors: ParseError[];
  warnings: ParseError[];
  ambiguousBlocks: string[];  // blocks the AI fallback should handle
}

export function parseGauntlet(rawText: string, metadata: DocumentMetadata): GauntletParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const ambiguousBlocks: string[] = [];

  const normalized = normalize(rawText);
  const lines = toLines(normalized);

  const sections: GauntletSection[] = [];
  let currentSection: GauntletSection = {
    sectionTitle: metadata.companyOrGauntletName || 'Gauntlet Challenges',
    sectionType: 'company',
    challenges: [],
  };
  sections.push(currentSection);

  let currentChallenge: Partial<GauntletChallenge> | null = null;
  let currentField: GauntletFieldKey | null = null;
  let currentLines: string[] = [];
  let inAlternateComponents = false;
  let inHints = false;
  let challengeIndex = 0;

  const flushField = () => {
    if (!currentChallenge || !currentField || currentLines.length === 0) return;
    const content = currentLines.join('\n').trim();
    const listItems = extractListItems(currentLines);

    switch (currentField) {
      case 'scenario':
        currentChallenge.scenario = splitParagraphs(content);
        break;
      case 'task':
        currentChallenge.task = content;
        break;
      case 'goal':
        if (!currentChallenge.modelComponents) {
          currentChallenge.modelComponents = { goal: '', relevantFactors: [], possibleOutcomes: [] };
        }
        currentChallenge.modelComponents.goal = content;
        break;
      case 'relevantFactors':
        if (!currentChallenge.modelComponents) {
          currentChallenge.modelComponents = { goal: '', relevantFactors: [], possibleOutcomes: [] };
        }
        currentChallenge.modelComponents.relevantFactors = listItems.length ? listItems : [content];
        break;
      case 'possibleOutcomes':
        if (!currentChallenge.modelComponents) {
          currentChallenge.modelComponents = { goal: '', relevantFactors: [], possibleOutcomes: [] };
        }
        currentChallenge.modelComponents.possibleOutcomes = listItems.length ? listItems : [content];
        break;
      case 'targetOutcome': {
        if (!currentChallenge.targetOutcome) {
          currentChallenge.targetOutcome = { name: '', explanation: '' };
        }
        // Check for inline format "Target Outcome: Outcome Name"
        const inlineLabelMatch = extractInlineLabel(content.split('\n')[0]);
        if (inlineLabelMatch && /target outcome/i.test(inlineLabelMatch.label)) {
          currentChallenge.targetOutcome.name = inlineLabelMatch.content;
        } else {
          currentChallenge.targetOutcome.name = content.split('\n')[0].trim();
        }
        break;
      }
      case 'targetOutcomeExplanation':
        if (!currentChallenge.targetOutcome) {
          currentChallenge.targetOutcome = { name: '', explanation: '' };
        }
        currentChallenge.targetOutcome.explanation = content;
        break;
      case 'alternateGoals':
        if (!currentChallenge.alternateComponents) {
          currentChallenge.alternateComponents = { goals: [], factors: [], outcomes: [] };
        }
        currentChallenge.alternateComponents.goals = listItems.length ? listItems : [content];
        break;
      case 'alternateFactors':
        if (!currentChallenge.alternateComponents) {
          currentChallenge.alternateComponents = { goals: [], factors: [], outcomes: [] };
        }
        currentChallenge.alternateComponents.factors = listItems.length ? listItems : [content];
        break;
      case 'alternateOutcomes':
        if (!currentChallenge.alternateComponents) {
          currentChallenge.alternateComponents = { goals: [], factors: [], outcomes: [] };
        }
        currentChallenge.alternateComponents.outcomes = listItems.length ? listItems : [content];
        break;
      case 'goalHints':
        if (!currentChallenge.hints) {
          currentChallenge.hints = { goalHints: [], factorHints: [], outcomeHints: [] };
        }
        currentChallenge.hints.goalHints = listItems;
        break;
      case 'factorHints':
        if (!currentChallenge.hints) {
          currentChallenge.hints = { goalHints: [], factorHints: [], outcomeHints: [] };
        }
        currentChallenge.hints.factorHints = listItems;
        break;
      case 'outcomeHints':
        if (!currentChallenge.hints) {
          currentChallenge.hints = { goalHints: [], factorHints: [], outcomeHints: [] };
        }
        currentChallenge.hints.outcomeHints = listItems;
        break;
    }
    currentLines = [];
  };

  const finalizeChallenge = () => {
    if (!currentChallenge) return;
    flushField();
    const challenge = fillDefaults(currentChallenge, challengeIndex);
    currentSection.challenges.push(challenge);
    challengeIndex++;
    currentChallenge = null;
    currentField = null;
    inAlternateComponents = false;
    inHints = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentField) currentLines.push('');
      continue;
    }

    // Check for section headings
    if (isCompanySectionHeading(trimmed)) {
      finalizeChallenge();
      // Start a new section
      currentSection = {
        sectionTitle: trimmed.replace(/^draft\s+/i, '').trim(),
        sectionType: 'company',
        challenges: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Try to match a field heading
    // First check for inline label (e.g., "Scenario: text here")
    const inlineLabel = extractInlineLabel(trimmed);
    let fieldMatch: GauntletFieldKey | null = null;

    if (inlineLabel) {
      fieldMatch = matchHeading(inlineLabel.label);
    } else {
      fieldMatch = matchHeading(trimmed);
    }

    if (fieldMatch === 'modelComponents') {
      flushField();
      currentField = null;
      inAlternateComponents = false;
      continue;
    }
    if (fieldMatch === 'alternateComponents') {
      flushField();
      inAlternateComponents = true;
      currentField = null;
      continue;
    }
    if (fieldMatch === 'hints') {
      flushField();
      inHints = true;
      inAlternateComponents = false;
      currentField = null;
      continue;
    }

    // Remap fields based on context (inside alternateComponents or hints)
    if (inAlternateComponents && fieldMatch === 'goal') fieldMatch = 'alternateGoals';
    if (inAlternateComponents && fieldMatch === 'relevantFactors') fieldMatch = 'alternateFactors';
    if (inAlternateComponents && fieldMatch === 'possibleOutcomes') fieldMatch = 'alternateOutcomes';
    if (inHints && fieldMatch === 'goal') fieldMatch = 'goalHints';
    if (inHints && fieldMatch === 'relevantFactors') fieldMatch = 'factorHints';
    if (inHints && fieldMatch === 'possibleOutcomes') fieldMatch = 'outcomeHints';

    if (fieldMatch) {
      flushField();
      currentField = fieldMatch;
      inAlternateComponents = false; // reset when we hit a new unambiguous top-level field
      if (inlineLabel) {
        currentLines = [inlineLabel.content];
      }
      continue;
    }

    // Check if this looks like a new challenge title
    const nextLine = lines[i + 1]?.trim() || '';
    if (!currentField && isChallengeTitleLine(trimmed, nextLine)) {
      finalizeChallenge();
      currentChallenge = { id: generateId('challenge', challengeIndex), title: trimmed };
      continue;
    }

    // Otherwise, accumulate into current field
    if (currentField) {
      currentLines.push(line);
    } else if (currentChallenge && trimmed) {
      // Unclassified content inside a challenge
      ambiguousBlocks.push(`[challenge:${currentChallenge.title}] ${trimmed}`);
    } else if (trimmed && !currentChallenge) {
      // Might be a title or metadata we missed — attempt to treat as title
      finalizeChallenge();
      currentChallenge = { id: generateId('challenge', challengeIndex), title: trimmed };
    }
  }

  finalizeChallenge();

  // Apply style dictionary
  const cleanedSections = applyStyleDictionaryToObject(sections);

  const document: Partial<GauntletDocument> = {
    documentType: 'gauntlet',
    metadata,
    sections: cleanedSections,
  };

  return { document, errors, warnings, ambiguousBlocks };
}

/** Fill missing fields with safe defaults */
function fillDefaults(c: Partial<GauntletChallenge>, index: number): GauntletChallenge {
  return {
    id: c.id ?? generateId('challenge', index),
    title: c.title ?? `Challenge ${index + 1}`,
    challengeType: c.challengeType ?? 'standard',
    scenario: c.scenario ?? [],
    task: c.task ?? '',
    modelComponents: c.modelComponents ?? { goal: '', relevantFactors: [], possibleOutcomes: [] },
    targetOutcome: c.targetOutcome ?? { name: '', explanation: '' },
    alternateComponents: c.alternateComponents ?? { goals: [], factors: [], outcomes: [] },
    hints: c.hints ?? { goalHints: [], factorHints: [], outcomeHints: [] },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hitchhiker's Guide Parser
// ─────────────────────────────────────────────────────────────────────────────
const ROMAN_NUMERALS: HGSectionNumber[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

const HG_SECTION_ALIASES: Record<string, HGSectionNumber> = {
  'scenario summary': 'I',
  'scenario summary and decision context': 'I',
  'decision context': 'I',
  'why the goal': 'II',
  'why the goal and objective are correct': 'II',
  'correct goal': 'II',
  'why the alternate goals are incorrect': 'III',
  'alternate goals are incorrect': 'III',
  'incorrect goals': 'III',
  'why the relevant factors are correct': 'IV',
  'relevant factors are correct': 'IV',
  'correct factors': 'IV',
  'why the alternate factors are incorrect': 'V',
  'alternate factors are incorrect': 'V',
  'incorrect factors': 'V',
  'why the target outcome is correct': 'VI',
  'target outcome is correct': 'VI',
  'correct outcome': 'VI',
  'why the possible outcomes are incorrect': 'VII',
  'possible outcomes are incorrect': 'VII',
  'incorrect outcomes': 'VII',
  'why the alternate outcome options are incorrect': 'VIII',
  'alternate outcome options are incorrect': 'VIII',
  'alternate outcomes are incorrect': 'VIII',
  'facilitator notes': 'IX',
  'facilitator notes on strong reasoning': 'IX',
  'strong reasoning': 'IX',
};

function matchHGSection(line: string): HGSectionNumber | null {
  const trimmed = line.trim();

  // Match Roman numeral: "I.", "II.", "III." etc. at start
  const romanMatch = trimmed.match(/^(I{1,3}|IV|V|VI{1,3}|VIII|IX)\.\s+(.*)/i);
  if (romanMatch) {
    const numeral = romanMatch[1].toUpperCase() as HGSectionNumber;
    if (ROMAN_NUMERALS.includes(numeral)) return numeral;
  }

  // Match by alias
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  for (const [alias, numeral] of Object.entries(HG_SECTION_ALIASES)) {
    if (normalized.startsWith(alias)) return numeral;
  }

  return null;
}

function matchAlphaSubsection(line: string): string | null {
  const match = line.trim().match(/^([A-Z])\.\s+(.*)/);
  return match ? match[1] : null;
}

function matchNumberedPoint(line: string): number | null {
  const match = line.trim().match(/^(\d+)\.\s+(.*)/);
  return match ? parseInt(match[1], 10) : null;
}

export interface HGParseResult {
  document: Partial<HitchhikersGuide>;
  errors: ParseError[];
  warnings: ParseError[];
  ambiguousBlocks: string[];
}

export function parseHitchhikersGuide(rawText: string, metadata: DocumentMetadata): HGParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const ambiguousBlocks: string[] = [];

  const normalized = normalize(rawText);
  const lines = toLines(normalized);

  const challenges: HGChallenge[] = [];
  let currentChallenge: Partial<HGChallenge> | null = null;
  let currentSection: Partial<HGSection> | null = null;
  let currentSubsection: Partial<HGSubsection> | null = null;
  let challengeIndex = 0;

  const flushSubsection = () => {
    if (!currentSection || !currentSubsection) return;
    if (!currentSection.subsections) currentSection.subsections = [];
    currentSection.subsections.push({
      label: currentSubsection.label ?? 'A',
      content: currentSubsection.content ?? '',
      points: currentSubsection.points ?? [],
    });
    currentSubsection = null;
  };

  const flushSection = () => {
    if (!currentChallenge || !currentSection) return;
    flushSubsection();
    if (!currentChallenge.sections) currentChallenge.sections = {};
    const numeral = currentSection.number;
    if (numeral) {
      currentChallenge.sections[numeral] = {
        number: numeral,
        title: currentSection.title ?? HG_SECTION_TITLES[numeral],
        subsections: currentSection.subsections ?? [],
      };
    }
    currentSection = null;
  };

  const flushChallenge = () => {
    if (!currentChallenge) return;
    flushSection();
    challenges.push({
      id: currentChallenge.id ?? generateId('hg-challenge', challengeIndex),
      title: currentChallenge.title ?? `Challenge ${challengeIndex + 1}`,
      sections: currentChallenge.sections ?? {},
    });
    challengeIndex++;
    currentChallenge = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for Roman numeral section
    const sectionNum = matchHGSection(trimmed);
    if (sectionNum) {
      flushSection();
      if (!currentChallenge) {
        currentChallenge = { id: generateId('hg-challenge', challengeIndex), title: 'Challenge', sections: {} };
      }
      // Extract the section title from the line
      const afterNumeral = trimmed.replace(/^(I{1,3}|IV|V|VI{1,3}|VIII|IX)\.\s*/i, '').trim();
      currentSection = {
        number: sectionNum,
        title: afterNumeral || HG_SECTION_TITLES[sectionNum],
        subsections: [],
      };
      continue;
    }

    // Check for alphabetical subsection
    const alphaLabel = matchAlphaSubsection(trimmed);
    if (alphaLabel && currentSection) {
      flushSubsection();
      const content = trimmed.replace(/^[A-Z]\.\s+/, '').trim();
      currentSubsection = { label: alphaLabel, content, points: [] };
      continue;
    }

    // Check for numbered point
    const pointNum = matchNumberedPoint(trimmed);
    if (pointNum !== null && currentSubsection) {
      const content = trimmed.replace(/^\d+\.\s+/, '').trim();
      currentSubsection.points = currentSubsection.points ?? [];
      currentSubsection.points.push(content);
      continue;
    }

    // If we have no section yet, this might be a challenge title
    if (!currentSection && trimmed) {
      flushChallenge();
      currentChallenge = {
        id: generateId('hg-challenge', challengeIndex),
        title: trimmed,
        sections: {},
      };
      continue;
    }

    // Continuation content
    if (currentSubsection) {
      currentSubsection.content = (currentSubsection.content ?? '') + ' ' + trimmed;
    } else if (currentSection) {
      ambiguousBlocks.push(`[section:${currentSection.number}] ${trimmed}`);
    }
  }

  flushChallenge();

  const cleanedChallenges = applyStyleDictionaryToObject(challenges);

  const document: Partial<HitchhikersGuide> = {
    documentType: 'hitchhikers-guide',
    metadata,
    challenges: cleanedChallenges,
  };

  return { document, errors, warnings, ambiguousBlocks };
}
