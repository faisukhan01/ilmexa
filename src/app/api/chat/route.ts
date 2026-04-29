import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, generateVisionResponse, generateDocumentAnalysis } from '@/lib/ai';

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are Ilmexa AI, a friendly AI teacher for university students. Your goal is to make studying easier and understanding faster.

**Response length rule — always follow this:**
- Greeting or simple message (hi, thanks, ok, etc.) → reply with 1-2 friendly sentences only. No lists, no headers.
- Quick factual question → 2-4 sentences with the answer and one simple example.
- Concept or topic explanation → clear, structured explanation. Use simple language first, then build up.
- Complex multi-step problem → step-by-step breakdown with a worked example.
- Never write more than the question actually needs.

**Always:**
- Use simple everyday language. Avoid jargon unless the student uses it first.
- Explain with relatable analogies and real-world examples.
- Be encouraging and warm — students should feel comfortable asking anything.
- Use markdown only when it genuinely helps (code, steps, comparisons). Not for simple replies.`;

const COURSE_SYSTEM_PROMPT = `You are Ilmexa AI, a friendly course teacher. Help students understand their course material clearly and simply.

**Response length rule — always follow this:**
- Greeting or simple message → 1-2 sentences only.
- Quick question → brief, direct answer with a simple example.
- Concept explanation → clear breakdown using plain language and analogies.
- Detailed topic → organized explanation with sections only if the topic genuinely needs it.
- Never pad responses with unnecessary text.

**Always:**
- Start with the simplest explanation, then add detail if needed.
- Use real-world examples students can relate to.
- Keep language friendly and encouraging.
- Use markdown formatting only when it helps clarity.`;

const VISION_SYSTEM_PROMPT = `You are Ilmexa AI, a friendly educational image analyzer for university students. When analyzing an image:
- Describe what you see simply and directly
- Explain the key information clearly — use plain language, not textbook language
- For formulas/equations: explain each part simply with a quick example
- For diagrams/charts: explain what the data means in plain words
- For code screenshots: explain what it does simply
- For text/notes: summarize the key points clearly
Match your response length to what's in the image. Simple image = short explanation. Complex image = clear structured breakdown. Format with markdown only when it helps.`;

const DOC_SYSTEM_PROMPT = `You are Ilmexa AI, a friendly document analyzer for university students. You have been given the extracted text of a document.
- If the user asks a specific question: answer it directly and clearly using the document content.
- If no question: give a clear, organized summary of the main topics and key points.
- Use simple, student-friendly language. Avoid unnecessary complexity.
- Use markdown formatting (headers, bullets) to make it easy to read and study from.
Always base your response on the actual document content provided.`;

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
