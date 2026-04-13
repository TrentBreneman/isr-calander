import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalPdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    const pages = await newPdf.copyPages(
      originalPdf,
      originalPdf.getPageIndices()
    );

    // Initial logic from the old repo: just copy pages
    // The PDFGenerator class was defined but not used in the original index.js
    // We can expand this later if needed.
    pages.forEach((page) => {
      newPdf.addPage(page);
    });

    const pdfBytes = await newPdf.save();

    return new NextResponse(Buffer.from(pdfBytes) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Original-Name': file.name,
        'Content-Disposition': `attachment; filename="formatted-${file.name}"`,
      },
    });
  } catch (error: any) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during PDF processing.' },
      { status: 500 }
    );
  }
}
