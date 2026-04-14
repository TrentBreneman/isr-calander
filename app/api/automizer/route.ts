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
    // Load with ignoreEncryption just in case
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    
    const pageCount = pdfDoc.getPageCount();
    console.log(`PDF has ${pageCount} pages`);
    
    if (pageCount === 0) {
      return NextResponse.json({ error: 'The uploaded PDF has no pages.' }, { status: 400 });
    }

    // For now, let's just try to save the loaded PDF directly to see if it's valid
    // Disabling object streams can sometimes help with compatibility in some viewers.
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

    console.log(`Generated PDF size: ${pdfBytes.length} bytes`);

    // Use a Buffer to ensure it's treated as binary data correctly by NextResponse
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'X-Original-Name': encodeURIComponent(file.name),
        'Content-Disposition': `attachment; filename="formatted-${encodeURIComponent(file.name)}"`,
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
