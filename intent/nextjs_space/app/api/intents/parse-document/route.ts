import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getSessionOrApiKey } from '@/lib/api-auth';

// Polyfill browser globals required by pdfjs-dist / pdf-parse in Node environments during Next.js build preloading
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class {};
}

// Use require for pdf-parse to avoid ESM/CJS default export mismatch in Webpack/Next.js
const pdf = require('pdf-parse');

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionOrApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    let extractedText = '';

    if (extension === 'pdf') {
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text || '';
    } else if (extension === 'docx') {
      const docxData = await mammoth.extractRawText({ buffer });
      extractedText = docxData.value || '';
    } else if (['txt', 'md', 'json', 'csv'].includes(extension ?? '')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: `Unsupported file format: .${extension}` }, { status: 400 });
    }

    return NextResponse.json({ text: extractedText, fileName });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    return NextResponse.json({ error: 'Failed to parse document: ' + error.message }, { status: 500 });
  }
}
