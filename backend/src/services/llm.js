import { env } from '../config/env.js';

// Single place we talk to the LLM. All services go through
// `generateStructured(...)` so swapping providers is a one-file change.
//
// Current provider: Groq (Llama 3.3 70B Versatile, LPU inference).
// - 14K requests/day on the free tier, ~30 RPM
// - OpenAI-compatible chat completions API (no SDK needed, just fetch)
// - JSON mode returns valid JSON; we encode the schema structure into the
//   prompt so the model knows what shape to produce.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 600;

// Kept with the same values Gemini's SchemaType enum used, so every service's
// schema definition (written against the old Gemini adapter) still imports
// this module and compiles unchanged.
export const SchemaType = Object.freeze({
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
});

export function isLlmConfigured() {
  return Boolean(env.GROQ_API_KEY);
}

function requireKey() {
  if (!env.GROQ_API_KEY) {
    const err = new Error(
      'AI is not configured. Set GROQ_API_KEY in backend/.env. Get one at https://console.groq.com/keys'
    );
    err.status = 503;
    throw err;
  }
  return env.GROQ_API_KEY;
}

// Walks a Gemini-style schema into a compact JSON-shaped skeleton, e.g.
//   { overallScore: "<integer: 0-100>", dimensions: [{ label: "<string>" }] }
// Pasted into the prompt so the LLM knows exactly what to produce.
function schemaToShape(s) {
  if (!s) return '<any>';
  const t = String(s.type || '').toUpperCase();
  const desc = s.description ? `: ${s.description}` : '';

  if (t === 'OBJECT') {
    const out = {};
    for (const [k, v] of Object.entries(s.properties || {})) {
      out[k] = schemaToShape(v);
    }
    return out;
  }
  if (t === 'ARRAY') {
    return [schemaToShape(s.items || {})];
  }
  if (t === 'BOOLEAN') return `<boolean${desc}>`;
  if (t === 'INTEGER') return `<integer${desc}>`;
  if (t === 'NUMBER') return `<number${desc}>`;
  return `<string${desc}>`;
}

function isRetryable(err) {
  const status = err?.status ?? err?.statusCode;
  // 429 quota, 500/502/503 transient server issues — all worth a retry.
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generates a structured JSON response from the LLM.
 * - `prompt`         — the domain prompt written by the calling service
 * - `responseSchema` — Gemini-style schema describing the expected JSON
 * - `model`          — override Llama 3.3 70B Versatile if needed
 * - `temperature`    — 0–1, lower = more deterministic
 * - `maxOutputTokens`— upper bound on response size
 *
 * Retries transient errors with exponential backoff.
 */
export async function generateStructured({
  prompt,
  responseSchema,
  model = DEFAULT_MODEL,
  temperature = 0.3,
  maxOutputTokens = 2048,
}) {
  const key = requireKey();
  const shapeString = JSON.stringify(schemaToShape(responseSchema), null, 2);

  const fullPrompt = `${prompt}

Respond with ONLY a valid JSON object matching this structure. Follow every field description precisely. Do not include markdown code fences, comments, or any prose outside the JSON.

${shapeString}`;

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a precise assistant that outputs only valid JSON matching the requested structure. Never include markdown fences, comments, or prose outside the JSON object.',
      },
      { role: 'user', content: fullPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxOutputTokens,
  };

  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`Groq API ${res.status}: ${text.slice(0, 300)}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';

      try {
        return JSON.parse(content);
      } catch (parseErr) {
        // Very rare — json_object mode nearly always returns valid JSON, but
        // if the model misfires we retry rather than bubble up a parse error.
        const wrap = new Error(`LLM returned non-JSON output: ${parseErr.message}`);
        wrap.retryable = true;
        wrap.raw = content;
        throw wrap;
      }
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS && (isRetryable(err) || err.retryable)) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[llm] ${model} attempt ${attempt} failed, retrying in ${delay}ms: ${String(err.message || '').slice(0, 140)}`
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  const final = new Error(
    isRetryable(lastErr)
      ? 'The AI is busy right now. Please try again in a moment.'
      : lastErr?.message || 'AI request failed'
  );
  final.status = isRetryable(lastErr) ? 503 : 500;
  final.cause = lastErr;
  throw final;
}
