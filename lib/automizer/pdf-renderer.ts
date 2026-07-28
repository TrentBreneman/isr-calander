import { saveAs } from 'file-saver';
import type { AutomizerDocument } from './types';

// Helper function to convert base64 to blob
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

export async function renderToPDF(doc: AutomizerDocument): Promise<void> {
  try {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doc),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'PDF generation failed: Invalid JSON response' }));
      throw new Error(`PDF generation failed: ${errorData.error || await response.text()}`);
    }

    const { pdfBase64 } = await response.json();
    if (!pdfBase64) {
      throw new Error('PDF generation failed: No PDF data received from server.');
    }
    const blob = base64ToBlob(pdfBase64, 'application/pdf');
    
    const title = doc.metadata.title || 'document';
    saveAs(blob, `${title}.pdf`);
  } catch (error) {
    console.error('Error rendering PDF:', error);
    // Here you might want to show an error to the user
    alert('An error occurred while generating the PDF.');
  }
}
