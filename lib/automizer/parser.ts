// lib/automizer/parser.ts
import {
  AutomizerDocument,
  DocumentMetadata,
  GauntletDocument,
  HitchhikersGuide,
  ParseError,
  HGParseResult,
  GauntletChallengeModel,
  HG_SECTION_TITLES,
  HGSectionNumber,
  HGChallenge,
  HGSection,
  HGSubsection,
} from "./types";
import { isAIAvailable } from "./ai-parser";

export interface GauntletParseResult {
  document: Partial<GauntletDocument>;
  errors: ParseError[];
  warnings: ParseError[];
  ambiguousBlocks: string[];
}

export function parseGauntlet(
  text: string,
  metadata: DocumentMetadata,
): GauntletParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const ambiguousBlocks: string[] = [];
  const challenges: GauntletChallengeModel[] = [];

  const headingAliases: { [key: string]: string[] } = {
    title: ["challenge title", "challenge"],
    scenario: ["scenario", "case", "case scenario", "decision context"],
    task: ["task", "assignment", "challenge task", "participant task"],
    goal: ["goal", "goal/objective", "correct goal", "objective"],
    relevantFactors: [
      "relevant factors",
      "factors",
      "correct factors",
      "key factors",
    ],
    possibleOutcomes: [
      "possible outcomes",
      "outcomes",
      "correct outcomes",
      "decision options",
    ],
    targetOutcome: [
      "target outcome",
      "correct outcome",
      "recommended outcome",
      "answer",
    ],
    explanation: ["explanation", "target outcome explanation"],
    alternateGoals: [
      "alternate goal options",
      "alternate goals",
      "incorrect goals",
    ],
    alternateFactors: [
      "alternate factor options",
      "alternate factors",
      "incorrect factors",
    ],
    alternateOutcomes: [
      "alternate outcome options",
      "alternate outcomes",
      "incorrect outcomes",
    ],
    goalHints: ["goal hints"],
    factorHints: ["factor hints"],
    outcomeHints: ["outcome hints"],
  };

  const aliasMap = new Map<string, string>();
  for (const canonical in headingAliases) {
    for (const alias of headingAliases[canonical]) {
      aliasMap.set(alias, canonical);
    }
  }

  let currentChallenge: Partial<GauntletChallengeModel> = {};
  let currentSection: string | null = null;
  let titleBuffer: string[] = [];

  const hasContent = (c: Partial<GauntletChallengeModel>) =>
    c.scenario?.length || c.task || c.modelComponents?.goal;

  const pushChallenge = () => {
    if (hasContent(currentChallenge)) {
      if (titleBuffer.length > 0 && !currentChallenge.title) {
        currentChallenge.title = titleBuffer.join(" ");
      }
      titleBuffer = [];

      if (!currentChallenge.title) {
        currentChallenge.title = `Untitled Challenge ${challenges.length + 1}`;
        warnings.push({
          code: "G001",
          message: "A challenge was found with no clear title.",
        });
      }

      challenges.push({
        id: `challenge-${Date.now()}-${challenges.length}`,
        title: "Untitled",
        challengeType: "standard",
        scenario: [],
        task: "",
        modelComponents: { goal: "", relevantFactors: [], possibleOutcomes: [] },
        targetOutcome: { name: "", explanation: "" },
        alternateComponents: { goals: [], factors: [], outcomes: [] },
        hints: { goalHints: [], factorHints: [], outcomeHints: [] },
        ...currentChallenge,
      } as GauntletChallengeModel);
    }
    currentChallenge = {};
  };

  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    let trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const normalizeHeading = (s: string) =>
      s
        .toLowerCase()
        .replace(/[:*-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    let canonical = aliasMap.get(normalizeHeading(trimmedLine));
    let content = "";

    if (!canonical) {
      // Handles headings written with content on the same line,
      // e.g. "SCENARIO: The company discovered..." or "Scenario - ...".
      const inlineMatch = trimmedLine.match(/^([a-zA-Z\s/]+)[:\-]\s*(.*)/);
      if (inlineMatch) {
        const headingCandidate = normalizeHeading(inlineMatch[1]);
        const mapped = aliasMap.get(headingCandidate);
        if (mapped) {
          canonical = mapped;
          content = inlineMatch[2].trim();
        }
      }
    }


    if (canonical) {
      if (canonical === "scenario" && hasContent(currentChallenge)) {
        pushChallenge();
      }
      currentSection = canonical;
      if (currentSection === "title" && titleBuffer.length > 0) {
        currentChallenge.title = titleBuffer.join(" ");
        titleBuffer = [];
      }
      if (content) {
        trimmedLine = content;
      } else {
        continue;
      }
    }

    if (!currentSection) {
      titleBuffer.push(trimmedLine);
      continue;
    }

    const listValue = trimmedLine.replace(/^[-*]\s*/, "").trim();

    switch (currentSection) {
      case "title":
        currentChallenge.title =
          (currentChallenge.title || "") + " " + trimmedLine;
        break;
      case "scenario":
        currentChallenge.scenario = [...(currentChallenge.scenario || []), trimmedLine];
        break;
      case "task":
        currentChallenge.task = (currentChallenge.task || "") + " " + trimmedLine;
        break;
      case "goal":
        currentChallenge.modelComponents = {
          ...(currentChallenge.modelComponents || { relevantFactors: [], possibleOutcomes: [] }),
          goal: (currentChallenge.modelComponents?.goal || "") + " " + trimmedLine,
        };
        break;
      case "relevantFactors":
        currentChallenge.modelComponents = {
          ...(currentChallenge.modelComponents || { goal: "", possibleOutcomes: [] }),
          relevantFactors: [
            ...(currentChallenge.modelComponents?.relevantFactors || []),
            listValue,
          ],
        };
        break;
      case "possibleOutcomes":
        currentChallenge.modelComponents = {
          ...(currentChallenge.modelComponents || { goal: "", relevantFactors: [] }),
          possibleOutcomes: [
            ...(currentChallenge.modelComponents?.possibleOutcomes || []),
            listValue,
          ],
        };
        break;
      case "targetOutcome":
        currentChallenge.targetOutcome = {
          ...(currentChallenge.targetOutcome || { explanation: "" }),
          name: (currentChallenge.targetOutcome?.name || "") + " " + trimmedLine,
        };
        break;
      case "explanation":
        currentChallenge.targetOutcome = {
          ...(currentChallenge.targetOutcome || { name: "" }),
          explanation: (currentChallenge.targetOutcome?.explanation || "") + " " + trimmedLine,
        };
        break;
      case "alternateGoals":
        currentChallenge.alternateComponents = {
          ...(currentChallenge.alternateComponents || { factors: [], outcomes: [] }),
          goals: [...(currentChallenge.alternateComponents?.goals || []), listValue],
        };
        break;
      case "alternateFactors":
        currentChallenge.alternateComponents = {
          ...(currentChallenge.alternateComponents || { goals: [], outcomes: [] }),
          factors: [...(currentChallenge.alternateComponents?.factors || []), listValue],
        };
        break;
      case "alternateOutcomes":
        currentChallenge.alternateComponents = {
          ...(currentChallenge.alternateComponents || { goals: [], factors: [] }),
          outcomes: [...(currentChallenge.alternateComponents?.outcomes || []), listValue],
        };
        break;
      case "goalHints":
        currentChallenge.hints = {
          ...(currentChallenge.hints || { factorHints: [], outcomeHints: [] }),
          goalHints: [...(currentChallenge.hints?.goalHints || []), listValue],
        };
        break;
      case "factorHints":
        currentChallenge.hints = {
          ...(currentChallenge.hints || { goalHints: [], outcomeHints: [] }),
          factorHints: [...(currentChallenge.hints?.factorHints || []), listValue],
        };
        break;
      case "outcomeHints":
        currentChallenge.hints = {
          ...(currentChallenge.hints || { goalHints: [], factorHints: [] }),
          outcomeHints: [...(currentChallenge.hints?.outcomeHints || []), listValue],
        };
        break;
      default:
        ambiguousBlocks.push(trimmedLine);
    }
  }

  pushChallenge();

  if (challenges.length === 0) {
    warnings.push({
      code: "G000",
      message: "Could not parse any distinct challenges from the provided text.",
    });
  }

  for (const challenge of challenges) {
    if (!challenge.scenario?.length)
      errors.push({ code: "G002", message: `Challenge "${challenge.title}" is missing a Scenario.`, field: "scenario" });
    if (!challenge.task)
      errors.push({ code: "G003", message: `Challenge "${challenge.title}" is missing a Task.`, field: "task" });
    if (!challenge.modelComponents.goal)
      errors.push({ code: "G004", message: `Challenge "${challenge.title}" is missing a Goal/Objective.`, field: "goal" });
  }

  const document: Partial<GauntletDocument> = {
    documentType: "gauntlet",
    metadata: {
      title: metadata.title || "Gauntlet Challenges",
      headerTitle: metadata.headerTitle || "iSolvRisk - Gauntlet Challenge",
      date: metadata.date || "July 2026",
      author: metadata.author || "iSolvRisk Inc.",
      client: metadata.client || "",
      logoAssetId: "isolvrisk-primary-logo",
    },
    sections: [
      {
        sectionTitle: metadata.title || "Gauntlet Challenges",
        sectionType: "standard",
        challenges: challenges,
      },
    ],
  };

  return { document, errors, warnings, ambiguousBlocks };
}

function buildFallbackHitchhikersGuide(
  text: string,
  metadata: DocumentMetadata,
): Partial<HitchhikersGuide> {
  const challenges: HGChallenge[] = [];
  let currentChallenge: HGChallenge = {
    id: `hg-challenge-${challenges.length + 1}`,
    title: "",
    sections: {},
  };
  let titleBuffer: string[] = [];

  const titleToNumeral = new Map<string, HGSectionNumber>();
  for (const key in HG_SECTION_TITLES) {
    const numeral = key as HGSectionNumber;
    titleToNumeral.set(HG_SECTION_TITLES[numeral].toLowerCase(), numeral);
  }

  let currentSection: HGSection | null = null;
  let currentSubsection: HGSubsection | null = null;

  const lines = text.replace(/\r/g, "").split("\n");

  const pushChallenge = () => {
    if (Object.keys(currentChallenge.sections).length > 0) {
      if (!currentChallenge.title && titleBuffer.length > 0) {
        currentChallenge.title = titleBuffer.join(" ").trim();
      } else if (!currentChallenge.title) {
        currentChallenge.title = `Untitled Guide ${challenges.length + 1}`;
      }
      challenges.push(currentChallenge);
    }
    currentChallenge = {
      id: `hg-challenge-${challenges.length + 1}`,
      title: "",
      sections: {},
    };
    titleBuffer = [];
  };

  const arabicToRomanMap: { [key: string]: HGSectionNumber } = {
      "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
      "6": "VI", "7": "VII", "8": "VIII", "9": "IX"
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    // Try to detect a section by its canonical title
    let detectedNumeral: HGSectionNumber | null = null;
    const romanMatch = trimmed.match(/^(IX|VIII|VII|VI|V|IV|III|II|I)(?:\.|:|\s|-)/);
    const arabicMatch = trimmed.match(/^([1-9])(?:\.|:|\s|-)/);
    
    if (romanMatch) {
        detectedNumeral = romanMatch[1] as HGSectionNumber;
    } else if (arabicMatch) {
        detectedNumeral = arabicToRomanMap[arabicMatch[1]];
    } else {
        for (const [title, numeral] of titleToNumeral.entries()) {
            if (lower.includes(title)) {
                detectedNumeral = numeral;
                break;
            }
        }
    }

    if (detectedNumeral) {
      if (
        detectedNumeral === "I" &&
        Object.keys(currentChallenge.sections).length > 0
      ) {
        pushChallenge();
      }
      currentSection = {
        number: detectedNumeral,
        title: HG_SECTION_TITLES[detectedNumeral],
        subsections: [],
      };
      currentChallenge.sections[detectedNumeral] = currentSection;
      currentSubsection = null;
      // Check for content on the same line as the Roman numeral
      const titlePattern = new RegExp(`^(IX|VIII|VII|VI|V|IV|III|II|I|[1-9])(?:\\.|:|\\s|-)`, "i");
      const contentAfterTitle = trimmed.replace(titlePattern, "").trim();
      if(contentAfterTitle) {
          // This is intro content before any 'A.' subsections.
          // Create an implicit subsection to hold it.
          currentSubsection = { label: 'intro', content: [contentAfterTitle], points: [] };
          currentSection.subsections.push(currentSubsection);
      }
      continue;
    }

    if (!currentSection) {
      titleBuffer.push(trimmed);
      continue;
    }

    const alphaMatch = trimmed.match(/^([A-Z])(?:\.|:|-)\s*(.*)/);
    if (alphaMatch) {
      currentSubsection = {
        label: alphaMatch[1],
        content: [],
        points: [],
      };
      const content = alphaMatch[2].trim();
      if(content) {
        currentSubsection.content.push(content);
      }
      currentSection.subsections.push(currentSubsection);
      continue;
    }

    const numericMatch = trimmed.match(/^\d+(?:\.|:|-)\s*(.*)/);
    if (numericMatch && currentSubsection) {
      currentSubsection.points.push(numericMatch[1].trim());
      continue;
    }
    
    // This is a continuation of the previous content (paragraph or intro)
    if (trimmed) {
        if (currentSubsection) {
            // Add to the content of the current subsection
            currentSubsection.content.push(trimmed);
        } else {
            // Content directly under a roman numeral, create an implicit subsection
            currentSubsection = { label: 'intro', content: [trimmed], points: [] };
            currentSection.subsections.push(currentSubsection);
        }
    }
  }

  pushChallenge();

  if (challenges.length === 0) {
    return {
      documentType: "hitchhikers-guide",
      metadata,
      challenges: [
        {
          id: "hg-challenge-1",
          title: metadata.title || "Imported Hitchhiker's Guide",
          sections: {},
        },
      ],
    };
  }

  return {
    documentType: "hitchhikers-guide",
    metadata: {
      ...metadata,
      title: metadata.title || "Hitchhiker’s Guide",
    },
    challenges,
  };
}

export async function parseHitchhikersGuide(
  text: string,
  metadata: DocumentMetadata,
): Promise<HGParseResult> {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const ambiguousBlocks: string[] = [];

  if (!text.trim()) {
    errors.push({
      code: "HG001",
      message: "Source text is empty for Hitchhiker's Guide.",
    });
    return {
      document: buildFallbackHitchhikersGuide("", metadata),
      errors,
      warnings,
      ambiguousBlocks,
    };
  }
  
  // Per spec, use deterministic parsing first.
  const document = buildFallbackHitchhikersGuide(text, metadata);

  // Future enhancement: Use AI to classify ambiguous blocks found by the deterministic parser.
  if (isAIAvailable()) {
    // For example:
    // if (ambiguousBlocks.length > 0) {
    //   const corrections = await aiCorrectAmbiguities(ambiguousBlocks);
    //   applyCorrections(document, corrections);
    // }
    warnings.push({
      code: 'HG_AI_NOTE',
      message: 'AI processing is available but not yet implemented for ambiguity resolution.'
    });
  }

  return { document, errors, warnings, ambiguousBlocks };
}

export async function parseDocument(
  workProduct: "gauntlet" | "hitchhikers-guide",
  text: string,
  metadata: DocumentMetadata,
): Promise<{
  document: AutomizerDocument;
  errors: ParseError[];
  warnings: ParseError[];
}> {
  if (workProduct === "gauntlet") {
    const res = parseGauntlet(text, metadata);
    return {
      document: res.document as AutomizerDocument,
      errors: res.errors,
      warnings: res.warnings,
    };
  } else {
    const res = await parseHitchhikersGuide(text, metadata);
    return {
      document: res.document as AutomizerDocument,
      errors: res.errors,
      warnings: res.warnings,
    };
  }
}
