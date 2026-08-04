// lib/automizer/ai-parser.ts
import { DocumentMetadata, AutomizerDocument } from "./types";
import { callOpenAI } from "./ai-client";

export function isAIAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function aiEnhanceGauntlet(
  text: string,
  ambiguousBlocks: string[],
  metadata: DocumentMetadata,
): Promise<AutomizerDocument> {
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
): Promise<AutomizerDocument> {
  const systemPrompt = `You are an expert document structured parser for iSolvRisk Inc.
Parse the following unformatted text into a strict JSON object that conforms to the Hitchhiker's Guide schema with sections I through IX. 
The JSON must follow this exact structural shape:
{
  "documentType": "hitchhikers-guide",
  "metadata": { "title": string, "headerTitle": string, "date": string, "author": string },
  "challenges": [
    {
      "id": string,
      "title": string,
      "sections": {
        "I": { "number": "I", "title": string, "subsections": [ { "label": "A", "content": string, "points": string[] } ] },
        "II": { "number": "II", "title": string, "subsections": [...] },
        "III": { "number": "III", "title": string, "subsections": [...] },
        "IV": { "number": "IV", "title": string, "subsections": [...] },
        "V": { "number": "V", "title": string, "subsections": [...] },
        "VI": { "number": "VI", "title": string, "subsections": [...] },
        "VII": { "number": "VII", "title": string, "subsections": [...] },
        "VIII": { "number": "VIII", "title": string, "subsections": [...] },
        "IX": { "number": "IX", "title": string, "subsections": [...] }
      }
    }
  ]
}
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
