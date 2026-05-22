import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, PDFImage } from 'pdf-lib';

export class PDFGenerator {
  private doc: PDFDocument;
  private page: PDFPage | null = null;
  private y: number = 0;
  private font: PDFFont | null = null;
  private boldFont: PDFFont | null = null;
  private logo: PDFImage | null = null;

  constructor(doc: PDFDocument) {
    this.doc = doc;
  }

  async init() {
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  addPage() {
    this.page = this.doc.addPage();
    this.y = this.page.getHeight() - 50;
  }

  checkPageBreak() {
    if (this.y < 50) {
      this.drawPageFooter();
      this.addPage();
      return true;
    }
    return false;
  }

  drawPageFooter() {
    if (!this.page || !this.font) return;
    const pageCount = this.doc.getPageCount();
    this.page.drawText(`Page ${pageCount}`, {
      x: this.page.getWidth() / 2 - 20,
      y: 30,
      font: this.font,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  finalize() {
    this.drawPageFooter();
  }

  async drawHeader(headerText: string, logoPngBuffer: Buffer) {
    if (!this.page || !this.font) return;
    
    if (!this.logo) {
      this.logo = await this.doc.embedPng(logoPngBuffer);
    }

    this.page.drawText(headerText, {
      x: 50,
      y: this.y,
      font: this.font,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    this.page.drawImage(this.logo, {
      x: this.page.getWidth() - 100,
      y: this.y - 10,
      width: 50,
    });

    this.y -= 30;
  }

  drawText(text: string, options: { font: PDFFont, size: number, x: number, lineHeight?: number }) {
    if (!this.page) return;
    const { font, size, x, lineHeight = 1.2 } = options;
    const maxWidth = this.page.getWidth() - x - 50;
    const lines = this.getWrappedText(text, font, size, maxWidth);

    for (const line of lines) {
      this.checkPageBreak();
      this.page.drawText(line, { ...options, y: this.y });
      this.y -= size * lineHeight;
    }
  }

  private getWrappedText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);

      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
