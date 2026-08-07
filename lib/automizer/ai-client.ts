import OpenAI from "openai";
import { API_KEY } from "./config";

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const apiKey = API_KEY;
  if (!apiKey) {
    console.error("OpenAI API key not found. Make sure OPENAI_API_KEY environment variable is set.");
    return null;
  }
  console.log("OpenAI API key found, proceeding with API call.");

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

    console.log("Successfully received response from OpenAI API.");
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}
