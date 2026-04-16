"use client";

import React, { useState, useRef, DragEvent } from "react";
import { X, FileText, Upload, Download, Loader2 } from "lucide-react";
import styles from "./Automizer.module.css";

import { PDFDocument } from "pdf-lib";

interface AutomizerProps {
  onClose: () => void;
}

export default function Automizer({ onClose }: AutomizerProps) {
  const [isHighlight, setIsHighlight] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preventDefaults = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent) => {
    preventDefaults(e);
    setIsHighlight(true);
  };

  const handleDragOver = (e: DragEvent) => {
    preventDefaults(e);
    setIsHighlight(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    preventDefaults(e);
    setIsHighlight(false);
  };

  const handleDrop = (e: DragEvent) => {
    preventDefaults(e);
    setIsHighlight(false);
    const files = e.dataTransfer.files;
    if (files.length) handleFiles(files);
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file && file.type === "application/pdf") {
      processFileLocally(file);
    } else {
      setError("Please upload a valid PDF file.");
    }
  };

  const processFileLocally = async (file: File) => {
    setIsProcessing(true);
    setProgress(20);
    setDownloadUrl(null);
    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(40);
      
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setProgress(60);
      
      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error("The PDF has no pages.");
      }

      // We can apply any "automation" or "formatting" logic here in the future
      // For now, we save it with optimized streams for compatibility
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
      setProgress(90);

      // Explicitly use Uint8Array for Blob compatibility
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setFileName(`formatted-${file.name}`);
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError("Failed to process PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} color="var(--primary)" />
            <h3>ISR Automizer</h3>
          </div>
          <button className={styles.btnClose} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div
            className={`${styles.uploadArea} ${isHighlight ? styles.highlight : ""}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} color={isHighlight ? "var(--primary)" : "var(--gray-400)"} />
            <p>Drag and drop a PDF file here, or click to select</p>
            <input
              type="file"
              ref={fileInputRef}
              className={styles.hiddenInput}
              accept="application/pdf"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <button className={styles.button}>Select File</button>
          </div>

          {(isProcessing || progress > 0) && (
            <div className={styles.progressContainer}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {isProcessing && (
            <div className={styles.statusText}>
              <Loader2 size={16} className="spin" style={{ display: 'inline', marginRight: '0.5rem' }} />
              Processing your PDF...
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {downloadUrl && (
            <div className={styles.actions}>
              <a
                href={downloadUrl}
                download={fileName || "formatted.pdf"}
                className={styles.downloadLink}
              >
                <Download size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Download Formatted PDF
              </a>
              <p className={styles.statusText}>File processed: {fileName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
