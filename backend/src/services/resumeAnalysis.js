import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { generateStructured, SchemaType } from './llm.js';
import { extractTextFromResume } from './textExtract.js';

const MODEL = 'llama-3.3-70b-versatile';

// Gemini structured-output schema. Constrains the model to return exactly the
// shape the frontend expects.
const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallScore: { type: SchemaType.INTEGER, description: '0-100 overall resume score' },
    summary: { type: SchemaType.STRING, description: '2-3 sentence narrative summary' },
    dimensions: {
      type: SchemaType.ARRAY,
      description: 'Exactly 5 scoring dimensions in order: Clarity, Impact, ATS, Skill Fit, Formatting',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          value: { type: SchemaType.INTEGER, description: '0-100' },
          level: {
            type: SchemaType.STRING,
            description: 'good | warn | poor (good >= 80, warn 60-79, poor < 60)',
          },
        },
        required: ['label', 'value', 'level'],
      },
    },
    feedback: {
      type: SchemaType.ARRAY,
      description: '4-8 specific, actionable feedback items',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: {
            type: SchemaType.STRING,
            description: 'high | med | low',
          },
          category: {
            type: SchemaType.STRING,
            description: 'One of: Impact, Clarity, ATS, Skill Fit, Formatting',
          },
          title: { type: SchemaType.STRING, description: 'Short headline (<= 60 chars)' },
          body: { type: SchemaType.STRING, description: 'Specific explanation' },
          suggestion: {
            type: SchemaType.STRING,
            description: 'Optional concrete rewrite/next step; empty string if not applicable',
          },
        },
        required: ['severity', 'category', 'title', 'body', 'suggestion'],
      },
    },
    atsChecks: {
      type: SchemaType.ARRAY,
      description: 'Exactly 12 ATS compatibility checks',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          pass: { type: SchemaType.BOOLEAN },
        },
        required: ['label', 'pass'],
      },
    },
  },
  required: ['overallScore', 'summary', 'dimensions', 'feedback', 'atsChecks'],
};

function buildPrompt(resumeText) {
  // Gemini does better with a structured, role-framed prompt and explicit
  // rubrics. We cap the resume to avoid blowing through free-tier token limits.
  const capped = resumeText.length > 10_000 ? resumeText.slice(0, 10_000) : resumeText;

  return `You are a senior technical recruiter and resume coach reviewing a candidate's resume for software engineering roles. Be rigorous, specific, and honest.

Score the resume across 5 dimensions (0-100 each):
1. Clarity — writing quality, conciseness, readability
2. Impact — quantified outcomes, metrics, scale indicators
3. ATS — compatibility with applicant tracking systems (headers, fonts, action verbs, keywords)
4. Skill Fit — alignment with modern SDE skill expectations
5. Formatting — layout, visual hierarchy, length

Then produce:
- overallScore (weighted average, 0-100)
- summary: 2-3 sentences on strengths and top improvement areas
- 4-8 feedback items with severity (high/med/low) — focus on the most impactful fixes
- Exactly 12 ATS compatibility checks (pass/fail boolean)

Rules:
- level for each dimension: "good" (>= 80), "warn" (60-79), "poor" (< 60)
- Be specific — reference concrete things in the resume rather than generic advice
- Every feedback item must have a title, body, and suggestion (suggestion can be "" if truly not applicable)
- Use Indian professional context for action verbs and skill expectations when relevant

RESUME TEXT:
"""
${capped}
"""
`;
}

/**
 * Runs the full pipeline: extract text → prompt Gemini → save analysis.
 * Upserts by resumeId so repeat calls overwrite stale results.
 */
export async function analyzeResume(resume) {
  const text = await extractTextFromResume(resume);
  if (!text || text.length < 80) {
    const err = new Error('Could not extract enough text from the resume to analyze it.');
    err.status = 400;
    throw err;
  }

  const raw = await generateStructured({
    prompt: buildPrompt(text),
    responseSchema: analysisSchema,
    model: MODEL,
    temperature: 0.3,
    maxOutputTokens: 2048,
  });

  const analysis = await ResumeAnalysis.findOneAndUpdate(
    { resumeId: resume._id },
    {
      resumeId: resume._id,
      userId: resume.userId,
      overallScore: clampScore(raw.overallScore),
      summary: raw.summary,
      dimensions: (raw.dimensions || []).map((d) => ({
        label: d.label,
        value: clampScore(d.value),
        level: normalizeLevel(d.level, d.value),
      })),
      feedback: (raw.feedback || []).map((f) => ({
        severity: normalizeSeverity(f.severity),
        category: f.category,
        title: f.title,
        body: f.body,
        suggestion: f.suggestion || '',
      })),
      atsChecks: (raw.atsChecks || []).map((c) => ({ label: c.label, pass: Boolean(c.pass) })),
      llmModel: MODEL,
      extractedChars: text.length,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return analysis;
}

function clampScore(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLevel(level, value) {
  const allowed = new Set(['good', 'warn', 'poor']);
  if (typeof level === 'string' && allowed.has(level.toLowerCase())) {
    return level.toLowerCase();
  }
  const v = clampScore(value);
  if (v >= 80) return 'good';
  if (v >= 60) return 'warn';
  return 'poor';
}

function normalizeSeverity(sev) {
  const s = String(sev || '').toLowerCase();
  if (s === 'high' || s === 'med' || s === 'low') return s;
  if (s === 'medium') return 'med';
  if (s === 'critical') return 'high';
  return 'med';
}
