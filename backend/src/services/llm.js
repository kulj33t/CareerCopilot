import { env } from '../config/env.js';

// Single place we talk to the LLM. All services go through
// `generateStructured(...)` so swapping providers is a one-file change.
//
// Current provider: Groq (GPT OSS 120B, LPU inference).
// - OpenAI-compatible chat completions API (no SDK needed, just fetch)
// - JSON mode returns valid JSON; we encode the schema structure into the
//   prompt so the model knows what shape to produce.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
const MAX_ATTEMPTS = 2;
const BASE_BACKOFF_MS = 600;
const REQUEST_TIMEOUT_MS = 35_000;

// Shared schema labels used by the domain services to describe JSON output.
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

// Walks the domain schema into a compact JSON-shaped skeleton, e.g.
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
  // Do not retry provider 429s; retrying immediately adds pressure to a quota
  // limit. A single retry is reserved for transient upstream server failures.
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generates a structured JSON response from the LLM.
 * - `prompt`         — the domain prompt written by the calling service
 * - `responseSchema` — schema describing the expected JSON
 * - `model`          — override the configured Groq model if needed
 * - `temperature`    — 0–1, lower = more deterministic
 * - `maxOutputTokens`— upper bound on response size
 *
 * Retries transient errors with exponential backoff.
 */
export async function generateStructured({
  prompt,
  responseSchema,
  model = GROQ_MODEL,
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`Groq API request failed (${res.status})`);
        err.status = res.status;
        err.retryAfter = res.headers.get('retry-after') || undefined;
        try {
          err.code = JSON.parse(text)?.error?.code;
        } catch {
          // Keep provider response parsing best-effort; never return it to clients.
        }
        if (err.code === 'model_not_found') {
          console.error(`[llm] Groq model is unavailable to this project: ${model}`);
        }
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
      lastErr = controller.signal.aborted
        ? Object.assign(new Error('Groq request timed out'), { name: 'AbortError' })
        : err;
      if (attempt < MAX_ATTEMPTS && (isRetryable(err) || err.retryable)) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[llm] ${model} attempt ${attempt} failed, retrying in ${delay}ms: ${String(err.message || '').slice(0, 140)}`
        );
        await sleep(delay);
        continue;
      }
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  const modelUnavailable = lastErr?.code === 'model_not_found';
  const rateLimited = lastErr?.status === 429;
  const timedOut = lastErr?.name === 'AbortError';
  const final = new Error(
    modelUnavailable
      ? 'The AI service is temporarily unavailable. Please try again later.'
      : rateLimited
        ? 'The AI service is busy right now. Please wait before trying again.'
        : timedOut
          ? 'The AI service took too long to respond. Please try again later.'
          : isRetryable(lastErr)
        ? 'The AI service is busy right now. Please try again in a moment.'
        : 'The AI service could not complete this request. Please try again later.'
  );
  final.status = modelUnavailable || isRetryable(lastErr) ? 503 : rateLimited ? 429 : timedOut ? 504 : 500;
  if (rateLimited && lastErr?.retryAfter) final.retryAfter = lastErr.retryAfter;
  if (modelUnavailable) final.code = 'AI_MODEL_UNAVAILABLE';
  final.cause = lastErr;
  throw final;
}
