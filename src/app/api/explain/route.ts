import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';

const SYSTEM_PROMPT = `You are Ilmexa AI, a friendly explainer for university students. Your job is to make formulas, concepts, and proofs easy to understand — not overwhelming.

Rules:
- Use the simplest language possible. Explain like you're helping a friend, not writing a textbook.
- Simple formula or concept → explain it in plain words first, then show the formula, then one worked example. Keep it concise.
- Complex topic → add more steps and examples, but still keep each step easy to follow.
- Never dump information. Focus on what the student actually needs to understand it.
- Use markdown formatting to organize your response clearly.`;

const TYPE_CONTEXT: Record<string, string> = {
  formula: 'Explain what it means in plain words first. Then break down each variable simply. Show one clear worked example with numbers.',
  concept: 'Explain the core idea simply using a relatable everyday analogy. Then clarify the technical meaning. Keep it short and clear.',
  proof: 'Walk through each step clearly in plain language. State what you are proving and why each step follows logically. Avoid unnecessary formality.',
  example: 'Show a worked example step by step. Explain what you are doing at each step and why. Use simple numbers.',
};

export async function POST(req: NextRequest) {
  try {
    const { topic, type } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const typeLabel = type && TYPE_CONTEXT[type] ? type : 'formula';
    const contextNote = TYPE_CONTEXT[typeLabel];

    const prompt = `${SYSTEM_PROMPT}\n\nPlease explain the following as a ${typeLabel}:\n\n"${topic}"\n\n${contextNote}`;

    const response = await generateText(prompt);

    if (!response) {
      return NextResponse.json({ error: 'No response generated' }, { status: 500 });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Explain API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
