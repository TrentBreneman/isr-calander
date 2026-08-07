// lib/automizer/ai-parser.ts
import { DocumentMetadata, AutomizerDocument } from "./types";
import { callOpenAI } from "./ai-client";
import {
  GAUNTLET_SYSTEM_PROMPT,
  HITCHHIKERS_GUIDE_SYSTEM_PROMPT,
} from "./prompts";

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

  const systemPrompt = GAUNTLET_SYSTEM_PROMPT;
  const userPrompt = `Metadata to apply: Title: ${
    metadata.title || "Gauntlet Challenges"
  }, Author: ${metadata.author || "iSolvRisk Inc."}.
  
  Raw Text to parse:
  ${text}`;
  const rawJson = await callOpenAI(systemPrompt, userPrompt);
  if (!rawJson) {
    console.error("Failed to receive response from OpenAI in ai-parser.");
    throw new Error("Failed to receive response from OpenAI.");
  }
  console.log("Raw JSON response from AI:", rawJson);

  try {
    const cleanedJson = rawJson.replace(/^```json\s*|\s*```$/g, "").trim();
    return JSON.parse(cleanedJson) as AutomizerDocument;
  } catch (error) {
    console.error("Error parsing JSON response from AI:", error);
    throw error;
  }
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

  const systemPrompt = HITCHHIKERS_GUIDE_SYSTEM_PROMPT;
  const userPrompt = `Metadata to apply: Title: ${
    metadata.title || "Hitchhiker's Guide"
  }, Author: ${metadata.author || "iSolvRisk Inc."}.
  
  Raw Text to parse:
  ${text}`;
  const rawJson = await callOpenAI(systemPrompt, userPrompt);
  if (!rawJson) {
    console.error("Failed to receive response from OpenAI in ai-parser.");
    throw new Error("Failed to receive response from OpenAI.");
  }
  console.log("Raw JSON response from AI:", rawJson);

  try {
    const cleanedJson = rawJson.replace(/^```json\s*|\s*```$/g, "").trim();
    return JSON.parse(cleanedJson) as AutomizerDocument;
  } catch (error) {
    console.error("Error parsing JSON response from AI:", error);
    throw error;
  }
}

