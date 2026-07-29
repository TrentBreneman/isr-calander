"use client";

import React, { useState, useRef } from "react";
import { X, Camera, FileSpreadsheet } from "lucide-react";
import styles from "./BusinessCardScanner.module.css";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";

interface BusinessCardData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface BusinessCardScannerProps {
  onClose: () => void;
}

export default function BusinessCardScanner({ onClose }: BusinessCardScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<BusinessCardData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImage(result);
        processImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageSrc: string) => {
    setIsProcessing(true);
    try {
      console.log("Starting OCR with Tesseract...");
      const { data: { text } } = await Tesseract.recognize(imageSrc, 'eng', {
        logger: m => console.log("Tesseract Progress:", m)
      });

      console.log("OCR Text Extracted:", text);
      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from this image.");
      }
      const extracted = extractData(text);
      setData(extracted);
    } catch (error: any) {
      console.error("OCR Error:", error);
      alert(`Failed to process image: ${error.message || "Unknown error"}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractData = (text: string): BusinessCardData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    
    let email = "";
    let phone = "";
    let name = "";
    const addressLines: string[] = [];

    lines.forEach((line, index) => {
      // Find Email
      if (!email && emailRegex.test(line)) {
        const match = line.match(emailRegex);
        if (match) email = match[0];
        return;
      }

      // Find Phone
      if (!phone && phoneRegex.test(line)) {
        const match = line.match(phoneRegex);
        if (match) phone = match[0];
        return;
      }

      // Potential Address hints
      const addressHints = ["St", "Ave", "Road", "Rd", "Suite", "Ste", "Floor", "Fl", "Apt", "PO Box", "Drive", "Dr", "Way", "Blvd", "Lane", "Ln"];
      const hasAddressHint = addressHints.some(hint => new RegExp(`\\b${hint}\\b`, 'i').test(line)) || /\d{5}/.test(line);
      
      if (hasAddressHint) {
        addressLines.push(line);
        return;
      }

      // If it's near the top and hasn't been picked, might be a name
      if (!name && index < 4 && /^[A-Z][a-z]+(\s[A-Z][a-z]+)+/.test(line)) {
        name = line;
      }
    });

    // Simple heuristic: if name is still empty, take the first line that isn't empty or a website
    if (!name && lines.length > 0) {
      for (const line of lines) {
        if (!line.includes("www.") && !line.includes("http") && !emailRegex.test(line) && !phoneRegex.test(line)) {
          name = line;
          break;
        }
      }
    }

    return {
      name,
      email,
      phone,
      address: addressLines.join(", "),
    };
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet([data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Business Card");
    XLSX.writeFile(wb, `${data.name || 'contact'}_business_card.xlsx`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Business Card Scanner</h3>
          <button className={styles.btnClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {!image && !isProcessing && (
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
              <Camera size={48} color="var(--primary)" />
              <p>Click to take a photo or upload an image</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className={styles.hiddenInput} 
                accept="image/*" 
                capture="environment"
                onChange={handleImageUpload}
              />
            </div>
          )}

          {isProcessing && (
            <div className={styles.processing}>
              <div className={styles.spinner}></div>
              <p>Analyzing business card...</p>
            </div>
          )}

          {image && !isProcessing && (
            <>
              <div className={styles.preview}>
                <img src={image} alt="Business Card Preview" />
              </div>

              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={data.name} 
                    onChange={e => setData({...data, name: e.target.value})}
                    placeholder="Extracted Name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={data.email} 
                    onChange={e => setData({...data, email: e.target.value})}
                    placeholder="Extracted Email"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    value={data.phone} 
                    onChange={e => setData({...data, phone: e.target.value})}
                    placeholder="Extracted Phone"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Address</label>
                  <textarea 
                    value={data.address} 
                    onChange={e => setData({...data, address: e.target.value})}
                    placeholder="Extracted Address"
                  />
                </div>

                <div className={styles.actions}>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={() => {
                      setImage(null);
                      setData({ name: "", email: "", phone: "", address: "" });
                    }}
                  >
                    Retake
                  </button>
                  <button className={styles.btnPrimary} onClick={handleExport}>
                    <FileSpreadsheet size={18} />
                    Export to Excel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
