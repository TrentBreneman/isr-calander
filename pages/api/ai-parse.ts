import type { NextApiRequest, NextApiResponse } from "next";
import { aiEnhanceHitchhikersGuide, aiEnhanceGauntlet } from "@/lib/automizer/ai-parser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { action, text, ambiguousBlocks, metadata } = req.body;

  try {
    if (action === "enhance-hitchhikers-guide") {
      const result = await aiEnhanceHitchhikersGuide(text, metadata, true);
      return res.status(200).json(result);
    } else if (action === "enhance-gauntlet") {
      const result = await aiEnhanceGauntlet(text, ambiguousBlocks, metadata, true);
      return res.status(200).json(result);
    } else {
      return res.status(400).send("Invalid action");
    }
  } catch (error: any) {
    console.error("AI Parse API Error:", error);
    return res.status(500).send(error?.message || "Internal Server Error");
  }
}
