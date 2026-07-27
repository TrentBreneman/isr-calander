"use client";

import React, { useState, useRef, DragEvent } from "react";
import {
  X,
  FileText,
  Map,
  ChevronRight,
  ChevronLeft,
  Upload,
  Loader2,
  CheckCircle,
  Download,
  FileDown,
  Sparkles,
  Cpu,
  Info,
} from "lucide-react";
import styles from "./Automizer.module.css";

import type {
  WorkProductType,
  OutputFormat,
  DocumentMetadata,
  AutomizerDocument,
  GauntletDocument,
  HitchhikersGuide,
  ParseError,
} from "@/lib/automizer/types";

import GauntletReview from "./GauntletReview";
import HitchhikersReview from "./HitchhikersReview";
import ValidationPanel from "./ValidationPanel";

async function runParse(
  workProduct: WorkProductType,
  text: string,
  metadata: DocumentMetadata,
) {
  const { parseGauntlet, parseHitchhikersGuide } =
    await import("@/lib/automizer/parser");
  const { isAIAvailable, aiEnhanceGauntlet } =
    await import("@/lib/automizer/ai-parser");
  const { validateDocument } = await import("@/lib/automizer/validator");

  if (workProduct === "gauntlet") {
    const result = parseGauntlet(text, metadata);
    const doc = result.document as GauntletDocument;

    if (isAIAvailable() && result.ambiguousBlocks.length > 0 && doc.sections) {
      for (const section of doc.sections) {
        section.challenges = (await aiEnhanceGauntlet(
          section.challenges as unknown as Parameters<
            typeof aiEnhanceGauntlet
          >[0],
          result.ambiguousBlocks,
          metadata,
        )) as unknown as typeof section.challenges;
      }
    }

    const { errors, warnings } = validateDocument(
      doc as unknown as AutomizerDocument,
    );
    return {
      document: doc as unknown as AutomizerDocument,
      errors: [...result.errors, ...errors],
      warnings: [...result.warnings, ...warnings],
    };
  } else {
    const result = await parseHitchhikersGuide(text, metadata);
    const doc = result.document as HitchhikersGuide;

    const { errors, warnings } = validateDocument(
      doc as unknown as AutomizerDocument,
    );
    return {
      document: doc as unknown as AutomizerDocument,
      errors: [...result.errors, ...errors],
      warnings: [...result.warnings, ...warnings],
    };
  }
}

async function generatePDF(doc: AutomizerDocument): Promise<Uint8Array> {
  const { renderToPDF } = await import("@/lib/automizer/pdf-renderer");
  return renderToPDF(doc);
}

async function generateDOCX(doc: AutomizerDocument): Promise<Blob> {
  const { renderToDOCX } = await import("@/lib/automizer/docx-renderer");
  return renderToDOCX(doc);
}

async function extractText(file: File): Promise<string> {
  const { extractFileText } = await import("@/lib/automizer/docx-extractor");
  return extractFileText(file);
}

function currentMonth(): string {
  const d = new Date();
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function makeDefaultMetadata(
  workProduct: WorkProductType | null,
): DocumentMetadata & {
  outputFormat: OutputFormat;
  companyOrGauntletName?: string;
} {
  return {
    title: "",
    headerTitle:
      workProduct === "hitchhikers-guide"
        ? "iSolvRisk - Hitchhiker's Guide"
        : "iSolvRisk - Gauntlet Challenges",
    date: currentMonth(),
    author: "iSolvRisk Inc.",
    client: "",
    companyOrGauntletName: "",
    outputFormat: "both",
  };
}

const STEPS = [
  "Select Type",
  "Metadata",
  "Source",
  "Analyze",
  "Review",
  "Generate",
] as const;

interface AutomizerProps {
  onClose: () => void;
}

export default function Automizer({ onClose }: AutomizerProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [workProduct, setWorkProduct] = useState<WorkProductType | null>(null);
  const [metadata, setMetadata] = useState<
    DocumentMetadata & {
      outputFormat: OutputFormat;
      companyOrGauntletName?: string;
    }
  >(makeDefaultMetadata(null));
  const [sourceText, setSourceText] = useState("");
  const [sourceTab, setSourceTab] = useState<"paste" | "upload">("paste");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isHighlight, setIsHighlight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [document, setDocument] = useState<AutomizerDocument | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [warnings, setWarnings] = useState<ParseError[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const goNext = () =>
    setStep((s) => Math.min(s + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6);
  const goBack = () =>
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3 | 4 | 5 | 6);

  const selectWorkProduct = (wp: WorkProductType) => {
    setWorkProduct(wp);
    setMetadata(makeDefaultMetadata(wp));
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isAllowed =
      name.endsWith(".docx") ||
      name.endsWith(".pdf") ||
      name.endsWith(".txt") ||
      name.endsWith(".md");

    if (!isAllowed) {
      setAnalyzeError("Please upload a .docx, .pdf, .txt, or .md file.");
      return;
    }

    setUploadedFile(file);
    setAnalyzeError(null);
    setSourceText("");

    try {
      const text = await extractText(file);
      setSourceText(
        text || "No text could be extracted from the selected file.",
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to extract file text.";
      setAnalyzeError(msg);
    }
  };

  const preventDefaults = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAnalyze = async () => {
    if (!workProduct || !sourceText.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeStep(0);

    try {
      setAnalyzeStep(1);
      await new Promise((r) => setTimeout(r, 300));
      setAnalyzeStep(2);
      await new Promise((r) => setTimeout(r, 200));

      const result = await runParse(workProduct, sourceText, metadata);

      setAnalyzeStep(3);
      await new Promise((r) => setTimeout(r, 200));

      setDocument(result.document);
      setErrors(result.errors);
      setWarnings(result.warnings);
      setAnalyzeStep(4);

      await new Promise((r) => setTimeout(r, 400));
      goNext();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "An unexpected error occurred.";
      setAnalyzeError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!document) return;
    setIsGenerating(true);
    setGenerateError(null);
    setPdfUrl(null);
    setDocxUrl(null);

    try {
      const fmt = metadata.outputFormat;

      if (fmt === "pdf" || fmt === "both") {
        const pdfBytes = await generatePDF(document);
        const pdfBuffer = Uint8Array.from(pdfBytes);
        const blob = new Blob([pdfBuffer], {
          type: "application/pdf",
        });
        setPdfUrl(URL.createObjectURL(blob));
      }

      if (fmt === "docx" || fmt === "both") {
        const blob = await generateDOCX(document);
        setDocxUrl(URL.createObjectURL(blob));
      }

      setStep(6);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to generate document.";
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const docTitle = document?.metadata?.title || "Gauntlet Document";
  const safeFilename = docTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  const canProceedStep1 = workProduct !== null;
  const canProceedStep2 =
    (metadata.title ?? "").trim().length > 0 &&
    (metadata.headerTitle ?? "").trim().length > 0;
  const canProceedStep3 = sourceText.trim().length > 20;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.step1}>
            <div className={styles.step1Intro}>
              <h2>What would you like to create?</h2>
              <p>
                Select the type of iSolvRisk document you want to generate from
                your source material.
              </p>
            </div>
            <div className={styles.productCards}>
              <button
                id="product-gauntlet"
                className={`${styles.productCard} ${workProduct === "gauntlet" ? styles.productCardSelected : ""}`}
                onClick={() => selectWorkProduct("gauntlet")}
              >
                <div className={styles.productCardIcon}>
                  <FileText size={20} />
                </div>
                <p className={styles.productCardTitle}>Gauntlet Challenges</p>
                <p className={styles.productCardDesc}>
                  Structured challenge documents with scenario, task, model
                  components, target outcomes, and hints.
                </p>
                <div
                  className={`${styles.productCardCheck} ${workProduct === "gauntlet" ? styles.productCardCheckVisible : ""}`}
                >
                  <CheckCircle size={12} color="#fff" />
                </div>
              </button>

              <button
                id="product-hitchhikers"
                className={`${styles.productCard} ${workProduct === "hitchhikers-guide" ? styles.productCardSelected : ""}`}
                onClick={() => selectWorkProduct("hitchhikers-guide")}
              >
                <div className={styles.productCardIcon}>
                  <Map size={20} />
                </div>
                <p className={styles.productCardTitle}>
                  Hitchhiker&apos;s Guide
                </p>
                <p className={styles.productCardDesc}>
                  Facilitator guides with nine Roman numeral sections explaining
                  goals, factors, outcomes, and strong reasoning.
                </p>
                <div
                  className={`${styles.productCardCheck} ${workProduct === "hitchhikers-guide" ? styles.productCardCheckVisible : ""}`}
                >
                  <CheckCircle size={12} color="#fff" />
                </div>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.metaForm}>
            <div className={styles.metaGrid}>
              <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                <label
                  className={`${styles.fieldLabel} ${styles.fieldRequired}`}
                  htmlFor="meta-title"
                >
                  Document Title
                </label>
                <input
                  id="meta-title"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const prefix =
                      workProduct === "hitchhikers-guide"
                        ? "iSolvRisk - Hitchhiker's Guide"
                        : `iSolvRisk - ${title || "Gauntlet Challenges"}`;
                    setMetadata((m) => ({
                      ...m,
                      title,
                      headerTitle:
                        m.headerTitle ===
                        makeDefaultMetadata(workProduct).headerTitle
                          ? prefix
                          : m.headerTitle,
                    }));
                  }}
                  placeholder="e.g. Temple University Company Gauntlet Challenges"
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                <label
                  className={`${styles.fieldLabel} ${styles.fieldRequired}`}
                  htmlFor="meta-header"
                >
                  Header Title
                </label>
                <input
                  id="meta-header"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.headerTitle}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, headerTitle: e.target.value }))
                  }
                  placeholder="e.g. iSolvRisk - Temple University Company Gauntlet Challenges"
                />
                <span className={styles.fieldHint}>
                  Appears in the running header on every page. Independent from
                  the document title.
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label
                  className={`${styles.fieldLabel} ${styles.fieldRequired}`}
                  htmlFor="meta-date"
                >
                  Date
                </label>
                <input
                  id="meta-date"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.date}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, date: e.target.value }))
                  }
                  placeholder="e.g. July 2026"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label
                  className={`${styles.fieldLabel} ${styles.fieldRequired}`}
                  htmlFor="meta-author"
                >
                  Author
                </label>
                <input
                  id="meta-author"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.author}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, author: e.target.value }))
                  }
                  placeholder="iSolvRisk Inc."
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="meta-client">
                  Client / Institution
                </label>
                <input
                  id="meta-client"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.client}
                  onChange={(e) =>
                    setMetadata((m) => ({ ...m, client: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="meta-company">
                  Company / Gauntlet Name
                </label>
                <input
                  id="meta-company"
                  type="text"
                  className={styles.fieldInput}
                  value={metadata.companyOrGauntletName || ""}
                  onChange={(e) =>
                    setMetadata((m) => ({
                      ...m,
                      companyOrGauntletName: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                <label className={styles.fieldLabel}>Output Format</label>
                <div className={styles.formatOptions}>
                  {(["pdf", "docx", "both"] as OutputFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      id={`format-${fmt}`}
                      className={`${styles.formatOption} ${metadata.outputFormat === fmt ? styles.formatOptionSelected : ""}`}
                      onClick={() =>
                        setMetadata((m) => ({ ...m, outputFormat: fmt }))
                      }
                    >
                      {fmt === "pdf"
                        ? "PDF Only"
                        : fmt === "docx"
                          ? "DOCX Only"
                          : "PDF + DOCX"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div className={styles.sourceInputTabs}>
              <button
                id="source-tab-paste"
                className={`${styles.sourceTab} ${sourceTab === "paste" ? styles.sourceTabActive : ""}`}
                onClick={() => setSourceTab("paste")}
              >
                Paste Text
              </button>
              <button
                id="source-tab-upload"
                className={`${styles.sourceTab} ${sourceTab === "upload" ? styles.sourceTabActive : ""}`}
                onClick={() => setSourceTab("upload")}
              >
                Upload File
              </button>
            </div>

            {sourceTab === "paste" ? (
              <textarea
                id="source-textarea"
                className={styles.sourceTextarea}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={
                  workProduct === "gauntlet"
                    ? `Paste your Gauntlet challenge text here.\n\nThe parser will handle inconsistent headings, markdown formatting, numbered lists, AI-generated output, and missing labels.\n\nExample:\n\nThe Production Network Disruption\n\nScenario:\nBimbo Bakeries has experienced a fire at its largest production facility...`
                    : `Paste your Hitchhiker's Guide text here.\n\nThe parser will handle Roman numerals, alphabetical subsections, numbered points, and common formatting variations.\n\nExample:\n\nI. Scenario Summary and Decision Context\n   A. Paragraph content here...\n      1. Supporting point`
                }
              />
            ) : (
              <div
                id="source-upload-zone"
                className={`${styles.uploadDropZone} ${isHighlight ? styles.uploadDropZoneHighlight : ""}`}
                onDragEnter={(e: DragEvent) => {
                  preventDefaults(e);
                  setIsHighlight(true);
                }}
                onDragOver={(e: DragEvent) => {
                  preventDefaults(e);
                  setIsHighlight(true);
                }}
                onDragLeave={(e: DragEvent) => {
                  preventDefaults(e);
                  setIsHighlight(false);
                }}
                onDrop={(e: DragEvent) => {
                  preventDefaults(e);
                  setIsHighlight(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  size={36}
                  color={isHighlight ? "#0057b8" : "var(--gray-400)"}
                />
                <p className={styles.uploadDropZoneText}>
                  Drag and drop your file here, or click to browse
                </p>
                <p className={styles.uploadDropZoneFormats}>
                  Supported: .docx, .pdf, .txt, .md
                </p>
                {uploadedFile && (
                  <div className={styles.uploadedFileName}>
                    <CheckCircle size={14} />
                    {uploadedFile.name}
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className={styles.hiddenInput}
                  accept=".docx,.pdf,.txt,.md"
                  multiple={false}
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            )}

            {analyzeError && (
              <div className={styles.errorMsg}>{analyzeError}</div>
            )}

            {sourceText.trim().length > 0 && (
              <div className={styles.aiNotice}>
                <Info size={13} />
                <span>
                  {sourceText.trim().split(/\s+/).length.toLocaleString()} words
                  detected from your raw source material. The automizer will
                  turn this into a finished work product you can review and
                  export as PDF or DOCX.
                  {process.env.NEXT_PUBLIC_GEMINI_API_KEY
                    ? " AI-assisted parsing is active for ambiguous sections."
                    : ""}
                </span>
              </div>
            )}
          </div>
        );

      case 4: {
        const analyzeSteps = [
          { label: "Normalize text", icon: "⚙" },
          { label: "Detect headings and sections", icon: "🔍" },
          { label: "Parse document structure", icon: "📐" },
          { label: "Validate schema", icon: "✓" },
        ];

        const totalChallenges =
          document?.documentType === "gauntlet"
            ? (document as unknown as GauntletDocument).sections.reduce(
                (sum, s) => sum + s.challenges.length,
                0,
              )
            : document?.documentType === "hitchhikers-guide"
              ? (document as unknown as HitchhikersGuide).challenges.length
              : 0;

        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
            }}
          >
            <div className={styles.analyzeSteps}>
              {analyzeSteps.map((s, i) => {
                const isDone = analyzeStep > i + 1;
                const isActive = analyzeStep === i + 1;
                return (
                  <div
                    key={i}
                    className={`${styles.analyzeStepItem} ${isDone ? styles.analyzeStepDone : ""} ${isActive ? styles.analyzeStepActive : ""}`}
                  >
                    <div
                      className={`${styles.analyzeStepIcon} ${isDone ? styles.analyzeStepIconDone : ""} ${isActive ? styles.analyzeStepIconActive : ""}`}
                    >
                      {isActive ? (
                        <Loader2 size={12} className={styles.spin} />
                      ) : isDone ? (
                        "✓"
                      ) : (
                        s.icon
                      )}
                    </div>
                    {s.label}
                  </div>
                );
              })}
            </div>

            {analyzeError && (
              <div className={styles.errorMsg}>{analyzeError}</div>
            )}

            {analyzeStep === 4 && document && (
              <div
                className={styles.analyzeResults}
                style={{ width: "100%", maxWidth: "400px" }}
              >
                <div className={styles.analyzeResultsTitle}>Parse Results</div>
                <div className={styles.analyzeResultsStat}>
                  <span>Challenges detected</span>
                  <span
                    className={`${styles.analyzeResultsValue} ${styles.analyzeOkCount}`}
                  >
                    {totalChallenges}
                  </span>
                </div>
                <div className={styles.analyzeResultsStat}>
                  <span>Errors</span>
                  <span
                    className={`${styles.analyzeResultsValue} ${errors.length > 0 ? styles.analyzeErrorCount : styles.analyzeOkCount}`}
                  >
                    {errors.length}
                  </span>
                </div>
                <div className={styles.analyzeResultsStat}>
                  <span>Warnings</span>
                  <span
                    className={`${styles.analyzeResultsValue} ${warnings.length > 0 ? styles.analyzeWarnCount : styles.analyzeOkCount}`}
                  >
                    {warnings.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 5:
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              height: "100%",
            }}
          >
            <div className={styles.reviewLayout}>
              <div className={styles.reviewMain}>
                {document?.documentType === "gauntlet" && (
                  <GauntletReview
                    document={document as unknown as GauntletDocument}
                    onChange={(updated) =>
                      setDocument(updated as unknown as AutomizerDocument)
                    }
                  />
                )}
                {document?.documentType === "hitchhikers-guide" && (
                  <HitchhikersReview
                    document={document as unknown as HitchhikersGuide}
                    onChange={(updated) =>
                      setDocument(updated as unknown as AutomizerDocument)
                    }
                  />
                )}
              </div>
              <div className={styles.reviewSidebar}>
                <ValidationPanel errors={errors} warnings={warnings} />
              </div>
            </div>
            {generateError && (
              <div className={styles.errorMsg} style={{ marginTop: "auto" }}>
                {generateError}
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className={styles.generateSection}>
            <div>
              <p className={styles.generateTitle}>
                {isGenerating
                  ? "Generating your documents…"
                  : "Your documents are ready!"}
              </p>
              <p className={styles.generateSub}>
                {isGenerating
                  ? "Rendering from canonical JSON. This may take a moment."
                  : "Download your formatted iSolvRisk documents below."}
              </p>
            </div>

            {isGenerating && (
              <Loader2 size={40} className={styles.spin} color="#0057b8" />
            )}

            {generateError && (
              <div className={styles.errorMsg}>{generateError}</div>
            )}

            {!isGenerating && (pdfUrl || docxUrl) && (
              <div className={styles.downloadGrid}>
                {pdfUrl && (
                  <div className={styles.downloadCard}>
                    <div
                      className={`${styles.downloadCardIcon} ${styles.downloadCardIconPDF}`}
                    >
                      <FileText size={20} />
                    </div>
                    <p className={styles.downloadCardTitle}>PDF Document</p>
                    <a
                      href={pdfUrl}
                      download={`${safeFilename}.pdf`}
                      className={`${styles.downloadLink} ${styles.downloadLinkPDF}`}
                      id="download-pdf"
                    >
                      <Download size={14} /> Download PDF
                    </a>
                  </div>
                )}
                {docxUrl && (
                  <div className={styles.downloadCard}>
                    <div
                      className={`${styles.downloadCardIcon} ${styles.downloadCardIconDOCX}`}
                    >
                      <FileDown size={20} />
                    </div>
                    <p className={styles.downloadCardTitle}>Word Document</p>
                    <a
                      href={docxUrl}
                      download={`${safeFilename}.docx`}
                      className={styles.downloadLink}
                      id="download-docx"
                    >
                      <Download size={14} /> Download DOCX
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  const renderFooterLeft = () => {
    if (step === 1) return null;
    if (step === 4 && isAnalyzing) return null;
    return (
      <button
        className={styles.btnBack}
        onClick={step === 6 ? () => setStep(5) : goBack}
        id="btn-back"
      >
        <ChevronLeft size={15} /> Back
      </button>
    );
  };

  const renderFooterRight = () => {
    switch (step) {
      case 1:
        return (
          <button
            className={styles.btnNext}
            onClick={goNext}
            disabled={!canProceedStep1}
            id="btn-next-step1"
          >
            Continue <ChevronRight size={15} />
          </button>
        );
      case 2:
        return (
          <button
            className={styles.btnNext}
            onClick={goNext}
            disabled={!canProceedStep2}
            id="btn-next-step2"
          >
            Continue <ChevronRight size={15} />
          </button>
        );
      case 3:
        return (
          <button
            className={styles.btnNext}
            onClick={() => {
              setStep(4);
              setAnalyzeStep(0);
              setTimeout(handleAnalyze, 100);
            }}
            disabled={!canProceedStep3}
            id="btn-analyze"
          >
            <Cpu size={14} /> Analyze Document
          </button>
        );
      case 4:
        if (isAnalyzing) return null;
        if (analyzeError) {
          return (
            <button
              className={styles.btnNext}
              onClick={() => {
                setAnalyzeStep(0);
                setTimeout(handleAnalyze, 100);
              }}
              id="btn-retry-analyze"
            >
              Retry
            </button>
          );
        }
        return null;
      case 5:
        return (
          <button
            className={styles.btnGenerate}
            onClick={handleGenerate}
            disabled={!document || isGenerating}
            id="btn-generate"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className={styles.spin} /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate Documents
              </>
            )}
          </button>
        );
      case 6:
        return null;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerLogo}>
              i<span>Solv</span>
              <span className={styles.headerLogoRisk}>Risk</span>
            </span>
            <span className={styles.headerSep}>|</span>
            <h3 className={styles.headerTitle}>Document Automizer</h3>
          </div>
          <button
            className={styles.btnClose}
            onClick={onClose}
            aria-label="Close Automizer"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.stepBar} role="navigation" aria-label="Steps">
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isDone = step > stepNum;
            const isActive = step === stepNum;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div
                    className={`${styles.stepConnector} ${isDone ? styles.stepConnectorDone : ""}`}
                  />
                )}
                <div className={styles.stepItem}>
                  <div
                    className={`${styles.stepBubble} ${isActive ? styles.stepBubbleActive : ""} ${isDone ? styles.stepBubbleDone : ""}`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isDone ? "✓" : stepNum}
                  </div>
                  <span
                    className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}
                  >
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className={styles.content} id={`automizer-step-${step}`}>
          {renderStep()}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerLeft}>{renderFooterLeft()}</div>
          <div className={styles.footerRight}>{renderFooterRight()}</div>
        </div>
      </div>
    </div>
  );
}
