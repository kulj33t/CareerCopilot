import { generateStructured, SchemaType } from './llm.js';
import { PrepPlan } from '../models/PrepPlan.js';

const MODEL = 'llama-3.3-70b-versatile';

// Whitelist of reference-URL prefixes we accept from the LLM. Everything else
// is dropped so we never surface a hallucinated link to the user.
const ALLOWED_URL_PREFIXES = [
  'https://roadmap.sh/',
  'https://developer.mozilla.org/',
  'https://leetcode.com/',
  'https://www.neetcode.io/',
  'https://react.dev/',
  'https://nodejs.org/',
  'https://web.dev/',
  'https://www.interviewbit.com/',
  'https://github.com/',
];

const planSchema = {
  type: SchemaType.OBJECT,
  properties: {
    tasks: {
      type: SchemaType.ARRAY,
      description: '18-25 concrete prep tasks distributed across 7 days (day 0 through 6)',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.INTEGER, description: 'Day offset 0-6' },
          title: { type: SchemaType.STRING, description: 'Short imperative headline (<= 80 chars)' },
          body: { type: SchemaType.STRING, description: 'One sentence explaining what to do or cover' },
          duration: { type: SchemaType.STRING, description: 'Rough time estimate like "30 min", "1 hr", "2 hr"' },
          priority: { type: SchemaType.BOOLEAN, description: 'Only 1-3 tasks should be true' },
          category: {
            type: SchemaType.STRING,
            description: 'One of: DSA, System Design, Behavioral, Resume, Mock, Reading',
          },
          refUrl: {
            type: SchemaType.STRING,
            description:
              'Optional public URL for further reading. MUST start with https://roadmap.sh/ or https://developer.mozilla.org/ or https://leetcode.com/ or https://www.neetcode.io/ or https://react.dev/ or https://nodejs.org/ or https://web.dev/ or https://www.interviewbit.com/ or https://github.com/ — else return empty string. NEVER invent URLs.',
          },
        },
        required: ['day', 'title', 'body', 'duration', 'priority', 'category', 'refUrl'],
      },
    },
  },
  required: ['tasks'],
};

const EXPERIENCE_LABEL = {
  fresher: 'fresher (0-1 years)',
  early: 'early career (1-3 years)',
  mid: 'mid-level (3-6 years)',
  senior: 'senior (6+ years)',
};

const DIFFICULTY_GUIDANCE = {
  easy: 'Lean toward fundamentals, easy/medium problems, confidence-building drills. Avoid brutal hard problems.',
  medium: 'Realistic mix — medium problems dominate, a sprinkle of hard ones, real-world system-design warmups.',
  hard: 'Push hard. Heavy on hard DSA, senior-level system design, edge-case-rich behavioral stories. Assume strong basics already.',
};

function buildPrompt({ targetRole, experience, difficulty, interviewDate, weakTopics }) {
  const daysUntil = interviewDate
    ? Math.max(0, Math.round((new Date(interviewDate) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const weakList = weakTopics && weakTopics.length > 0
    ? weakTopics.join(', ')
    : 'no specific weak topics provided — assume a balanced general gap';

  const horizon = daysUntil === null
    ? 'no fixed interview date (plan for steady weekly practice)'
    : daysUntil <= 7
      ? `interview is ${daysUntil} day(s) away — intensive, high-priority items only`
      : `interview is ${daysUntil} days away — steady 7-day sprint focused on weakest areas first`;

  const expLabel = EXPERIENCE_LABEL[experience] || experience || 'fresher (0-1 years)';
  const diffGuidance = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;

  return `You are a senior engineering coach building a 7-day prep plan for a candidate preparing for software engineering interviews.

CANDIDATE CONTEXT:
- Target role: ${targetRole}
- Experience level: ${expLabel}
- Difficulty target: ${difficulty || 'medium'} — ${diffGuidance}
- Horizon: ${horizon}
- Weak topics: ${weakList}

PLAN STRUCTURE (strict):
- Generate 18-25 tasks total across day 0 through day 6 (7 days).
- Distribute roughly 3-4 tasks per day; days 0-2 can be heavier if the interview is close.
- Mix categories: DSA (~30%), System Design (~15%), Resume polishing (~10%), Mock interviews (~10%), Reading/Theory (~20%), Behavioral (~10%), Other as needed.
- Calibrate task difficulty and depth to the experience level and difficulty target above — a senior on "hard" gets nothing about "what is var vs let"; a fresher on "easy" gets no distributed-transactions deep dive.
- Address the listed weak topics FIRST on days 0-2.
- Day 6 should be lighter — review, light mocks, resume final pass.
- Each task needs a concrete, actionable title ("Solve 3 medium DP problems on LeetCode", not "Practice DP").

REFERENCE URLS:
- Only include a refUrl if you're confident it's a real public page on one of these domains: roadmap.sh, developer.mozilla.org, leetcode.com, neetcode.io, react.dev, nodejs.org, web.dev, interviewbit.com, github.com
- If you cannot cite a specific verified URL, return an empty string.
- NEVER invent URLs or use any other domain.

TONE:
- Imperative, specific, Indian SDE context (internships, hackathons, campus placement cycles count).
`;
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return ALLOWED_URL_PREFIXES.some((p) => trimmed.startsWith(p)) ? trimmed : '';
}

function normalizeCategory(c) {
  const allowed = new Set(['DSA', 'System Design', 'Behavioral', 'Resume', 'Mock', 'Reading']);
  if (typeof c === 'string' && allowed.has(c)) return c;
  return 'Other';
}

function clampDay(d) {
  const n = Number(d);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(6, Math.floor(n)));
}

/**
 * Calls Gemini to produce the raw plan, then persists it (upsert keyed by
 * userId). One plan per user at a time — regeneration overwrites.
 */
export async function generatePrepPlan({
  user,
  targetRole,
  experience,
  difficulty,
  interviewDate,
  weakTopics,
}) {
  const raw = await generateStructured({
    prompt: buildPrompt({ targetRole, experience, difficulty, interviewDate, weakTopics }),
    responseSchema: planSchema,
    model: MODEL,
    temperature: 0.5,
    maxOutputTokens: 3000,
  });

  const tasks = (raw.tasks || []).map((t) => ({
    day: clampDay(t.day),
    title: String(t.title || '').slice(0, 200).trim(),
    body: String(t.body || '').slice(0, 500).trim(),
    duration: String(t.duration || '').slice(0, 40).trim(),
    priority: Boolean(t.priority),
    category: normalizeCategory(t.category),
    refUrl: sanitizeUrl(t.refUrl),
    done: false,
  })).filter((t) => t.title.length > 0);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const plan = await PrepPlan.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      startDate,
      targetRole,
      experience: experience || 'fresher',
      difficulty: difficulty || 'medium',
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      weakTopicsSnapshot: weakTopics || [],
      tasks,
      llmModel: MODEL,
      generatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return plan;
}
