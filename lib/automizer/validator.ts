// lib/automizer/validator.ts
// Stage 4: Schema validation — generates errors and warnings from canonical JSON

import {
  GauntletDocument,
  HitchhikersGuide,
  AutomizerDocument,
  ParseError,
  GauntletChallenge,
  HGChallenge,
  HG_SECTION_TITLES,
  HGSectionNumber,
} from './types';

const ROMAN_ORDER: HGSectionNumber[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function err(code: string, message: string, challengeId?: string, field?: string): ParseError {
  return { severity: 'error', code, message, challengeId, field };
}
function warn(code: string, message: string, challengeId?: string, field?: string): ParseError {
  return { severity: 'warning', code, message, challengeId, field };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauntlet Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateChallenge(c: GauntletChallenge): { errors: ParseError[]; warnings: ParseError[] } {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const id = c.id;

  if (!c.title || c.title.startsWith('Challenge ')) {
    errors.push(err('G001', `Challenge has no title.`, id, 'title'));
  }
  if (!c.scenario || c.scenario.length === 0 || c.scenario.every(p => !p.trim())) {
    errors.push(err('G002', `Challenge "${c.title}" is missing a Scenario.`, id, 'scenario'));
  }
  if (!c.task || !c.task.trim()) {
    errors.push(err('G003', `Challenge "${c.title}" is missing a Task.`, id, 'task'));
  }
  if (!c.modelComponents.goal || !c.modelComponents.goal.trim()) {
    errors.push(err('G004', `Challenge "${c.title}" is missing a Goal/Objective.`, id, 'goal'));
  }
  if (c.modelComponents.relevantFactors.length === 0) {
    errors.push(err('G005', `Challenge "${c.title}" has no Relevant Factors.`, id, 'relevantFactors'));
  }
  if (c.modelComponents.possibleOutcomes.length === 0) {
    errors.push(err('G006', `Challenge "${c.title}" has no Possible Outcomes.`, id, 'possibleOutcomes'));
  }
  if (!c.targetOutcome.name || !c.targetOutcome.name.trim()) {
    errors.push(err('G007', `Challenge "${c.title}" is missing a Target Outcome.`, id, 'targetOutcome'));
  }
  if (!c.targetOutcome.explanation || !c.targetOutcome.explanation.trim()) {
    errors.push(err('G008', `Challenge "${c.title}" is missing a Target Outcome explanation.`, id, 'targetOutcomeExplanation'));
  }
  if (
    c.alternateComponents.goals.length === 0 &&
    c.alternateComponents.factors.length === 0 &&
    c.alternateComponents.outcomes.length === 0
  ) {
    errors.push(err('G009', `Challenge "${c.title}" has no Alternate Components.`, id, 'alternateComponents'));
  }

  // Check target outcome matches a possible outcome
  if (c.targetOutcome.name && c.modelComponents.possibleOutcomes.length > 0) {
    const match = c.modelComponents.possibleOutcomes.some(
      po => po.trim().toLowerCase() === c.targetOutcome.name.trim().toLowerCase()
    );
    if (!match) {
      warnings.push(
        warn('G010', `Challenge "${c.title}": Target Outcome text does not exactly match any Possible Outcome. Please verify.`, id, 'targetOutcome')
      );
    }
  }

  // Warnings
  if (c.modelComponents.possibleOutcomes.length === 1) {
    warnings.push(warn('G011', `Challenge "${c.title}" has only one Possible Outcome.`, id, 'possibleOutcomes'));
  }

  // Check for duplicate outcomes
  const outcomeSet = new Set(c.modelComponents.possibleOutcomes.map(o => o.toLowerCase().trim()));
  if (outcomeSet.size < c.modelComponents.possibleOutcomes.length) {
    errors.push(err('G012', `Challenge "${c.title}" has duplicate Possible Outcomes.`, id, 'possibleOutcomes'));
  }

  // Warn if a factor is a long paragraph
  for (const factor of c.modelComponents.relevantFactors) {
    if (factor.split(' ').length > 20) {
      warnings.push(warn('G013', `Challenge "${c.title}": A Relevant Factor appears to be a long paragraph. Factors should be concise.`, id, 'relevantFactors'));
      break;
    }
  }

  // Warn if challenge is unusually short
  const wordCount = [
    c.scenario.join(' '),
    c.task,
    c.targetOutcome.explanation,
  ].join(' ').split(/\s+/).length;
  if (wordCount < 50) {
    warnings.push(warn('G014', `Challenge "${c.title}" appears unusually short (${wordCount} words). Please verify all sections were detected.`, id));
  }

  return { errors, warnings };
}

export function validateGauntlet(doc: GauntletDocument): { errors: ParseError[]; warnings: ParseError[] } {
  const allErrors: ParseError[] = [];
  const allWarnings: ParseError[] = [];

  if (!doc.sections || doc.sections.length === 0) {
    allErrors.push(err('G000', 'No challenges were detected in the document.'));
    return { errors: allErrors, warnings: allWarnings };
  }

  for (const section of doc.sections) {
    if (!section.challenges || section.challenges.length === 0) {
      allWarnings.push(warn('G015', `Section "${section.sectionTitle}" contains no challenges.`));
    }
    for (const challenge of section.challenges) {
      const { errors, warnings } = validateChallenge(challenge);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
    }
  }

  return { errors: allErrors, warnings: allWarnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hitchhiker's Guide Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateHGChallenge(c: HGChallenge): { errors: ParseError[]; warnings: ParseError[] } {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const id = c.id;

  if (!c.title || c.title === 'Challenge') {
    errors.push(err('H001', 'A Hitchhiker\'s Guide challenge has no title.', id, 'title'));
  }

  const presentSections = Object.keys(c.sections) as HGSectionNumber[];

  // Check all 9 sections present
  for (const required of ROMAN_ORDER) {
    if (!c.sections[required]) {
      errors.push(err('H002', `Challenge "${c.title}" is missing required section ${required}: ${HG_SECTION_TITLES[required]}.`, id));
    }
  }

  // Check order
  const presentOrdered = ROMAN_ORDER.filter(s => presentSections.includes(s));
  for (let i = 0; i < presentOrdered.length - 1; i++) {
    const a = ROMAN_ORDER.indexOf(presentOrdered[i]);
    const b = ROMAN_ORDER.indexOf(presentOrdered[i + 1]);
    if (b < a) {
      errors.push(err('H003', `Challenge "${c.title}": Sections appear out of order (${presentOrdered[i]} after ${presentOrdered[i + 1]}).`, id));
    }
  }

  // Section-specific checks
  if (c.sections.VI && c.sections.VI.subsections.length === 0) {
    errors.push(err('H004', `Challenge "${c.title}": Section VI (Target Outcome) has no content.`, id));
  }
  if (c.sections.VII && c.sections.VII.subsections.length === 0) {
    errors.push(err('H005', `Challenge "${c.title}": Section VII (Possible Outcomes) has no content.`, id));
  }
  if (c.sections.IX && c.sections.IX.subsections.length === 0) {
    errors.push(err('H006', `Challenge "${c.title}": Section IX (Facilitator Notes) has no content.`, id));
  }

  // Warnings
  for (const section of Object.values(c.sections)) {
    if (section && section.subsections.length === 0) {
      warnings.push(warn('H007', `Challenge "${c.title}": Section ${section.number} has no alphabetical subsections.`, id));
    }
    for (const sub of section?.subsections ?? []) {
      if (sub.points.length === 0 && !sub.content) {
        warnings.push(warn('H008', `Challenge "${c.title}": Subsection ${section?.number}${sub.label} has no content.`, id));
      }
    }
  }

  if (c.sections.IX && c.sections.IX.subsections.every(s => s.points.length <= 1)) {
    warnings.push(warn('H009', `Challenge "${c.title}": Section IX (Facilitator Notes) appears unusually brief.`, id));
  }

  return { errors, warnings };
}

export function validateHitchhikersGuide(doc: HitchhikersGuide): { errors: ParseError[]; warnings: ParseError[] } {
  const allErrors: ParseError[] = [];
  const allWarnings: ParseError[] = [];

  if (!doc.challenges || doc.challenges.length === 0) {
    allErrors.push(err('H000', 'No challenges were detected in the Hitchhiker\'s Guide.'));
    return { errors: allErrors, warnings: allWarnings };
  }

  for (const challenge of doc.challenges) {
    const { errors, warnings } = validateHGChallenge(challenge);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  return { errors: allErrors, warnings: allWarnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified validate entry point
// ─────────────────────────────────────────────────────────────────────────────
export function validateDocument(doc: AutomizerDocument): { errors: ParseError[]; warnings: ParseError[] } {
  if (doc.documentType === 'gauntlet') {
    return validateGauntlet(doc);
  } else {
    return validateHitchhikersGuide(doc);
  }
}
