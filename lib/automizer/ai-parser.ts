// lib/automizer/ai-parser.ts
// Stage 3: AI-assisted classification using Gemini API (fallback for ambiguous sections)
// Only called when NEXT_PUBLIC_GEMINI_API_KEY is set and deterministic parsing leaves ambiguous blocks.

import {
  GauntletChallenge,
  HGChallenge,
  WorkProductType,
  DocumentMetadata,
} from './types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export function isAIAvailable(): boolean {
  return !!API_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gauntlet AI Fallback
// ─────────────────────────────────────────────────────────────────────────────
const GAUNTLET_SYSTEM_PROMPT = `You are a document structure classifier for iSolvRisk Gauntlet challenge documents.
Given a block of unstructured text from a Gauntlet challenge, identify which canonical fields the content belongs to.
Return ONLY valid JSON matching the schema below. Do not add commentary.
Do not invent content. Only classify what is provided.

Schema:
{
  "title": "string or null",
  "scenario": ["paragraph strings"] or null,
  "task": "string or null",
  "goal": "string or null",
  "relevantFactors": ["strings"] or null,
  "possibleOutcomes": ["strings"] or null,
  "targetOutcome": { "name": "string", "explanation": "string" } or null,
  "alternateGoals": ["strings"] or null,
  "alternateFactors": ["strings"] or null,
  "alternateOutcomes": ["strings"] or null,
  "goalHints": ["strings"] or null,
  "factorHints": ["strings"] or null,
  "outcomeHints": ["strings"] or null
}
Return null for any field you cannot determine from the provided text.`;

const HG_SYSTEM_PROMPT = `You are a document structure classifier for iSolvRisk Hitchhiker's Guide documents.
Given a block of unstructured text from a Hitchhiker's Guide challenge, identify which canonical section it belongs to.
The canonical sections are:
I. Scenario Summary and Decision Context
II. Why the Goal and Objective Are Correct
III. Why the Alternate Goals Are Incorrect
IV. Why the Relevant Factors Are Correct
V. Why the Alternate Factors Are Incorrect
VI. Why the Target Outcome Is Correct
VII. Why the Possible Outcomes Are Incorrect
VIII. Why the Alternate Outcome Options Are Incorrect
IX. Facilitator Notes on Strong Reasoning

Return ONLY valid JSON matching this schema:
{
  "sectionNumber": "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | null,
  "content": "the classified text",
  "confidence": "high" | "medium" | "low"
}`;

async function callGemini(systemPrompt: string, userContent: string): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      console.warn('[AI Parser] Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? null;
  } catch (e) {
    console.warn('[AI Parser] Failed to call Gemini:', e);
    return null;
  }
}

/**
 * Use AI to classify ambiguous blocks from a Gauntlet parse.
 * Merges results into the partially-parsed challenge array.
 * If AI is unavailable, returns the challenges unchanged.
 */
export async function aiEnhanceGauntlet(
  challenges: GauntletChallenge[],
  ambiguousBlocks: string[],
  _metadata: DocumentMetadata
): Promise<GauntletChallenge[]> {
  if (!API_KEY || ambiguousBlocks.length === 0) return challenges;

  const prompt = `Classify the following ambiguous text blocks from a Gauntlet challenge document:\n\n${ambiguousBlocks.join('\n\n')}`;

  const raw = await callGemini(GAUNTLET_SYSTEM_PROMPT, prompt);
  if (!raw) return challenges;

  try {
    const parsed = JSON.parse(raw);
    // Merge AI-classified fields into the first challenge that seems to lack them
    // This is a best-effort merge for ambiguous blocks
    const targetChallenge = challenges[challenges.length - 1];
    if (!targetChallenge) return challenges;

    if (parsed.scenario && targetChallenge.scenario.length === 0) {
      targetChallenge.scenario = parsed.scenario;
    }
    if (parsed.task && !targetChallenge.task) {
      targetChallenge.task = parsed.task;
    }
    if (parsed.goal && !targetChallenge.modelComponents.goal) {
      targetChallenge.modelComponents.goal = parsed.goal;
    }
    if (parsed.relevantFactors && targetChallenge.modelComponents.relevantFactors.length === 0) {
      targetChallenge.modelComponents.relevantFactors = parsed.relevantFactors;
    }
    if (parsed.possibleOutcomes && targetChallenge.modelComponents.possibleOutcomes.length === 0) {
      targetChallenge.modelComponents.possibleOutcomes = parsed.possibleOutcomes;
    }
    if (parsed.targetOutcome && !targetChallenge.targetOutcome.name) {
      targetChallenge.targetOutcome = parsed.targetOutcome;
    }
  } catch (e) {
    console.warn('[AI Parser] Failed to parse Gemini response:', e);
  }

  return challenges;
}

/**
 * Use AI to classify ambiguous blocks from a Hitchhiker's Guide parse.
 * Returns classification suggestions the caller can apply.
 */
export async function aiEnhanceHitchhikersGuide(
  challenges: HGChallenge[],
  ambiguousBlocks: string[],
  _metadata: DocumentMetadata
): Promise<HGChallenge[]> {
  if (!API_KEY || ambiguousBlocks.length === 0) return challenges;

  const prompt = `Classify the following ambiguous text blocks from a Hitchhiker's Guide document:\n\n${ambiguousBlocks.join('\n\n')}`;

  const raw = await callGemini(HG_SYSTEM_PROMPT, prompt);
  if (!raw) return challenges;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.sectionNumber && challenges.length > 0 && parsed.confidence !== 'low') {
      const lastChallenge = challenges[challenges.length - 1];
      const sectionNum = parsed.sectionNumber as import('./types').HGSectionNumber;
      if (!lastChallenge.sections[sectionNum]) {
        const { HG_SECTION_TITLES } = await import('./types');
        lastChallenge.sections[sectionNum] = {
          number: sectionNum,
          title: HG_SECTION_TITLES[sectionNum],
          subsections: [
            { label: 'A', content: parsed.content, points: [] },
          ],
        };
      }
    }
  } catch (e) {
    console.warn('[AI Parser] Failed to parse HG Gemini response:', e);
  }

  return challenges;
}

/**
 * Main AI enhancement entry point.
 * Dispatches to the appropriate type-specific enhancer.
 */
export async function aiEnhance(
  workProduct: WorkProductType,
  challenges: GauntletChallenge[] | HGChallenge[],
  ambiguousBlocks: string[],
  metadata: DocumentMetadata
): Promise<GauntletChallenge[] | HGChallenge[]> {
  if (workProduct === 'gauntlet') {
    return aiEnhanceGauntlet(
      challenges as GauntletChallenge[],
      ambiguousBlocks,
      metadata
    );
  } else {
    return aiEnhanceHitchhikersGuide(
      challenges as HGChallenge[],
      ambiguousBlocks,
      metadata
    );
  }
}
