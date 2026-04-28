import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    let text = '';

    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = await file.text();

    } else if (fileName.endsWith('.pdf')) {
      const arrayBuf = await file.arrayBuffer();
      // pdf-parse v2 API: PDFParse class with { data } option, then .getText()
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(arrayBuf) });
      const result = await parser.getText();
      text = result.text;

    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (fileName.endsWith('.pptx')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);

      // Collect slide XML files in order
      const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0');
          const nb = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0');
          return na - nb;
        });

      const texts: string[] = [];
      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async('text');
        const clean = xml
          .replace(/<[^>]*>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        if (clean) texts.push(clean);
      }
      text = texts.join('\n\n');

    } else if (fileName.endsWith('.ppt')) {
      return NextResponse.json(
        { error: 'Old .ppt format is not supported. Please open the file in PowerPoint and save it as .pptx, then upload again.' },
        { status: 400 }
      );

    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, Word (.docx), PowerPoint (.pptx), or text file.' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract any text from the file. The file may be image-based or empty.' },
        { status: 400 }
      );
    }

    const trimmed = text.trim().slice(0, 8000);
    return NextResponse.json({ text: trimmed, fileName: file.name });
  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json({ error: 'Failed to extract text from file. Please try a different file.' }, { status: 500 });
  }
}
