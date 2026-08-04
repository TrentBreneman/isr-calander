import OpenAI from "openai";

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return response.choices[0]?.message?.content ?? null;
  } catch (error) {
    console.error("[OpenAI API Error]:", error);
    return null;
  }
}
