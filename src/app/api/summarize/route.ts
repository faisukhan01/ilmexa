import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

const SYSTEM_PROMPT = `You are Ilmexa AI Summarizer for university students. Your job is to make study material easy to understand quickly. Always use clear, simple language — explain things like a helpful friend, not a textbook. Capture the key ideas accurately without unnecessary complexity.`;

const STYLE_INSTRUCTIONS: Record<string, string> = {
  brief: 'Write a short, clear summary in 2-3 paragraphs. Cover only the most important points. Use simple sentences.',
  detailed: 'Write a thorough summary covering all key points, main arguments, and important details. Use section headers to organize it. Keep the language clear and accessible.',
  'bullet-points': 'Summarize using clear bullet points grouped under short headings. Each bullet should be a single clear idea. Easy to scan and study from.',
  eli5: 'Explain it like the reader has never heard of this topic before. Use everyday language, simple analogies, and relatable examples. No jargon at all. Make it fun and easy.',
};

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { text, style = 'brief' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.trim().length < 20) {
      return NextResponse.json({ error: 'Please provide at least 20 characters of text to summarize.' }, { status: 400 });
    }

    const validStyles = ['brief', 'detailed', 'bullet-points', 'eli5'];
    const selectedStyle = validStyles.includes(style) ? style : 'brief';
    const styleInstruction = STYLE_INSTRUCTIONS[selectedStyle];

    const prompt = `${SYSTEM_PROMPT}\n\nSummarize the following text using the "${selectedStyle}" style:\n\n${styleInstruction}\n\n---\n\n${text}`;
    const summary = await generateText(prompt);

    if (!summary) {
      return NextResponse.json({ error: 'No summary generated' }, { status: 500 });
    }

    const originalWordCount = text.trim().split(/\s+/).length;
    const summaryWordCount = summary.trim().split(/\s+/).length;

    const saved = await db.summary.create({
      data: {
        userId: session.userId,
        originalText: text.trim(),
        summary,
        style: selectedStyle,
        wordCount: summaryWordCount,
      },
    });

    return NextResponse.json({
      summary,
      originalWordCount,
      summaryWordCount,
      reduction: originalWordCount > 0
        ? Math.round(((originalWordCount - summaryWordCount) / originalWordCount) * 100)
        : 0,
      id: saved.id,
    });
  } catch (error) {
    console.error('Summarize API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
