// lib/automizer/ai-parser.ts
import { DocumentMetadata, AutomizerDocument } from "./types";
import { callOpenAI } from "./ai-client";

export function isAIAvailable(): boolean {
  if (typeof window !== "undefined") {
    return true; // Routed via local API endpoint on client side
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function aiEnhanceGauntlet(
  text: string,
  ambiguousBlocks: string[],
  metadata: DocumentMetadata,
  isServerCall: boolean = false,
): Promise<AutomizerDocument> {
  if (typeof window !== "undefined" && !isServerCall) {
    const res = await fetch("/api/ai-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enhance-gauntlet",
        text,
        ambiguousBlocks,
        metadata,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Parse API failed: ${errText}`);
    }
    return await res.json();
  }

  const systemPrompt = `You are an expert document structured parser for iSolvRisk Inc.
Parse the following unformatted text into a strict JSON object that conforms to the Gauntlet schema. Return ONLY valid JSON matching the AutomizerDocument type definition.`;
  const userPrompt = `Metadata to apply: Title: ${
    metadata.title || "Gauntlet Challenges"
  }, Author: ${metadata.author || "iSolvRisk Inc."}.
  
  Raw Text to parse:
  ${text}`;
  const rawJson = await callOpenAI(systemPrompt, userPrompt);
  if (!rawJson) {
    throw new Error("Failed to receive response from OpenAI.");
  }

  const cleanedJson = rawJson.replace(/^```json\s*|\s*```$/g, "").trim();
  return JSON.parse(cleanedJson) as AutomizerDocument;
}

export async function aiEnhanceHitchhikersGuide(
  text: string,
  metadata: DocumentMetadata,
  isServerCall: boolean = false,
): Promise<AutomizerDocument> {
  if (typeof window !== "undefined" && !isServerCall) {
    const res = await fetch("/api/ai-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enhance-hitchhikers-guide",
        text,
        metadata,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Parse API failed: ${errText}`);
    }
    return await res.json();
  }

  const systemPrompt = `You are an expert document structured parser for iSolvRisk Inc.
Parse the following unformatted text into a strict JSON object conforming to the Hitchhiker's Guide schema with sections I through IX.

The document structure MUST follow standard MLA outline format:
- Roman Numeral sections (I through IX)
- Capital letter subsections (A, B, C...)
- Numbered points (1, 2, 3...)
- Alphabetical or bulleted sub-points (a, b, c...)

The JSON must follow this exact structural shape:
{
  "documentType": "hitchhikers-guide",
  "metadata": {
    "title": "string",
    "headerTitle": "string",
    "date": "string",
    "author": "string"
  },
  "challenges": [
    {
      "id": "string",
      "title": "string",
      "sections": {
        "I": {
          "number": "I",
          "title": "Scenario Summary and Decision Context",
          "subsections": [
            {
              "label": "string", // Subsection label like "A", "B", "C" (representing A., B., C.)
              "content": ["string"], // Array of paragraphs. MANDATORY: must be an array of strings.
              "points": [
                // Array of points under the subsection (representing 1., 2., 3.). Each point can be:
                // EITHER a plain string:
                "string", 
                // OR an object representing a point with nested sub-points:
                {
                  "text": "string", // Point text
                  "subPoints": ["string"] // Sub-points (representing a., b., c. or deeper list items)
                }
              ]
            }
          ]
        },
        "II": { "number": "II", "title": "Why the Goal and Objective Are Correct", "subsections": [...] },
        "III": { "number": "III", "title": "Why the Alternate Goals Are Incorrect", "subsections": [...] },
        "IV": { "number": "IV", "title": "Why the Relevant Factors Are Correct", "subsections": [...] },
        "V": { "number": "V", "title": "Why the Alternate Factors Are Incorrect", "subsections": [...] },
        "VI": { "number": "VI", "title": "Why the Target Outcome Is Correct", "subsections": [...] },
        "VII": { "number": "VII", "title": "Why the Possible Outcomes Are Incorrect", "subsections": [...] },
        "VIII": { "number": "VIII", "title": "Why the Alternate Outcome Options Are Incorrect", "subsections": [...] },
        "IX": { "number": "IX", "title": "Facilitator Notes on Strong Reasoning", "subsections": [...] }
      }
    }
  ]
}

CRITICAL STRUCTURAL & SEMANTIC REQUIREMENTS TO ENSURE NO WARNINGS:
1. Subsection Formatting (MLA Style):
   - Group the parsed content of each Roman Numeral section into capital lettered subsections (labeled as "A", "B", "C", etc.).
   - The 'content' array of each subsection must contain introductory or description paragraphs.
   - Distinct numbered points within a subsection must be mapped into the 'points' array (using a plain string for a single point, or an object with 'text' and 'subPoints' if there are nested sub-bullets like a., b., c.).
2. Section VI Requirement:
   - At least one subsection in Section VI ('Why the Target Outcome Is Correct') MUST have a paragraph in its 'content' array that contains the exact phrase "target outcome" (case-insensitive) explaining what the target outcome is.
3. Section VII Requirement:
   - At least one subsection in Section VII ('Why the Possible Outcomes Are Incorrect') MUST have a paragraph in its 'content' array that contains the exact phrase "possible outcomes" (case-insensitive) addressing the possible outcomes.
4. Section IX Requirement:
   - At least one subsection in Section IX ('Facilitator Notes on Strong Reasoning') MUST have a paragraph in its 'content' array that contains the exact phrase "facilitator notes" (case-insensitive) providing the facilitator notes.

Ensure all text from the unformatted guide is mapped accurately to appropriate sections I through IX based on context. 

Return ONLY valid JSON. No markdown ticks, no extra text.`;

  const userPrompt = `Metadata to apply: Title: ${
    metadata.title || "Hitchhiker's Guide"
  }, Author: ${metadata.author || "iSolvRisk Inc."}.
  
  Raw Text to parse:
  ${text}`;
  const rawJson = await callOpenAI(systemPrompt, userPrompt);
  if (!rawJson) {
    throw new Error("Failed to receive response from OpenAI.");
  }

  const cleanedJson = rawJson.replace(/^```json\s*|\s*```$/g, "").trim();
  return JSON.parse(cleanedJson) as AutomizerDocument;
}

