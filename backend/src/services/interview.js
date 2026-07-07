import { generateStructured, SchemaType } from './llm.js';
import { InterviewSession } from '../models/InterviewSession.js';

const MODEL = 'llama-3.3-70b-versatile';

// ─── Schemas for Gemini structured output ────────────────────────────

// Opening turn (no user answer yet). AI introduces the interview + first
// question. Feedback is null.
const openingSchema = {
  type: SchemaType.OBJECT,
  properties: {
    aiMessage: {
      type: SchemaType.STRING,
      description:
        "HTML-safe. 1-sentence greeting + 1-sentence preview of what's coming + the Introduction question ('Tell me about yourself'). Do NOT ask a technical question here. Keep total under 60 words.",
    },
    topics: {
      type: SchemaType.ARRAY,
      description:
        'EXACTLY 5-6 topic names IN ORDER. MUST start with "Introduction", then "Projects", then 2-3 round-specific technical topics, then "Wrap-up".',
      items: { type: SchemaType.STRING },
    },
  },
  required: ['aiMessage', 'topics'],
};

// Continuing turn — graded user's last answer and is responding.
const turnSchema = {
  type: SchemaType.OBJECT,
  properties: {
    feedback: {
      type: SchemaType.OBJECT,
      description: "Honest evaluation of the user's most recent answer.",
      properties: {
        score: { type: SchemaType.NUMBER, description: '0-10, allow one decimal' },
        rating: {
          type: SchemaType.STRING,
          description: 'Short label like "8/10 — Strong" or "5/10 — Shaky"',
        },
        tags: {
          type: SchemaType.STRING,
          description: 'Compact checks like "✓ Complete · △ Edge cases"',
        },
        great: { type: SchemaType.STRING, description: 'One sentence on what was good' },
        sharper: { type: SchemaType.STRING, description: 'One sentence on how to improve' },
      },
      required: ['score', 'rating', 'tags', 'great', 'sharper'],
    },
    aiMessage: {
      type: SchemaType.STRING,
      description:
        'HTML-safe follow-up OR next question. Keep it concise — this is an interview, not a lecture.',
    },
    topicsDone: {
      type: SchemaType.ARRAY,
      description: 'Names of topics (from the initial list) that are now considered covered.',
      items: { type: SchemaType.STRING },
    },
    advanceQuestion: {
      type: SchemaType.BOOLEAN,
      description: 'True if this AI turn represents moving to a new question (not a follow-up).',
    },
  },
  required: ['feedback', 'aiMessage', 'topicsDone', 'advanceQuestion'],
};

const reportSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallScore: { type: SchemaType.NUMBER, description: '0-10, one decimal' },
    meta: { type: SchemaType.STRING, description: 'One line like "SDE · Technical · Medium · 10 questions"' },
    radar: {
      type: SchemaType.OBJECT,
      properties: {
        labels: {
          type: SchemaType.ARRAY,
          description: '5-6 evaluation axes (JavaScript, System Design, DSA, Communication, etc.)',
          items: { type: SchemaType.STRING },
        },
        you: {
          type: SchemaType.ARRAY,
          description: 'Candidate scores per axis, 0-10, same order as labels',
          items: { type: SchemaType.NUMBER },
        },
        target: {
          type: SchemaType.ARRAY,
          description: 'Role-target bar per axis, 0-10, same order as labels',
          items: { type: SchemaType.NUMBER },
        },
      },
      required: ['labels', 'you', 'target'],
    },
    strengths: {
      type: SchemaType.ARRAY,
      description: '3-5 concrete strengths observed in the answers',
      items: { type: SchemaType.STRING },
    },
    growth: {
      type: SchemaType.ARRAY,
      description: '3-5 specific areas to improve',
      items: { type: SchemaType.STRING },
    },
    nextSteps: {
      type: SchemaType.ARRAY,
      description: '3 concrete next-step recommendations',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          icon: { type: SchemaType.STRING, description: 'Single emoji (📚, 💻, 🔁 etc.)' },
          title: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
        },
        required: ['icon', 'title', 'body'],
      },
    },
  },
  required: ['overallScore', 'meta', 'radar', 'strengths', 'growth', 'nextSteps'],
};

// ─── Prompts ─────────────────────────────────────────────────────────

const MODE_MAP = { text: 'text', voice: 'voice', video: 'video' };
const ROLE_MAP = {
  sde: 'Software Engineer / Full-Stack',
  frontend: 'Frontend Engineer',
  backend: 'Backend Engineer',
  data: 'Data / ML Engineer',
};

// Role × round topic scope. Tells the LLM exactly what to ask about and,
// just as importantly, what NOT to ask about. A Frontend candidate shouldn't
// get deep-dive questions on Kafka; a Backend candidate shouldn't be quizzed
// on CSS specificity.
const ROLE_TOPICS = {
  frontend: {
    technical:
      'HTML semantics · CSS (specificity, layout, grid/flex) · JavaScript (closures, async, event loop) · React (hooks, reconciliation, memoization, context, Suspense) · state management · browser rendering / Web Vitals · accessibility · TypeScript basics · bundlers / code splitting. DO NOT ask about backend-specific topics (databases, caching backends, message queues, distributed systems). Keep it frontend-shaped.',
    system:
      'Frontend system design: micro-frontends, component libraries, state at scale, SSR vs CSR vs SSG trade-offs, CDN + caching, code splitting, performance budgets, error tracking, A/B testing architecture. Keep server-side concepts light.',
    dsa:
      'DSA framed through frontend: implement throttle/debounce, LRU cache in JS, DOM-tree traversal, virtual-list windowing, string manipulation. Classic DSA OK but expect JS syntax and frontend framing.',
    behavioral:
      'Collaboration with designers/PMs, perf-vs-feature trade-offs, launch incidents, owning a frontend migration, handling designer disagreements.',
  },
  backend: {
    technical:
      'REST / GraphQL API design · authentication / JWT / OAuth · SQL vs NoSQL · indexes · transactions / ACID · caching (Redis, CDN) · message queues (Kafka, RabbitMQ) · Node.js event loop · concurrency · security (SQLi, XSS, CSRF, idempotency) · observability. DO NOT go deep on CSS / React / bundlers.',
    system:
      'Backend system design: URL shortener, rate limiter, real-time chat, payment gateway, notification system, search autocomplete, sharding, replication, CAP, eventual consistency. This is your main territory.',
    dsa:
      'Classic DSA but with server-side framing: rate limiter algorithms, LRU cache, consistent hashing, job scheduler data structures, database query optimization. OK to go deep on trees/graphs.',
    behavioral:
      'On-call incident stories, production bug postmortems, scaling debates, security trade-offs, cross-team API negotiations.',
  },
  data: {
    technical:
      'Statistics (sampling, distributions, hypothesis tests) · probability · SQL (window functions, CTEs, query optimization) · data modeling · ML fundamentals (train/val/test, overfitting, regularization, bias-variance) · metrics (precision/recall/F1/AUC) · feature engineering · Python/pandas. DO NOT do deep frontend or microservices.',
    system:
      'Data infrastructure: ETL pipelines, data warehouse vs lake, streaming (Kafka → Spark), feature stores, model serving, data quality / lineage, experimentation platforms.',
    dsa:
      'Algorithms for data: reservoir sampling, top-k, approximate counting (HyperLogLog), hashing, sorting large datasets. Framed through data lenses.',
    behavioral:
      'Translating business questions to data work, stakeholder management, dashboard vs model decisions, dealing with bad data.',
  },
  sde: {
    technical:
      'Language fundamentals (any of JS/Python/Java) · OOP concepts · REST APIs · basic databases · simple system design · testing · version control · general problem solving. Balanced breadth, not too deep in any single silo.',
    system:
      'Generalist system design: URL shortener, feed, chat app, e-commerce checkout. Cover the core concepts (load balancers, caching, DB choices) rather than diving too deep on one area.',
    dsa:
      'Full DSA spectrum calibrated to level: arrays, strings, hashing, trees, graphs, DP, greedy. Classic LeetCode-style.',
    behavioral:
      'Teamwork, conflict, ownership, learning curve stories, handling ambiguity.',
  },
};

function topicScope(setup) {
  return ROLE_TOPICS[setup.role]?.[setup.round] ||
    'general software engineering topics appropriate to the role and level';
}
const ROUND_MAP = {
  dsa: 'DSA coding',
  technical: 'Technical fundamentals',
  system: 'System Design',
  behavioral: 'Behavioral',
};
const LEVEL_MAP = { fresher: '0-1 yrs (fresher)', early: '1-3 yrs', mid: '3-6 yrs', senior: '6+ yrs' };
const DIFFICULTY_MAP = {
  easy: 'easy (warm-up)',
  medium: 'medium (realistic)',
  hard: 'hard (senior pressure)',
  adaptive: 'adaptive (calibrate to candidate)',
};

function setupBrief(setup) {
  return `Role: ${ROLE_MAP[setup.role] || setup.role}, Round: ${ROUND_MAP[setup.round] || setup.round}, Level: ${LEVEL_MAP[setup.level] || setup.level}, Difficulty: ${DIFFICULTY_MAP[setup.difficulty] || setup.difficulty}`;
}

function buildOpeningPrompt(setup, userName) {
  return `You are a senior interviewer running a realistic mock interview for a ${ROLE_MAP[setup.role]} candidate. Stay in-role the whole time.

INTERVIEW CONFIG:
${setupBrief(setup)}

TOPIC SCOPE (CRITICAL — stay inside this universe for the whole session):
${topicScope(setup)}

REQUIRED STRUCTURE:
1. Introduction (Q1):     "Tell me a bit about yourself — your background and what you're looking for." (one sentence acknowledgement, then move on)
2. Projects (Q2–Q3):      Ask about 1-2 recent projects. Probe tech stack, ownership, trade-offs, impact.
3. ${ROUND_MAP[setup.round]} (Q4–Q8): Role-specific technical questions drawn STRICTLY from the topic scope above.
4. Wrap-up (Q9–Q10):      A sharper edge-case scenario in-scope, then "Any questions for me?" as the final turn.

YOUR FIRST TURN (OPENING) — keep it VERY short:
- Greet ${userName ? userName : 'the candidate'} by name in 1 sentence.
- State what the interview will cover in 1 short sentence (reference the role).
- Immediately ask the Introduction question ("Tell me a bit about yourself…").
- Do NOT ask a technical question yet. Do NOT monologue.

Output ONLY:
- aiMessage: HTML-safe. Greeting + first question. Use <strong> for emphasis. No markdown fences, no lists.
- topics: array of EXACTLY 5-6 strings naming the phases/topics you'll cover in ORDER. Start with "Introduction", then "Projects", then 2-3 topic names drawn from the scope above (e.g. for a Frontend role technical round: "React internals", "CSS & rendering", "Performance & accessibility"). End with "Wrap-up".`;
}

function historyToText(messages) {
  return messages
    .map((m) => {
      const who = m.role === 'ai' ? 'INTERVIEWER' : 'CANDIDATE';
      // Strip HTML tags for the prompt — Gemini doesn't need the markup
      const clean = String(m.html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return `${who}: ${clean}`;
    })
    .join('\n\n');
}

function phaseForQuestion(n) {
  if (n <= 1) return 'Introduction — light, 1-sentence acknowledgement then move on. No cross-questions here.';
  if (n <= 3) return 'Projects — DIG IN. Ask at least 2 cross-questions on their project before moving on (stack, trade-offs, failure modes, what they would redo, impact).';
  if (n <= 8) return 'Technical — role-specific deep dive. Ask at least 1-2 cross-questions on EACH technical question before advancing (scale it up, handle edge cases, optimize, compare alternatives).';
  return 'Wrap-up — one last sharper edge-case question in scope, then "any questions for me?".';
}

// Count how many turns the interviewer has spent on the current "topic".
// Rough heuristic: count consecutive AI turns with advanceQuestion-like
// language since the last advance. We can't see advanceQuestion directly in
// prior messages, so we approximate by scanning since the last user message
// pair — good enough as a nudge for the prompt.
function countRecentProbesOnSameQuestion(messages) {
  let count = 0;
  // Walk backward from the end. Pairs of (user, ai) = one probe round.
  let sawUser = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user') {
      if (sawUser) break; // second user turn back — that was a fresh question
      sawUser = true;
      count++;
    }
  }
  return count;
}

function buildTurnPrompt(session, latestUserAnswer) {
  const topicsList = session.topicsCovered.map((t) => `${t.name} [${t.done ? 'done' : 'pending'}]`).join(', ');
  const nextQ = session.questionsCovered + 1;
  const probesOnCurrent = countRecentProbesOnSameQuestion(session.messages);

  return `You are continuing a realistic mock interview for a ${ROLE_MAP[session.setup.role]} candidate.

CONFIG: ${setupBrief(session.setup)}
PROGRESS: ${session.questionsCovered}/${session.questionsTarget} questions asked so far. Candidate has given ~${probesOnCurrent} answer(s) on the current question.
PHASE FOR Q#${nextQ}: ${phaseForQuestion(nextQ)}
TOPICS PLANNED: ${topicsList}

TOPIC SCOPE (do NOT leave this universe):
${topicScope(session.setup)}

CONVERSATION HISTORY:
${historyToText(session.messages)}

CANDIDATE'S LATEST ANSWER:
"${latestUserAnswer}"

CRITICAL BEHAVIOR RULES:
1. Grade the answer honestly (0-10, specific great/sharper notes).
2. DEFAULT TO ASKING A FOLLOW-UP / CROSS-QUESTION. Real interviewers probe. Only advance to the next question if:
   (a) We're in the Introduction phase (Q1) — acknowledge briefly and move on, OR
   (b) The candidate has already been probed 2+ times on this question, OR
   (c) They've explicitly said they don't know.
3. Good cross-question patterns (pick whatever fits what they said):
   - "Walk me through WHY you chose that approach over the alternatives."
   - "What's the time/space complexity? Can you do better?"
   - "What if the input were 100x larger — does your approach still work?"
   - "What edge cases did you consider? What happens if the input is empty / duplicated / negative?"
   - "How would you test this?"
   - For projects: "What was the hardest bug?" / "What trade-off are you least happy with?" / "What would you redo?"
   - If the answer was vague: "Can you be more specific about X?" / "Can you give me a concrete example?"
4. Stay in the TOPIC SCOPE above. Do not ask backend questions to a frontend candidate, etc.
5. advanceQuestion=false when asking a follow-up. advanceQuestion=true ONLY when changing question/topic.
6. Keep aiMessage concise — interviewers ASK, not lecture. 1-3 sentences max.
7. Do NOT repeat questions you've already asked — scan the history.
8. Update topicsDone with topic names that are now satisfactorily covered.
9. When questionsCovered approaches ${session.questionsTarget}, start wrapping up naturally.`;
}

function buildReportPrompt(session) {
  return `You are writing a post-interview report card.

CONFIG: ${setupBrief(session.setup)}
Total questions covered: ${session.questionsCovered}
Duration: ${Math.round(((session.endedAt || new Date()) - session.startedAt) / 60000)} minutes
Running score: ${session.liveScore()}/10

FULL CONVERSATION:
${historyToText(session.messages)}

Produce the report. Be honest and specific — reference concrete things the candidate said.
- overallScore: 0-10 with one decimal, weighted by strength/consistency
- meta: summary line like "SDE · Technical · Medium · 32 min · 10 questions"
- radar: 5-6 axes relevant to this round, scored 0-10 for this candidate + a role target
- strengths: what the candidate consistently did well
- growth: what they should improve, specific
- nextSteps: 3 concrete next actions (with an emoji icon each)`;
}

// ─── Public API ──────────────────────────────────────────────────────

function sanitizeHtml(s) {
  // Very light allowlist — we trust Gemini output only to the extent the
  // system prompt constrains it. Strip <script> and on-* attributes.
  if (typeof s !== 'string') return '';
  return s.replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/on\w+='[^']*'/gi, '');
}

export async function startSession({ user, setup }) {
  const raw = await generateStructured({
    prompt: buildOpeningPrompt(setup, user.name),
    responseSchema: openingSchema,
    model: MODEL,
    temperature: 0.7,
    maxOutputTokens: 800,
  });

  const topics = Array.isArray(raw.topics) ? raw.topics.slice(0, 8) : [];
  const session = await InterviewSession.create({
    userId: user._id,
    setup,
    state: 'active',
    messages: [
      {
        role: 'ai',
        html: sanitizeHtml(raw.aiMessage || 'Welcome! Let me ask you a question to get started.'),
        feedback: null,
      },
    ],
    topicsCovered: topics.map((name) => ({ name, done: false })),
    questionsCovered: 1,
    questionsTarget: 10,
    llmModel: MODEL,
  });

  return session;
}

export async function postUserAnswer(session, userAnswer) {
  // Append the user's message first so it's part of the context Gemini sees.
  session.messages.push({ role: 'user', html: userAnswer, feedback: null });

  const raw = await generateStructured({
    prompt: buildTurnPrompt(session, userAnswer),
    responseSchema: turnSchema,
    model: MODEL,
    temperature: 0.5,
    maxOutputTokens: 1000,
  });

  const score = Number(raw?.feedback?.score);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 5;

  // Update rolling average.
  session.scoreSum += safeScore;
  session.scoreCount += 1;

  // Mark topics done from the LLM's topicsDone list.
  const doneSet = new Set((raw.topicsDone || []).map((s) => String(s).toLowerCase()));
  for (const t of session.topicsCovered) {
    if (doneSet.has(t.name.toLowerCase())) t.done = true;
  }

  if (raw.advanceQuestion) {
    session.questionsCovered = Math.min(
      session.questionsTarget,
      session.questionsCovered + 1
    );
  }

  session.messages.push({
    role: 'ai',
    html: sanitizeHtml(raw.aiMessage || ''),
    feedback: {
      score: safeScore,
      rating: raw.feedback?.rating || `${safeScore}/10`,
      tags: raw.feedback?.tags || '',
      great: raw.feedback?.great || '',
      sharper: raw.feedback?.sharper || '',
    },
  });

  await session.save();
  return session;
}

export async function endSessionWithReport(session) {
  if (session.state === 'ended' && session.report) return session;

  if (!session.endedAt) session.endedAt = new Date();

  const raw = await generateStructured({
    prompt: buildReportPrompt(session),
    responseSchema: reportSchema,
    model: MODEL,
    temperature: 0.4,
    maxOutputTokens: 1500,
  });

  const radar = raw.radar || {};
  session.report = {
    overallScore: clampScore(raw.overallScore ?? session.liveScore()),
    meta: raw.meta || '',
    radar: {
      labels: Array.isArray(radar.labels) ? radar.labels.slice(0, 8) : [],
      you: Array.isArray(radar.you) ? radar.you.slice(0, 8).map(clampScore) : [],
      target: Array.isArray(radar.target) ? radar.target.slice(0, 8).map(clampScore) : [],
    },
    strengths: (raw.strengths || []).slice(0, 6),
    growth: (raw.growth || []).slice(0, 6),
    nextSteps: (raw.nextSteps || []).slice(0, 3).map((n) => ({
      icon: n.icon || '📌',
      title: n.title || '',
      body: n.body || '',
    })),
  };
  session.state = 'ended';

  await session.save();
  return session;
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}
