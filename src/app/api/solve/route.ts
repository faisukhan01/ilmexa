import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';

const SYSTEM_PROMPT = `You are Ilmexa AI Solver, a friendly tutor for university students. Solve problems in the clearest, most direct way possible.

Rules:
- Simple problem → solve it directly and concisely. Don't over-explain obvious steps.
- Complex problem → break it into clear steps, explaining each one simply.
- Always match the level of detail to the difficulty of the problem.
- Use plain, student-friendly language. Avoid academic jargon unless necessary.
- End with the final answer highlighted clearly.
- Format in markdown. Use code blocks for code.`;

const TYPE_CONTEXT: Record<string, string> = {
  math: 'Solve step by step. Show the calculation clearly. Use simple notation. Highlight the final answer.',
  code: 'Write clean, readable code. Add short inline comments only where helpful. Briefly explain the approach in plain words before the code.',
  general: 'Give a clear, focused answer. Use simple language and a relevant example. Keep it as brief as the question allows.',
};

export async function POST(req: NextRequest) {
  try {
    const { question, type = 'math' } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (question.trim().length < 3) {
      return NextResponse.json({ error: 'Please provide at least 3 characters.' }, { status: 400 });
    }

    const validTypes = ['math', 'code', 'general'];
    const selectedType = validTypes.includes(type) ? type : 'math';
    const contextNote = TYPE_CONTEXT[selectedType];

    const prompt = `${SYSTEM_PROMPT}\n\n${contextNote}\n\nProblem:\n"${question.trim()}"`;

    const solution = await generateText(prompt);

    if (!solution) {
      return NextResponse.json({ error: 'No solution generated' }, { status: 500 });
    }

    return NextResponse.json({ solution, type: selectedType });
  } catch (error) {
    console.error('Solve API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate solution' },
      { status: 500 }
    );
  }
}
