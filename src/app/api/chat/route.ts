import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, generateVisionResponse, generateDocumentAnalysis } from '@/lib/ai';

const BASE_SYSTEM_PROMPT = `You are Ilmexa AI, an expert and professional AI teaching assistant designed specifically for university students. You have deep knowledge across all academic disciplines. You teach like an experienced professor who genuinely cares about student understanding. Your teaching approach includes:
- Clear, jargon-free explanations
- Real-world examples and practical applications
- Step-by-step breakdowns of complex topics
- Visual descriptions of abstract concepts
- Encouraging tone that builds confidence
- Thought-provoking follow-up questions
You adapt your teaching style to the student's level and make learning engaging and effective. Format responses in markdown.`;

const COURSE_SYSTEM_PROMPT = `You are Ilmexa AI, an expert and professional teacher for university courses. You teach with clarity, depth, and enthusiasm, using examples, analogies, and structured explanations. You break down complex topics into digestible parts. When explaining concepts, you use:
- Clear definitions first
- Real-world examples and analogies
- Step-by-step explanations
- Key takeaways summaries
- Practice questions when appropriate
You encourage critical thinking and ask follow-up questions to ensure understanding. Be thorough but concise. Format responses in markdown.`;

const VISION_SYSTEM_PROMPT = `You are Ilmexa AI Vision, an expert educational image analyzer integrated into the chat. When analyzing attached images:
- If it's a diagram/chart: explain the data, trends, and implications clearly
- If it's a formula/equation: break it down step by step, explain each variable
- If it's a textbook page: summarize the key concepts and explain them clearly
- If it's handwritten notes: transcribe and explain the content
- If it's a screenshot of code: explain what the code does, line by line if needed
- If it's a photo of a whiteboard: extract and explain all content
- If it's a document page: extract text and explain the content thoroughly
Always provide thorough educational explanations suitable for university students. Format with markdown.`;

const DOC_SYSTEM_PROMPT = `You are Ilmexa AI, an expert educational document analyst. The user has uploaded a document whose text has been extracted for you. Your job is to:
- Read and understand the full document content provided
- Answer any specific questions the user asks about it
- If no specific question is asked, provide a comprehensive educational summary: main topics, key concepts, important definitions, formulas, and data
- Explain everything clearly for university students
- Use markdown formatting with headers, bullet points, and code blocks where appropriate
Always base your response on the actual document content provided — never claim you cannot read it.`;

// ── PDF extraction using pdf-parse v2 class API ───────────────────────────────

async function extractPdfText(base64Data: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const buffer = Buffer.from(base64Data, 'base64');
    const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
    const result = await parser.getText();
    return (result?.text as string)?.trim() || null;
  } catch (err) {
    console.warn('PDF text extraction failed:', (err as Error).message);
    return null;
  }
}

// ── DOCX extraction using mammoth ─────────────────────────────────────────────

async function extractDocxText(base64Data: string): Promise<string | null> {
  try {
    const mammoth = await import('mammoth');
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.trim() || null;
  } catch (err) {
    console.warn('DOCX text extraction failed:', (err as Error).message);
    return null;
  }
}

// ── PPTX extraction using JSZip (PPTX is a ZIP containing slide XML files) ───

async function extractPptxText(base64Data: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JSZip = require('jszip');
    const buffer = Buffer.from(base64Data, 'base64');
    const zip = await JSZip.loadAsync(buffer);

    // Collect slide file names sorted in order
    const slideNames: string[] = Object.keys(zip.files)
      .filter((name: string) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    if (slideNames.length === 0) return null;

    const slideTexts: string[] = [];
    for (const slideName of slideNames) {
      const xml: string = await zip.files[slideName].async('string');
      // Extract text from <a:t> elements (DrawingML text runs)
      const matches = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
      const text = matches.map(m => m[1]).join(' ').trim();
      if (text) slideTexts.push(text);
    }

    return slideTexts.length > 0 ? slideTexts.join('\n\n') : null;
  } catch (err) {
    console.warn('PPTX text extraction failed:', (err as Error).message);
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, courseId, images, documents, webSearch } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const systemPrompt = courseId ? COURSE_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;

    // Vision mode — images attached
    if (images && images.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const prompt = lastMsg.content || 'Please analyze the attached image(s) and explain them in an educational context.';
      const response = await generateVisionResponse(prompt, images, VISION_SYSTEM_PROMPT);
      return NextResponse.json({ response, mode: 'vision' });
    }

    // Document mode — extract text then send to AI
    if (documents && documents.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const userPrompt = lastMsg.content || 'Please analyze the attached document(s) and explain the key concepts.';

      const extractedParts: string[] = [];
      const scannedPdfs: Array<{ data: string; mimeType: string; name: string }> = [];

      for (const doc of documents as Array<{ data: string; mimeType: string; name: string }>) {
        const name = doc.name.toLowerCase();
        const mime = doc.mimeType.toLowerCase();

        if (mime.includes('pdf') || name.endsWith('.pdf')) {
          const text = await extractPdfText(doc.data);
          if (text && text.length > 20) {
            extractedParts.push(`=== ${doc.name} ===\n${text}\n=== End of ${doc.name} ===`);
          } else {
            // Scanned/image-based PDF — try Gemini Vision as last resort
            scannedPdfs.push(doc);
          }

        } else if (
          mime.includes('wordprocessingml') || mime.includes('msword') ||
          name.endsWith('.docx') || name.endsWith('.doc')
        ) {
          const text = await extractDocxText(doc.data);
          if (text) {
            extractedParts.push(`=== ${doc.name} ===\n${text}\n=== End of ${doc.name} ===`);
          } else {
            extractedParts.push(`=== ${doc.name} ===\n[Could not extract text — file may be corrupted or password-protected.]\n=== End of ${doc.name} ===`);
          }

        } else if (
          mime.includes('presentationml') || mime.includes('powerpoint') ||
          name.endsWith('.pptx') || name.endsWith('.ppt')
        ) {
          const text = await extractPptxText(doc.data);
          if (text) {
            extractedParts.push(`=== ${doc.name} ===\n${text}\n=== End of ${doc.name} ===`);
          } else {
            extractedParts.push(`=== ${doc.name} ===\n[Could not extract text from this presentation.]\n=== End of ${doc.name} ===`);
          }

        } else {
          extractedParts.push(`=== ${doc.name} ===\n[Unsupported format. Supported: PDF, DOCX/DOC, PPTX/PPT]\n=== End of ${doc.name} ===`);
        }
      }

      // Send extracted text to AI
      if (extractedParts.length > 0) {
        const fullPrompt = `${userPrompt}\n\nDOCUMENT CONTENT:\n\n${extractedParts.join('\n\n')}`;
        const response = await generateChatResponse(
          [{ role: 'user', content: fullPrompt }],
          DOC_SYSTEM_PROMPT
        );
        return NextResponse.json({ response, mode: 'document' });
      }

      // Only scanned PDFs with no text layer — try Gemini Vision
      if (scannedPdfs.length > 0) {
        const response = await generateDocumentAnalysis(userPrompt, scannedPdfs, VISION_SYSTEM_PROMPT);
        return NextResponse.json({ response, mode: 'document' });
      }

      return NextResponse.json(
        { error: 'Could not extract content from the uploaded document(s).' },
        { status: 422 }
      );
    }

    // Web search mode
    if (webSearch) {
      const searchAwarePrompt = `${systemPrompt}\n\nThe user has enabled web search mode. Use your most up-to-date knowledge to answer accurately. If the topic may have changed recently, mention that the user should verify with current sources.`;
      try {
        const response = await generateChatResponse(messages.slice(-20), searchAwarePrompt);
        return NextResponse.json({ response, mode: 'websearch' });
      } catch (err) {
        console.error('Web search mode failed, falling back:', err);
      }
    }

    // Regular chat
    const response = await generateChatResponse(messages.slice(-20), systemPrompt);
    return NextResponse.json({ response, mode: 'chat' });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
