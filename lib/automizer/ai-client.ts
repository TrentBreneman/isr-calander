import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Don't throw, just return null if AI is not configured.
    // The caller can decide how to handle this.
    return null;
  }

  const ai = new GoogleGenerativeAI(apiKey);

  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  return text || null;
}
