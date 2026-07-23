// lib/automizer/types.ts
// Canonical type definitions for the Gauntlet Document Automizer

export type WorkProductType = 'gauntlet' | 'hitchhikers-guide';
export type OutputFormat = 'pdf' | 'docx' | 'both';
export type CorrectionMode = 'formatting-only' | 'grammar-mechanics' | 'grammar-style';

// ─────────────────────────────────────────────
// Document Metadata
// ─────────────────────────────────────────────
export interface DocumentMetadata {
  title: string;
  headerTitle: string;
  date: string;           // e.g. "July 2026"
  author: string;         // default "iSolvRisk Inc."
  client?: string;
  companyOrGauntletName?: string;
  logoAssetId?: string;   // path to logo asset
  outputFormat: OutputFormat;
}

// ─────────────────────────────────────────────
// Gauntlet Types
// ─────────────────────────────────────────────
export interface ModelComponents {
  goal: string;
  relevantFactors: string[];
  possibleOutcomes: string[];
}

export interface TargetOutcome {
  name: string;
  explanation: string;
}

export interface AlternateComponents {
  goals: string[];
  factors: string[];
  outcomes: string[];
}

export interface Hints {
  goalHints: string[];
  factorHints: string[];
  outcomeHints: string[];
}

export interface GauntletChallenge {
  id: string;
  title: string;
  challengeType: 'standard' | 'walkthrough';
  scenario: string[];
  task: string;
  modelComponents: ModelComponents;
  targetOutcome: TargetOutcome;
  alternateComponents: AlternateComponents;
  hints: Hints;
}

export interface GauntletSection {
  sectionTitle: string;
  sectionType: 'company' | 'general';
  challenges: GauntletChallenge[];
}

export interface GauntletDocument {
  documentType: 'gauntlet';
  metadata: DocumentMetadata;
  sections: GauntletSection[];
}

// ─────────────────────────────────────────────
// Hitchhiker's Guide Types
// ─────────────────────────────────────────────
export type HGSectionNumber = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX';

export interface HGSubsection {
  label: string;       // e.g. "A", "B", "C"
  content: string;
  points: string[];    // numbered supporting points
}

export interface HGSection {
  number: HGSectionNumber;
  title: string;
  subsections: HGSubsection[];
}

export interface HGChallenge {
  id: string;
  title: string;
  sections: Partial<Record<HGSectionNumber, HGSection>>;
}

export interface HitchhikersGuide {
  documentType: 'hitchhikers-guide';
  metadata: DocumentMetadata;
  challenges: HGChallenge[];
}

// ─────────────────────────────────────────────
// Union for the canonical document
// ─────────────────────────────────────────────
export type AutomizerDocument = GauntletDocument | HitchhikersGuide;

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────
export type ErrorSeverity = 'error' | 'warning';

export interface ParseError {
  severity: ErrorSeverity;
  code: string;
  message: string;
  challengeId?: string;
  field?: string;
}

// ─────────────────────────────────────────────
// Grammar Suggestions
// ─────────────────────────────────────────────
export type GrammarSeverity = 'required' | 'recommended' | 'suggestion';

export interface GrammarSuggestion {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  severity: GrammarSeverity;
  accepted?: boolean;   // undefined = pending, true = accepted, false = rejected
  location: {
    challengeId: string;
    field: string;
    paragraphIndex?: number;
  };
}

// ─────────────────────────────────────────────
// Full Automizer State
// ─────────────────────────────────────────────
export interface AutomizerState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  workProduct: WorkProductType | null;
  metadata: DocumentMetadata;
  sourceText: string;
  document: AutomizerDocument | null;
  errors: ParseError[];
  warnings: ParseError[];
  grammarSuggestions: GrammarSuggestion[];
  isAnalyzing: boolean;
  isGenerating: boolean;
  correctionMode: CorrectionMode;
}

// HG section canonical titles
export const HG_SECTION_TITLES: Record<HGSectionNumber, string> = {
  I: 'Scenario Summary and Decision Context',
  II: 'Why the Goal and Objective Are Correct',
  III: 'Why the Alternate Goals Are Incorrect',
  IV: 'Why the Relevant Factors Are Correct',
  V: 'Why the Alternate Factors Are Incorrect',
  VI: 'Why the Target Outcome Is Correct',
  VII: 'Why the Possible Outcomes Are Incorrect',
  VIII: 'Why the Alternate Outcome Options Are Incorrect',
  IX: 'Facilitator Notes on Strong Reasoning',
};
