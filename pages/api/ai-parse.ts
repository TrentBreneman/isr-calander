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

  console.log("Received request for AI parsing. Action:", req.body.action);
  const { action, text, ambiguousBlocks, metadata } = req.body;

  try {
    if (action === "enhance-hitchhikers-guide") {
      console.log("Routing to aiEnhanceHitchhikersGuide");
      const result = await aiEnhanceHitchhikersGuide(text, metadata, true);
      return res.status(200).json(result);
    } else if (action === "enhance-gauntlet") {
      console.log("Routing to aiEnhanceGauntlet");
      const result = await aiEnhanceGauntlet(text, ambiguousBlocks, metadata, true);
      return res.status(200).json(result);
    } else {
      console.error("Invalid action received:", action);
      return res.status(400).send("Invalid action");
    }
  } catch (error: any) {
    console.error(`Error in /api/ai-parse for action '${action}':`, error);
    return res.status(500).send(error?.message || "Internal Server Error");
  }
}
