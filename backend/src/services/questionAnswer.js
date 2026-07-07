import { generateStructured, SchemaType } from './llm.js';
import { QuestionAnswer } from '../models/QuestionAnswer.js';

const MODEL = 'llama-3.3-70b-versatile';

// Domains we're willing to surface as "further reading" links. Gemini
// sometimes hallucinates URLs, so we drop anything off-list.
const ALLOWED_REFERENCE_PREFIXES = [
  'https://leetcode.com/',
  'https://www.geeksforgeeks.org/',
  'https://developer.mozilla.org/',
  'https://react.dev/',
  'https://nodejs.org/',
  'https://web.dev/',
  'https://roadmap.sh/',
  'https://www.neetcode.io/',
  'https://www.interviewbit.com/',
  'https://github.com/',
  'https://docs.mongodb.com/',
  'https://redis.io/',
  'https://kubernetes.io/',
  'https://postgresql.org/',
  'https://en.wikipedia.org/',
];

const answerSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tldr: {
      type: SchemaType.STRING,
      description: '1-2 sentence answer summary — the core insight in plain English.',
    },
    explanation: {
      type: SchemaType.STRING,
      description:
        "HTML-safe structured explanation. Use <p>, <ul>/<li>, <strong>, and <code> for inline code. Don't include <script> or event handlers. No markdown fences.",
    },
    keyPoints: {
      type: SchemaType.ARRAY,
      description: '3-6 concise bullet points that an interviewer is listening for.',
      items: { type: SchemaType.STRING },
    },
    codeLanguage: {
      type: SchemaType.STRING,
      description: 'Language of the code sample if applicable (e.g. "javascript", "python"). Empty string if no code.',
    },
    codeSample: {
      type: SchemaType.STRING,
      description: 'Optional code snippet. Prefer JavaScript for algorithm questions. Empty string for non-code questions.',
    },
    followUps: {
      type: SchemaType.ARRAY,
      description: '2-4 realistic follow-up questions an interviewer might ask after this one.',
      items: { type: SchemaType.STRING },
    },
    references: {
      type: SchemaType.ARRAY,
      description:
        '1-3 further-reading links. ONLY use https URLs on these exact domains: leetcode.com, geeksforgeeks.org, developer.mozilla.org, react.dev, nodejs.org, web.dev, roadmap.sh, neetcode.io, interviewbit.com, github.com, docs.mongodb.com, redis.io, kubernetes.io, postgresql.org, en.wikipedia.org. Return an empty array if you cannot cite verified URLs. NEVER invent URLs.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['tldr', 'explanation', 'keyPoints', 'codeLanguage', 'codeSample', 'followUps', 'references'],
};

function buildPrompt(question) {
  const cleanTitle = String(question.title || '').replace(/\*/g, '').trim();
  return `You are a senior engineer writing a model interview answer. Be concise but thorough — respect the reader's time.

INTERVIEW QUESTION:
Title: ${cleanTitle}
Category: ${question.category || 'DSA'}
Difficulty: ${question.difficulty || 'Medium'}
Context: ${question.body || ''}

Write a model answer that a strong candidate would give out loud. Target length: 150-300 words in the explanation.

REQUIRED:
- tldr: the one-line answer
- explanation: HTML-safe structured body with <p>/<ul>/<strong>/<code>. No markdown, no <script>.
- keyPoints: 3-6 phrases that hit the rubric
- codeSample (+ codeLanguage): a short, correct snippet for algorithm/code questions. Leave BOTH empty strings for non-code questions (behavioral, system design, etc).
- followUps: 2-4 plausible next questions
- references: 1-3 external links on the whitelisted domains. If you cannot cite a specific verified URL, return an empty array. Never invent URLs.

TONE:
- Direct, no fluff. Say what the answer is, then why.
- Use concrete examples from well-known systems where helpful.
- Indian SDE interview context.`;
}

function sanitizeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

function filterReferences(refs) {
  if (!Array.isArray(refs)) return [];
  const out = [];
  const seen = new Set();
  for (const r of refs) {
    if (!r || typeof r.url !== 'string' || typeof r.title !== 'string') continue;
    const url = r.url.trim();
    if (!ALLOWED_REFERENCE_PREFIXES.some((p) => url.startsWith(p))) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: r.title.slice(0, 120).trim(), url });
    if (out.length >= 4) break;
  }
  return out;
}

/**
 * Generates a cached model answer for a question via Gemini. Idempotent:
 * call `findExisting` first if you want to skip the LLM round-trip.
 */
export async function generateQuestionAnswer(question) {
  const raw = await generateStructured({
    prompt: buildPrompt(question),
    responseSchema: answerSchema,
    model: MODEL,
    temperature: 0.4,
    maxOutputTokens: 1500,
  });

  const doc = await QuestionAnswer.findOneAndUpdate(
    { questionId: question._id },
    {
      questionId: question._id,
      tldr: String(raw.tldr || '').slice(0, 400).trim(),
      explanation: sanitizeHtml(raw.explanation || ''),
      keyPoints: (raw.keyPoints || []).slice(0, 8).map((s) => String(s).trim()).filter(Boolean),
      codeLanguage: String(raw.codeLanguage || '').slice(0, 40).trim(),
      codeSample: String(raw.codeSample || ''),
      followUps: (raw.followUps || []).slice(0, 5).map((s) => String(s).trim()).filter(Boolean),
      references: filterReferences(raw.references),
      llmModel: MODEL,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return doc;
}

export async function findExistingAnswer(questionId) {
  return QuestionAnswer.findOne({ questionId });
}

/**
 * Generic answer generator that runs the prompt + sanitization pipeline
 * against any question-shaped object. The caller decides where to persist.
 * Returns the sanitized answer fields; does NOT touch Mongo.
 */
export async function generateAnswerFields(question) {
  const raw = await generateStructured({
    prompt: buildPrompt(question),
    responseSchema: answerSchema,
    model: MODEL,
    temperature: 0.4,
    maxOutputTokens: 1500,
  });
  return {
    tldr: String(raw.tldr || '').slice(0, 400).trim(),
    explanation: sanitizeHtml(raw.explanation || ''),
    keyPoints: (raw.keyPoints || []).slice(0, 8).map((s) => String(s).trim()).filter(Boolean),
    codeLanguage: String(raw.codeLanguage || '').slice(0, 40).trim(),
    codeSample: String(raw.codeSample || ''),
    followUps: (raw.followUps || []).slice(0, 5).map((s) => String(s).trim()).filter(Boolean),
    references: filterReferences(raw.references),
    llmModel: MODEL,
  };
}
