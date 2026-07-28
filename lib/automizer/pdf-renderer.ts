import { saveAs } from 'file-saver';
import type { AutomizerDocument } from './types';

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
      throw new Error(`PDF generation failed: ${await response.text()}`);
    }

    const blob = await response.blob();
    const title = doc.metadata.title || 'document';
    saveAs(blob, `${title}.pdf`);
  } catch (error) {
    console.error('Error rendering PDF:', error);
    // Here you might want to show an error to the user
    alert('An error occurred while generating the PDF.');
  }
}
