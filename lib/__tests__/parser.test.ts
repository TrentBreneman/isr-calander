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

  it("structures plain paragraphs into A/B/C subsections and enforces validator keywords", async () => {
    const result = await parseHitchhikersGuide(
      `I. Scenario Summary and Decision Context
Paragraph one of situation.
Paragraph two of situation.

VI. Why the Target Outcome Is Correct
This is why the outcome is chosen.

VII. Why the Possible Outcomes Are Incorrect
This explains outcomes.

IX. Facilitator Notes on Strong Reasoning
This provides notes.`,
      { title: "Unformatted Guide", author: "iSolvRisk Inc." },
    );

    const challenge = result.document.challenges?.[0];
    // Section I should have Subsection A (Paragraph one) and B (Paragraph two)
    expect(challenge?.sections?.I?.subsections).toHaveLength(2);
    expect(challenge?.sections?.I?.subsections?.[0]?.label).toBe("A");
    expect(challenge?.sections?.I?.subsections?.[1]?.label).toBe("B");

    // Section VI should have injected "Target Outcome" keyword
    const contentVI = challenge?.sections?.VI?.subsections?.[0]?.content?.[0] || "";
    expect(contentVI.toLowerCase()).toContain("target outcome");

    // Section VII should have injected "Possible Outcomes" keyword
    const contentVII = challenge?.sections?.VII?.subsections?.[0]?.content?.[0] || "";
    expect(contentVII.toLowerCase()).toContain("possible outcomes");

    // Section IX should have injected "Facilitator Notes" keyword
    const contentIX = challenge?.sections?.IX?.subsections?.[0]?.content?.[0] || "";
    expect(contentIX.toLowerCase()).toContain("facilitator notes");
  });
});
