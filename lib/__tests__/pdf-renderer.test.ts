import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderToPDF } from "../automizer/pdf-renderer";
import type { HitchhikersGuide } from "../automizer/types";

describe("renderToPDF", () => {
  it("renders Hitchhiker section content into the generated PDF", async () => {
    const doc: HitchhikersGuide = {
      documentType: "hitchhikers-guide",
      metadata: {
        title: "Imported Guide",
        headerTitle: "iSolvRisk - Hitchhiker’s Guide",
        date: "July 2026",
        author: "iSolvRisk Inc.",
      },
      challenges: [
        {
          id: "hg-1",
          title: "Imported Hitchhiker’s Guide",
          sections: {
            I: {
              number: "I",
              title: "Scenario Summary",
              subsections: [
                {
                  label: "A",
                  content: "Situation overview",
                  points: ["The risk is material."],
                },
              ],
            },
            II: {
              number: "II",
              title: "Why the Goal and Objective Are Correct",
              subsections: [
                {
                  label: "A",
                  content: "Reasoning",
                  points: ["It aligns with policy."],
                },
              ],
            },
          },
        },
      ],
    };

    const bytes = await renderToPDF(doc);
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += content.items.map((item: { str: string }) => item.str).join(" ");
      text += "\n";
    }

    expect(text).toContain("Scenario Summary");
    expect(text).toContain("Situation overview");
    expect(text).toContain("The risk is material.");
  });
});
