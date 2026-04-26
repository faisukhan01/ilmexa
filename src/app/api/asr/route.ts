import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6,
    process.env.GROQ_API_KEY_7,
    process.env.GROQ_API_KEY_8,
    process.env.GROQ_API_KEY_9,
    process.env.GROQ_API_KEY_10,
    process.env.GROQ_API_KEY_11,
    process.env.GROQ_API_KEY_12,
  ].filter((k): k is string => !!k && !k.startsWith('your_'));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    const keys = getGroqKeys();
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No Groq API keys configured' }, { status: 503 });
    }

    for (const key of keys) {
      try {
        const groq = new Groq({ apiKey: key });
        const transcription = await groq.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-large-v3-turbo',
          language: 'en',
          response_format: 'json',
        });
        const text = transcription.text?.trim();
        if (text) {
          return NextResponse.json({ text });
        }
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 429) continue; // rate limited, try next key
        console.warn('Groq Whisper error:', err);
        continue;
      }
    }

    return NextResponse.json({ error: 'Transcription failed — please try again' }, { status: 503 });
  } catch (error) {
    console.error('ASR API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}
