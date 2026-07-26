// lib/automizer/parser.ts
import {
  AutomizerDocument,
  DocumentMetadata,
  GauntletDocument,
  HitchhikersGuide,
  ParseError,
  HGParseResult,
  GauntletChallengeModel,
} from "./types";
import { aiEnhanceHitchhikersGuide, isAIAvailable } from "./ai-parser";

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

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentTitle = "Untitled Challenge";
  const scenarioLines: string[] = [];
  let taskText = "";
  let goalText = "";
  const factors: string[] = [];
  const outcomes: string[] = [];
  let targetName = "";
  let targetExplanation = "";
  const altGoals: string[] = [];
  const altFactors: string[] = [];
  const altOutcomes: string[] = [];
  const goalHints: string[] = [];
  const factorHints: string[] = [];
  const outcomeHints: string[] = [];

  let currentMode: string | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (
      upper.startsWith("CHALLENGE TITLE:") ||
      upper.startsWith("CHALLENGE:")
    ) {
      currentTitle = line
        .replace(/^(CHALLENGE TITLE:|CHALLENGE:)\s*/i, "")
        .trim();
      currentMode = null;
      continue;
    }
    if (upper.startsWith("SCENARIO:")) {
      currentMode = "scenario";
      continue;
    }
    if (upper.startsWith("TASK:")) {
      currentMode = "task";
      continue;
    }
    if (upper.startsWith("GOAL:")) {
      currentMode = "goal";
      continue;
    }
    if (upper.startsWith("RELEVANT FACTORS:")) {
      currentMode = "factors";
      continue;
    }
    if (upper.startsWith("POSSIBLE OUTCOMES:")) {
      currentMode = "outcomes";
      continue;
    }
    if (upper.startsWith("TARGET OUTCOME:")) {
      currentMode = "target";
      continue;
    }
    if (
      upper.startsWith("EXPLANATION:") ||
      upper.startsWith("TARGET OUTCOME EXPLANATION:")
    ) {
      currentMode = "explanation";
      continue;
    }
    if (upper.startsWith("ALTERNATE GOALS:")) {
      currentMode = "altGoals";
      continue;
    }
    if (upper.startsWith("ALTERNATE FACTORS:")) {
      currentMode = "altFactors";
      continue;
    }
    if (upper.startsWith("ALTERNATE OUTCOMES:")) {
      currentMode = "altOutcomes";
      continue;
    }
    if (upper.startsWith("GOAL HINTS:")) {
      currentMode = "goalHints";
      continue;
    }
    if (upper.startsWith("FACTOR HINTS:")) {
      currentMode = "factorHints";
      continue;
    }
    if (upper.startsWith("OUTCOME HINTS:")) {
      currentMode = "outcomeHints";
      continue;
    }

    if (currentMode === "scenario") scenarioLines.push(line);
    else if (currentMode === "task")
      taskText = taskText ? `${taskText} ${line}` : line;
    else if (currentMode === "goal")
      goalText = goalText ? `${goalText} ${line}` : line;
    else if (currentMode === "factors")
      factors.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "outcomes")
      outcomes.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "target")
      targetName = targetName ? `${targetName} ${line}` : line;
    else if (currentMode === "explanation")
      targetExplanation = targetExplanation
        ? `${targetExplanation} ${line}`
        : line;
    else if (currentMode === "altGoals")
      altGoals.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "altFactors")
      altFactors.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "altOutcomes")
      altOutcomes.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "goalHints")
      goalHints.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "factorHints")
      factorHints.push(line.replace(/^[-*]\s*/, ""));
    else if (currentMode === "outcomeHints")
      outcomeHints.push(line.replace(/^[-*]\s*/, ""));
  }

  if (scenarioLines.length === 0)
    errors.push({
      code: "G002",
      message: `Challenge "${currentTitle}" is missing a Scenario.`,
      field: "scenario",
    });
  if (!taskText)
    errors.push({
      code: "G003",
      message: `Challenge "${currentTitle}" is missing a Task.`,
      field: "task",
    });
  if (!goalText)
    errors.push({
      code: "G004",
      message: `Challenge "${currentTitle}" is missing a Goal/Objective.`,
      field: "goal",
    });
  if (factors.length === 0)
    errors.push({
      code: "G005",
      message: `Challenge "${currentTitle}" has no Relevant Factors.`,
      field: "relevantFactors",
    });
  if (outcomes.length === 0)
    errors.push({
      code: "G006",
      message: `Challenge "${currentTitle}" has no Possible Outcomes.`,
      field: "possibleOutcomes",
    });
  if (!targetName)
    errors.push({
      code: "G007",
      message: `Challenge "${currentTitle}" is missing a Target Outcome.`,
      field: "targetOutcome",
    });
  if (!targetExplanation)
    errors.push({
      code: "G008",
      message: `Challenge "${currentTitle}" is missing a Target Outcome explanation.`,
      field: "explanation",
    });
  if (
    altGoals.length === 0 &&
    altFactors.length === 0 &&
    altOutcomes.length === 0
  ) {
    errors.push({
      code: "G009",
      message: `Challenge "${currentTitle}" has no Alternate Components.`,
      field: "alternateComponents",
    });
  }

  if (outcomes.length === 1) {
    warnings.push({
      code: "G011",
      message: `Challenge "${currentTitle}" has only one Possible Outcome.`,
      field: "possibleOutcomes",
    });
  }

  const challengeModel: GauntletChallengeModel = {
    id: `challenge-${Date.now()}`,
    title: currentTitle,
    challengeType: "standard",
    scenario: scenarioLines.length > 0 ? scenarioLines : [text],
    task: taskText || "Review scenario and determine optimal course of action.",
    modelComponents: {
      goal: goalText || "Ensure enterprise stability.",
      relevantFactors:
        factors.length > 0
          ? factors
          : ["Operational capacity", "Risk mitigation"],
      possibleOutcomes:
        outcomes.length > 0 ? outcomes : ["Proceed with standard workflow."],
    },
    targetOutcome: {
      name: targetName || outcomes[0] || "Proceed with standard workflow.",
      explanation: targetExplanation || "Default optimized response pathway.",
    },
    alternateComponents: {
      goals: altGoals,
      factors: altFactors,
      outcomes: altOutcomes,
    },
    hints: {
      goalHints,
      factorHints,
      outcomeHints,
    },
  };

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
        sectionTitle: "Gauntlet Challenges",
        sectionType: "standard",
        challenges: [challengeModel],
      },
    ],
  };

  return { document, errors, warnings, ambiguousBlocks };
}

function buildFallbackHitchhikersGuide(
  text: string,
  metadata: DocumentMetadata,
): Partial<HitchhikersGuide> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Partial<
    Record<"I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX", any>
  > = {};
  let currentSection: keyof typeof sections | null = null;
  let currentSubsection: {
    label: string;
    content: string;
    points: string[];
  } | null = null;
  let currentContent: string[] = [];

  const flushSubsection = () => {
    if (!currentSection || !currentSubsection) return;
    const section = sections[currentSection] || {
      number: currentSection,
      title: "",
      subsections: [],
    };
    section.subsections.push(currentSubsection);
    sections[currentSection] = section;
    currentSubsection = null;
    currentContent = [];
  };

  for (const line of lines) {
    const sectionMatch = line.match(
      /^(IX|VIII|VII|VI|V|IV|III|II|I)(?:\.|:)?\s*(.*)$/i,
    );
    if (sectionMatch) {
      flushSubsection();
      const sectionNumber =
        sectionMatch[1].toUpperCase() as keyof typeof sections;
      currentSection = sectionNumber;
      const title = sectionMatch[2].trim();
      sections[sectionNumber] = {
        number: sectionNumber,
        title: title || "Section",
        subsections: [],
      };
      continue;
    }

    const subsectionMatch = line.match(/^([A-Z])(?:[.):-]|\.)\s*(.*)$/);
    if (subsectionMatch && currentSection) {
      flushSubsection();
      currentSubsection = {
        label: subsectionMatch[1].toUpperCase(),
        content: subsectionMatch[2].trim(),
        points: [],
      };
      currentContent = [];
      continue;
    }

    if (!currentSection) continue;

    if (line.match(/^\d+[.)]\s+/) && currentSubsection) {
      currentSubsection.points.push(line.replace(/^\d+[.)]\s*/, ""));
      continue;
    }

    if (currentSubsection) {
      const cleanedLine = line.replace(/^[-*]\s*/, "");
      currentSubsection.content = currentSubsection.content
        ? `${currentSubsection.content} ${cleanedLine}`
        : cleanedLine;
    }
  }

  flushSubsection();

  const challenges = [
    {
      id: "hg-challenge-1",
      title: metadata.title || "Imported Hitchhiker's Guide",
      sections: Object.fromEntries(
        Object.entries(sections).map(([key, section]) => [
          key,
          {
            number: key,
            title: section.title || "Section",
            subsections: (section.subsections || []).filter(Boolean),
          },
        ]),
      ),
    },
  ];

  return {
    documentType: "hitchhikers-guide",
    metadata: {
      title: metadata.title || "Hitchhiker’s Guide",
      headerTitle: metadata.headerTitle || "iSolvRisk - Hitchhiker’s Guide",
      date: metadata.date || "July 2026",
      author: metadata.author || "iSolvRisk Inc.",
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

  if (isAIAvailable()) {
    try {
      const aiDoc = (await aiEnhanceHitchhikersGuide(
        text,
        metadata,
      )) as HitchhikersGuide;
      return { document: aiDoc, errors, warnings, ambiguousBlocks };
    } catch {
      warnings.push({
        code: "HG_AI_FALLBACK",
        message:
          "AI parsing failed, falling back to local structure extraction.",
      });
    }
  }

  const document = buildFallbackHitchhikersGuide(text, metadata);

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
