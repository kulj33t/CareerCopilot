import { generateStructured, SchemaType } from './llm.js';
import { extractTextFromResume } from './textExtract.js';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_JD_CHARS = 8_000;
const MAX_RESUME_CHARS = 10_000;

const jdMatchSchema = {
  type: SchemaType.OBJECT,
  properties: {
    matchPct: { type: SchemaType.INTEGER, description: '0-100 overall fit percentage' },
    summary: {
      type: SchemaType.STRING,
      description: '1-2 sentence honest read on fit and what to improve',
    },
    matching: {
      type: SchemaType.ARRAY,
      description: 'Specific skills/technologies that appear in BOTH the JD and the resume',
      items: { type: SchemaType.STRING },
    },
    missing: {
      type: SchemaType.ARRAY,
      description: 'Specific skills/technologies the JD requires that are NOT in the resume',
      items: { type: SchemaType.STRING },
    },
    tip: {
      type: SchemaType.STRING,
      description:
        'The single highest-leverage action the candidate can take to raise their match score',
    },
  },
  required: ['matchPct', 'summary', 'matching', 'missing', 'tip'],
};

function buildPrompt({ resumeText, jdText }) {
  const resume = resumeText.length > MAX_RESUME_CHARS ? resumeText.slice(0, MAX_RESUME_CHARS) : resumeText;
  const jd = jdText.length > MAX_JD_CHARS ? jdText.slice(0, MAX_JD_CHARS) : jdText;

  return `You are a senior technical recruiter matching a candidate's resume to a specific job description. Be rigorous and honest.

Your job:
1. Identify the concrete skills/technologies the JD requires (not soft skills like "teamwork").
2. Compare them against what the resume actually demonstrates.
3. Compute a match percentage (0-100):
   - 85+ : strong fit, minor gaps
   - 70-84: solid fit with notable gaps
   - 50-69: partial fit, significant gaps
   - < 50 : poor fit
4. Return matching skills (those present in BOTH) and missing skills (required by JD but absent from resume).
5. Suggest ONE high-leverage action to close the biggest gap.

Rules:
- "Matching" and "missing" must be specific, concrete skills — e.g. "Docker", "PostgreSQL", "System Design". Not vague like "backend development".
- Keep each list to the most relevant 3-10 items.
- Use the Indian student/early-career context (internships, hackathons, course projects all count as experience).

RESUME:
"""
${resume}
"""

JOB DESCRIPTION:
"""
${jd}
"""
`;
}

export async function matchJobDescription({ resume, jdText }) {
  if (!jdText || jdText.trim().length < 30) {
    const err = new Error('Job description is too short to analyze. Paste at least a paragraph.');
    err.status = 400;
    throw err;
  }

  const resumeText = await extractTextFromResume(resume);
  if (!resumeText || resumeText.length < 80) {
    const err = new Error('Could not extract enough text from the resume to match it.');
    err.status = 400;
    throw err;
  }

  const raw = await generateStructured({
    prompt: buildPrompt({ resumeText, jdText }),
    responseSchema: jdMatchSchema,
    model: MODEL,
    temperature: 0.3,
    maxOutputTokens: 1024,
  });

  return {
    matchPct: clampPct(raw.matchPct),
    summary: raw.summary || '',
    matching: dedupe(raw.matching).slice(0, 15),
    missing: dedupe(raw.missing).slice(0, 15),
    tip: raw.tip || '',
  };
}

function clampPct(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dedupe(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (typeof s !== 'string') continue;
    const trimmed = s.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
