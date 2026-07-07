import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { QuestionBookmark } from '../models/QuestionBookmark.js';

const HEATMAP_DAYS = 84;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_LIMIT = 8;

function startOfDay(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(d = new Date()) {
  const monday = startOfDay(d);
  const day = (monday.getDay() + 6) % 7; // Mon=0
  monday.setDate(monday.getDate() - day);
  return monday;
}

function dayKey(d) {
  return startOfDay(d).getTime();
}

/**
 * Pulls raw "events" from every collection we care about. Each event carries
 * a timestamp so downstream aggregations (streak, heatmap, activity feed) can
 * all operate on one unified list.
 */
async function collectEvents(userId, since) {
  const [resumes, analyses, sessions, bookmarks] = await Promise.all([
    Resume.find({ userId, createdAt: { $gte: since } })
      .select('_id originalName createdAt')
      .lean(),
    ResumeAnalysis.find({ userId, updatedAt: { $gte: since } })
      .select('_id resumeId overallScore updatedAt')
      .lean(),
    InterviewSession.find({ userId, updatedAt: { $gte: since } })
      .select('_id setup state questionsCovered questionsTarget startedAt endedAt report updatedAt')
      .lean(),
    QuestionBookmark.find({ userId, createdAt: { $gte: since } })
      .populate({ path: 'questionId', select: 'title' })
      .select('_id questionId createdAt')
      .lean(),
  ]);

  const events = [];

  for (const r of resumes) {
    events.push({
      kind: 'resume_uploaded',
      at: r.createdAt,
      title: `Uploaded resume — ${truncate(r.originalName, 40)}`,
      score: null,
    });
  }

  for (const a of analyses) {
    events.push({
      kind: 'resume_analyzed',
      at: a.updatedAt,
      title: 'Resume analyzed',
      score: `${a.overallScore}/100`,
    });
  }

  for (const s of sessions) {
    if (s.state === 'ended' && s.endedAt) {
      const overall = s.report?.overallScore;
      events.push({
        kind: 'mock_completed',
        at: s.endedAt,
        title: `Completed mock — ${prettyRound(s.setup.round)} · ${prettyDifficulty(s.setup.difficulty)}`,
        score: overall != null ? `${overall}/10` : null,
      });
    }
  }

  for (const b of bookmarks) {
    events.push({
      kind: 'question_bookmarked',
      at: b.createdAt,
      title: `Bookmarked — ${truncate(stripAsterisks(b.questionId?.title || 'question'), 50)}`,
      score: null,
    });
  }

  events.sort((a, b) => b.at - a.at);
  return events;
}

/**
 * Walks the last 60 days looking for consecutive-day activity. Grace: if
 * today has no activity yet, the streak still counts if yesterday does.
 */
function computeStreak(events) {
  const days = new Set(events.map((e) => dayKey(e.at)));
  const today = startOfDay(new Date()).getTime();
  let cursor = today;
  // Skip today if empty — user may visit before doing anything.
  if (!days.has(cursor)) cursor -= MS_PER_DAY;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= MS_PER_DAY;
  }
  return streak;
}

/**
 * 84 cells, oldest → newest. Each cell is a 0-4 intensity based on how many
 * events happened that day, so the UI can map directly to the existing
 * heatmap-cell CSS levels.
 */
function buildHeatmap(events) {
  const counts = new Map();
  for (const e of events) {
    const k = dayKey(e.at);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const cells = [];
  const today = startOfDay(new Date()).getTime();
  for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset--) {
    const day = today - offset * MS_PER_DAY;
    const c = counts.get(day) || 0;
    cells.push({ date: new Date(day).toISOString(), level: intensityLevel(c) });
  }
  return cells;
}

function intensityLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

/**
 * Derives weak topics from the user's recent ended sessions' radar scores.
 * For each radar axis, averages the user's score across sessions and reports
 * the lowest. Returns percentages (0-100) + a color keyword the UI knows.
 */
function computeWeakTopics(sessions, limit = 4) {
  const totals = new Map(); // label -> { sum, count }
  for (const s of sessions) {
    if (s.state !== 'ended' || !s.report) continue;
    const labels = s.report.radar?.labels || [];
    const you = s.report.radar?.you || [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const score = Number(you[i]);
      if (!label || !Number.isFinite(score)) continue;
      const entry = totals.get(label) || { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      totals.set(label, entry);
    }
  }

  const items = [];
  for (const [name, { sum, count }] of totals.entries()) {
    const avg = sum / count; // 0-10
    const pct = Math.round(avg * 10);
    items.push({ name, pct, color: levelFromPct(pct) });
  }
  items.sort((a, b) => a.pct - b.pct);
  return items.slice(0, limit);
}

function levelFromPct(pct) {
  if (pct < 50) return 'danger';
  if (pct < 70) return 'warning';
  return 'success';
}

/**
 * Picks three recommendations based on concrete state (not AI — keeps this
 * cheap and deterministic). Falls through in priority order.
 */
function buildRecommendations({ hasResume, latestAnalysisScore, endedSessions, weakTopics }) {
  const recs = [];

  if (!hasResume) {
    recs.push({
      icon: '📄',
      title: 'Upload your resume to get started',
      body: 'AI will score it on 5 dimensions and call out concrete fixes in under 10 seconds.',
    });
  } else if (latestAnalysisScore != null && latestAnalysisScore < 75) {
    recs.push({
      icon: '📝',
      title: 'Polish your resume — current score is below 75',
      body: 'Re-analyze after applying the top 2 suggestions to push past 80.',
    });
  }

  if (endedSessions === 0) {
    recs.push({
      icon: '🎙️',
      title: 'Run your first mock interview',
      body: 'Our AI interviewer adapts to your level and gives per-answer feedback.',
    });
  }

  if (weakTopics.length > 0) {
    const weakest = weakTopics[0];
    recs.push({
      icon: '🎯',
      title: `Shore up your weakest area: ${weakest.name}`,
      body: `You're averaging ${weakest.pct}% there. Target it directly in your next mock.`,
    });
  }

  // Always end with a generic "keep going" if we have fewer than 3.
  if (recs.length < 3) {
    recs.push({
      icon: '⚡',
      title: 'Match your resume to a real job description',
      body: 'Paste any JD to see which skills you already hit and which gaps to close.',
    });
  }

  return recs.slice(0, 3);
}

// ─── Public API ──────────────────────────────────────────────────────

export async function buildDashboard(userId) {
  const earliest = new Date(Date.now() - HEATMAP_DAYS * MS_PER_DAY);

  const [events, latestTwoAnalyses, endedSessionsList, bookmarkCount, resumeCount] =
    await Promise.all([
      collectEvents(userId, earliest),
      ResumeAnalysis.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(2)
        .select('overallScore updatedAt')
        .lean(),
      InterviewSession.find({ userId, state: 'ended' })
        .sort({ endedAt: -1 })
        .select('setup state report endedAt questionsCovered questionsTarget')
        .lean(),
      QuestionBookmark.countDocuments({ userId }),
      Resume.countDocuments({ userId }),
    ]);

  const [latestAnalysis, priorAnalysis] = latestTwoAnalyses;

  // ── Resume stats
  const resumeScore = latestAnalysis?.overallScore ?? 0;
  const resumeDelta =
    latestAnalysis && priorAnalysis
      ? latestAnalysis.overallScore - priorAnalysis.overallScore
      : 0;

  // ── Mock interview stats
  const mockInterviews = endedSessionsList.length;
  const weekStart = startOfWeek();
  const mockInterviewsWeek = endedSessionsList.filter((s) => s.endedAt >= weekStart).length;

  // ── Questions practiced (interview turns + bookmarks, de-inflated)
  const totalQuestionTurns = endedSessionsList.reduce(
    (acc, s) => acc + (s.questionsCovered || 0),
    0
  );
  const questionsPracticed = totalQuestionTurns + bookmarkCount;
  const weekTurns = endedSessionsList
    .filter((s) => s.endedAt >= weekStart)
    .reduce((acc, s) => acc + (s.questionsCovered || 0), 0);
  const weekBookmarks = events.filter(
    (e) => e.kind === 'question_bookmarked' && e.at >= weekStart
  ).length;
  const questionsWeek = weekTurns + weekBookmarks;

  // ── Avg performance + weekly delta
  const scores = endedSessionsList
    .map((s) => s.report?.overallScore)
    .filter((x) => typeof x === 'number');
  const avgPerformance = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  const thisWeekScores = endedSessionsList
    .filter((s) => s.endedAt >= weekStart)
    .map((s) => s.report?.overallScore)
    .filter((x) => typeof x === 'number');
  const priorScores = scores.slice(thisWeekScores.length); // oldest first after slice
  const avgDelta =
    thisWeekScores.length && priorScores.length
      ? Math.round(
          (thisWeekScores.reduce((a, b) => a + b, 0) / thisWeekScores.length -
            priorScores.reduce((a, b) => a + b, 0) / priorScores.length) *
            10
        ) / 10
      : 0;

  // ── Streak + heatmap from events
  const streak = computeStreak(events);
  const heatmap = buildHeatmap(events);

  // ── Weak topics (from ended sessions)
  const weakTopics = computeWeakTopics(endedSessionsList);

  // ── Activity feed (latest N)
  const activity = events.slice(0, ACTIVITY_LIMIT).map((e, i) => ({
    id: `${e.kind}-${i}-${e.at.getTime()}`,
    title: e.title,
    meta: timeAgo(e.at),
    score: e.score,
  }));

  const recommendations = buildRecommendations({
    hasResume: resumeCount > 0,
    latestAnalysisScore: latestAnalysis?.overallScore ?? null,
    endedSessions: endedSessionsList.length,
    weakTopics,
  });

  return {
    stats: {
      streak,
      resumeScore,
      resumeDelta,
      mockInterviews,
      mockInterviewsWeek,
      questionsPracticed,
      questionsWeek,
      avgPerformance,
      avgDelta,
    },
    recommendations,
    activity,
    weakTopics,
    heatmap,
  };
}

// ─── tiny helpers ────────────────────────────────────────────────────

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function stripAsterisks(s) {
  return (s || '').replace(/\*/g, '');
}

function prettyRound(r) {
  return { dsa: 'DSA', technical: 'Technical', system: 'System Design', behavioral: 'Behavioral' }[r] || r;
}

function prettyDifficulty(d) {
  return { easy: 'Easy', medium: 'Medium', hard: 'Hard', adaptive: 'Adaptive' }[d] || d;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}
