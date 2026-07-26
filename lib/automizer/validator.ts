import { AutomizerDocument, ParseError } from "./types";

export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

export function validateDocument(
  document: AutomizerDocument,
): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];

  if (!document) {
    errors.push({ code: "VAL001", message: "Document is empty or undefined." });
    return { isValid: false, errors, warnings };
  }

  if (document.documentType === "gauntlet") {
    if (!document.sections || document.sections.length === 0) {
      errors.push({
        code: "G015",
        message: "Gauntlet document contains no sections.",
      });
    } else {
      document.sections.forEach((section, sIdx) => {
        if (!section.challenges || section.challenges.length === 0) {
          warnings.push({
            code: "G015",
            message: `Section "${section.sectionTitle || sIdx}" contains no challenges.`,
          });
        } else {
          section.challenges.forEach((challenge) => {
            if (!challenge.title)
              errors.push({
                code: "G001",
                message: "Challenge is missing a title.",
              });
            if (!challenge.scenario || challenge.scenario.length === 0) {
              errors.push({
                code: "G002",
                message: `Challenge "${challenge.title || "Untitled"}" is missing a Scenario.`,
                field: "scenario",
              });
            }
            if (!challenge.task) {
              errors.push({
                code: "G003",
                message: `Challenge "${challenge.title || "Untitled"}" is missing a Task.`,
                field: "task",
              });
            }
            if (!challenge.modelComponents?.goal) {
              errors.push({
                code: "G004",
                message: `Challenge "${challenge.title || "Untitled"}" is missing a Goal/Objective.`,
                field: "goal",
              });
            }
            if (
              !challenge.modelComponents?.relevantFactors ||
              challenge.modelComponents.relevantFactors.length === 0
            ) {
              errors.push({
                code: "G005",
                message: `Challenge "${challenge.title || "Untitled"}" has no Relevant Factors.`,
                field: "relevantFactors",
              });
            }
            if (
              !challenge.modelComponents?.possibleOutcomes ||
              challenge.modelComponents.possibleOutcomes.length === 0
            ) {
              errors.push({
                code: "G006",
                message: `Challenge "${challenge.title || "Untitled"}" has no Possible Outcomes.`,
                field: "possibleOutcomes",
              });
            } else if (
              challenge.modelComponents.possibleOutcomes.length === 1
            ) {
              warnings.push({
                code: "G011",
                message: `Challenge "${challenge.title || "Untitled"}" has only one Possible Outcome.`,
                field: "possibleOutcomes",
              });
            }
            if (!challenge.targetOutcome?.name) {
              errors.push({
                code: "G007",
                message: `Challenge "${challenge.title || "Untitled"}" is missing a Target Outcome.`,
                field: "targetOutcome",
              });
            }
            if (!challenge.targetOutcome?.explanation) {
              errors.push({
                code: "G008",
                message: `Challenge "${challenge.title || "Untitled"}" is missing a Target Outcome explanation.`,
                field: "explanation",
              });
            }
            if (!challenge.alternateComponents) {
              errors.push({
                code: "G009",
                message: `Challenge "${challenge.title || "Untitled"}" has no Alternate Components.`,
                field: "alternateComponents",
              });
            }
          });
        }
      });
    }
  } else if (document.documentType === "hitchhikers-guide") {
    if (!document.challenges || document.challenges.length === 0) {
      errors.push({
        code: "HG002",
        message: "Hitchhiker's Guide contains no challenges.",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
