import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

import { extractFileText } from "../automizer/docx-extractor";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const mockedGetDocument = vi.mocked(getDocument);

describe("extractFileText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text from PDF files", async () => {
    mockedGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: "Raw" }, { str: "source" }, { str: "content" }],
          }),
        }),
      }),
    } as never);

    const file = new File(["%PDF-1.4"], "source.pdf", {
      type: "application/pdf",
    });

    await expect(extractFileText(file)).resolves.toBe("Raw source content");
  });
});
