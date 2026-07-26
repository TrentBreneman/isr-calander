import { describe, expect, it } from "vitest";
import { parseHitchhikersGuide } from "../automizer/parser";

describe("parseHitchhikersGuide", () => {
  it("falls back to parsing Roman sections and subsections from raw text", async () => {
    const result = await parseHitchhikersGuide(
      `I. Scenario Summary and Decision Context
A. Situation overview
The team is facing a supply challenge.
1. The risk is material.
2. The response needs a clear owner.

II. Why the Goal and Objective Are Correct
A. Reasoning
The goal is appropriate.
1. It aligns with policy.`,
      { title: "Imported Guide", author: "iSolvRisk Inc." },
    );

    const challenge = result.document.challenges?.[0];
    expect(challenge?.sections?.I?.title).toBe(
      "Scenario Summary and Decision Context",
    );
    expect(challenge?.sections?.I?.subsections?.[0]?.content).toContain(
      "The team is facing a supply challenge.",
    );
    expect(challenge?.sections?.I?.subsections?.[0]?.points).toHaveLength(2);
    expect(challenge?.sections?.II?.title).toBe(
      "Why the Goal and Objective Are Correct",
    );
  });
});
