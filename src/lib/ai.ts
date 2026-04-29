/**
 * Central AI client for Ilmexa AI
 *
 * Automatic fallback chain (user never sees the switch):
 *   Groq Key 1-12 → Gemini Key 1-10 → GLM-4-Flash
 *
 * Free limits per provider:
 *   Groq       — 14,400 req/day, 30 req/min  (×12 keys = 172,800 req/day)
 *   Gemini     — 1,500 req/day,  15 req/min  (×10 keys = 15,000 req/day)
 *   GLM-4-Flash— 1M tokens/day  (totally free) → open.bigmodel.cn
 */

import Groq from 'groq-sdk';

// ── Groq vision model — update here if Groq deprecates again ─────────────────
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  const status = (err as { status?: number })?.status;
  return status === 429 || msg.includes('rate limit') || msg.includes('quota') || msg.includes('limit exceeded');
}

function isNonRetryableError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  const status = (err as { status?: number })?.status;
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    msg.includes('decommissioned') ||
    msg.includes('model_not_found') ||
    msg.includes('does not exist') ||
    msg.includes('invalid api key')
  );
}

// ── Rate-limit cooldown tracker (survives across invocations in same container) ──
const groqCooldowns = new Map<string, number>();
const geminiCooldowns = new Map<string, number>();
const COOLDOWN_MS = 62_000;

function isCoolingDown(map: Map<string, number>, key: string): boolean {
  const until = map.get(key);
  if (!until) return false;
  if (Date.now() >= until) { map.delete(key); return false; }
  return true;
}

function setCooldown(map: Map<string, number>, key: string): void {
  map.set(key, Date.now() + COOLDOWN_MS);
}

// ── Key pools ─────────────────────────────────────────────────────────────────

function getGroqEntries(): Array<{ key: string; client: Groq }> {
  const keys = [
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
  return keys.map((k) => ({ key: k, client: new Groq({ apiKey: k }) }));
}

function getGroqClients(): Groq[] {
  return getGroqEntries().map((e) => e.client);
}

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
  ].filter((k): k is string => !!k && !k.startsWith('your_'));
}

// ── Gemini chat — rotates through all 10 keys ────────────────────────────────

async function geminiChat(
  messages: Array<{ role: string; content: string }>,
  systemInstruction: string
): Promise<string | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  for (const key of keys) {
    if (isCoolingDown(geminiCooldowns, key)) continue;
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction });

      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const lastMsg = messages[messages.length - 1];
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMsg.content);
      return result.response.text();
    } catch (err) {
      if (isRateLimitError(err)) {
        setCooldown(geminiCooldowns, key);
        console.warn('Gemini key rate-limited, cooling down for 62s:', key.slice(-6));
      } else {
        console.warn('Gemini chat key failed, trying next...', (err as { status?: number })?.status);
      }
      continue;
    }
  }

  return null;
}

// ── GLM-4-Flash chat (OpenAI-compatible, completely free) ────────────────────

async function glmChat(
  messages: Array<{ role: string; content: string }>,
  systemInstruction: string
): Promise<string | null> {
  const key = process.env.GLM_API_KEY;
  if (!key || key.startsWith('your_')) return null;

  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ── Gemini Vision — rotates through all 10 keys ──────────────────────────────

async function geminiVision(
  prompt: string,
  imageDataUrls: string[],
  systemInstruction: string
): Promise<string | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  for (const key of keys) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      type InlinePart = { text: string } | { inlineData: { mimeType: string; data: string } };
      const parts: InlinePart[] = [
        { text: `${systemInstruction}\n\n${prompt}` },
      ];

      for (const dataUrl of imageDataUrls) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }

      const result = await model.generateContent(parts as never);
      return result.response.text();
    } catch (err) {
      console.warn('Gemini vision key failed, trying next...', (err as { status?: number })?.status);
      continue;
    }
  }

  return null;
}

// ── Gemini Document Analysis — PDFs via inlineData ──────────────────────────

async function geminiDocumentAnalysis(
  prompt: string,
  documents: Array<{ data: string; mimeType: string; name: string }>,
  systemInstruction: string
): Promise<string | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  for (const key of keys) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      type InlinePart = { text: string } | { inlineData: { mimeType: string; data: string } };
      const parts: InlinePart[] = [{ text: `${systemInstruction}\n\n${prompt}` }];
      for (const doc of documents) {
        parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
      }

      const result = await model.generateContent(parts as never);
      return result.response.text();
    } catch (err) {
      console.warn('Gemini document analysis failed, trying next key...', (err as { status?: number })?.status);
      continue;
    }
  }

  return null;
}

export async function generateDocumentAnalysis(
  prompt: string,
  documents: Array<{ data: string; mimeType: string; name: string }>,
  systemInstruction?: string
): Promise<string> {
  const sysPrompt = systemInstruction ?? 'You are a helpful AI assistant that analyzes documents thoroughly.';
  const result = await geminiDocumentAnalysis(prompt, documents, sysPrompt);
  if (result) return result;
  // Fallback: describe what was attached
  const names = documents.map(d => d.name).join(', ');
  return generateChatResponse(
    [{ role: 'user', content: `${prompt}\n\nNote: Documents attached (${names}) but could not be processed. Please ask the user to paste the text content instead.` }],
    sysPrompt
  );
}

// ── Core types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── generateChatResponse — tries every provider automatically ────────────────

export async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  systemInstruction: string
): Promise<string> {
  const entries = getGroqEntries();

  // 1. Try each Groq key — skip keys still in their rate-limit cooldown
  for (const { key, client } of entries) {
    if (isCoolingDown(groqCooldowns, key)) continue;
    try {
      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map((m) => ({
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 4096,
      });
      return completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      if (isRateLimitError(err)) {
        setCooldown(groqCooldowns, key);
        console.warn('Groq key rate-limited, cooling down for 62s:', key.slice(-6));
      } else if (isNonRetryableError(err)) {
        console.warn('Groq key non-retryable error, skipping:', (err as { status?: number })?.status);
      } else {
        console.warn('Groq chat error, trying next...', (err as { status?: number })?.status);
      }
      continue;
    }
  }

  // 2. Fallback → Gemini (10 keys)
  const geminiResult = await geminiChat(messages, systemInstruction);
  if (geminiResult) return geminiResult;

  // 3. Fallback → GLM-4-Flash
  const glmResult = await glmChat(messages, systemInstruction);
  if (glmResult) return glmResult;

  throw new Error('All AI providers are currently at their rate limit. Please try again in a moment.');
}

// ── generateText ─────────────────────────────────────────────────────────────

export async function generateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  return generateChatResponse(
    [{ role: 'user', content: prompt }],
    systemInstruction ?? 'You are a helpful AI assistant.'
  );
}

// ── generateVisionResponse ───────────────────────────────────────────────────
// Images  → Gemini Vision (primary, 10 keys) → Groq Vision (fallback)
// Docs    → text chat pipeline (no image needed)

export async function generateVisionResponse(
  prompt: string,
  imageDataUrls: string[],
  systemInstruction?: string
): Promise<string> {
  const sysPrompt = systemInstruction ?? 'You are a helpful AI assistant that analyzes images and documents.';

  // Documents only (no images) — route to text chat
  if (imageDataUrls.length === 0) {
    return generateChatResponse([{ role: 'user', content: prompt }], sysPrompt);
  }

  // 1. Try Gemini Vision first (most reliable, 10 keys)
  const geminiResult = await geminiVision(prompt, imageDataUrls, sysPrompt);
  if (geminiResult) return geminiResult;

  // 2. Fallback → Groq Vision
  const groqClients = getGroqClients();
  for (const groq of groqClients) {
    try {
      const imageContent: Groq.Chat.ChatCompletionContentPart[] = imageDataUrls.map((dataUrl) => ({
        type: 'image_url' as const,
        image_url: { url: dataUrl.startsWith('data:') ? dataUrl : `data:image/jpeg;base64,${dataUrl}` },
      }));

      const msgs: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: [{ type: 'text', text: prompt }, ...imageContent] },
      ];

      const completion = await groq.chat.completions.create({
        model: GROQ_VISION_MODEL,
        messages: msgs,
        temperature: 0.7,
        max_tokens: 4096,
      });
      return completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      const shouldSkip = isRateLimitError(err) || isNonRetryableError(err);
      console.warn(`Groq vision error (${(err as { status?: number })?.status}), ${shouldSkip ? 'skipping' : 'trying next'}...`);
      continue;
    }
  }

  throw new Error('Could not analyze the image. Please try again in a moment.');
}

// ── generateJSON ─────────────────────────────────────────────────────────────

export async function generateJSON<T = Record<string, unknown>>(
  prompt: string,
  systemInstruction?: string
): Promise<T | null> {
  const text = await generateText(prompt, systemInstruction);

  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}
