export type WorkProductType = "gauntlet" | "hitchhikers-guide";

export type OutputFormat = "pdf" | "docx" | "both";

export type HGSectionNumber =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII"
  | "VIII"
  | "IX";

export const ROMAN_ORDER: HGSectionNumber[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
];

export const HG_SECTION_TITLES: Record<HGSectionNumber, string> = {
  I: "Scenario Summary and Decision Context",
  II: "Why the Goal and Objective Are Correct",
  III: "Why the Alternate Goals Are Incorrect",
  IV: "Why the Relevant Factors Are Correct",
  V: "Why the Alternate Factors Are Incorrect",
  VI: "Why the Target Outcome Is Correct",
  VII: "Why the Possible Outcomes Are Incorrect",
  VIII: "Why the Alternate Outcome Options Are Incorrect",
  IX: "Facilitator Notes on Strong Reasoning",
};

export interface DocumentMetadata {
  title?: string;
  headerTitle?: string;
  date?: string;
  author?: string;
  client?: string;
  logoAssetId?: string;
}

export interface HGSubsection {
  label: string;
  content: string;
  points: string[];
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

export interface ParseError {
  code: string;
  message: string;
  id?: string;
  field?: string;
}

export interface HitchhikersGuide {
  documentType: "hitchhikers-guide";
  metadata: DocumentMetadata;
  challenges: HGChallenge[];
}

export interface HGParseResult {
  document: Partial<HitchhikersGuide>;
  errors: ParseError[];
  warnings: ParseError[];
  ambiguousBlocks: string[];
}

export interface GauntletChallengeModel {
  id: string;
  title: string;
  challengeType?: string;
  scenario: string[];
  task: string;
  modelComponents: {
    goal: string;
    relevantFactors: string[];
    possibleOutcomes: string[];
  };
  targetOutcome: {
    name: string;
    explanation: string;
  };
  alternateComponents: {
    goals: string[];
    factors: string[];
    outcomes: string[];
  };
  hints: {
    goalHints: string[];
    factorHints: string[];
    outcomeHints: string[];
  };
}

export interface GauntletSection {
  sectionTitle: string;
  sectionType: "company" | "standard";
  challenges: GauntletChallengeModel[];
}

export interface GauntletDocument {
  documentType: "gauntlet";
  metadata: DocumentMetadata;
  sections: GauntletSection[];
}

export type AutomizerDocument = GauntletDocument | HitchhikersGuide;
