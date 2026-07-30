import { GoogleGenAI } from "@google/genai";

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    return response.text ?? null;
  } catch (error) {
    console.error("[Gemini API Error]:", error);
    return null;
  }
}
