import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import {
  fetchPrepPlan,
  regeneratePrepPlan,
  toggleTask,
} from '../store/slices/prepSlice.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Options for the configure panel.
const ROLE_OPTIONS = [
  { id: 'SDE / Full-Stack', title: 'SDE / Full-Stack', body: 'General software engineering' },
  { id: 'Frontend Engineer', title: 'Frontend', body: 'React, UI, performance' },
  { id: 'Backend Engineer', title: 'Backend', body: 'APIs, databases, scaling' },
  { id: 'Data / ML Engineer', title: 'Data / ML', body: 'Analytics, models, stats' },
];

const EXPERIENCE_OPTIONS = [
  { id: 'fresher', title: 'Fresher', body: '0–1 years' },
  { id: 'early', title: 'Early', body: '1–3 years' },
  { id: 'mid', title: 'Mid-level', body: '3–6 years' },
  { id: 'senior', title: 'Senior', body: '6+ years' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', title: 'Easy', body: 'Warm-up, build confidence' },
  { id: 'medium', title: 'Medium', body: 'Realistic placement prep' },
  { id: 'hard', title: 'Hard', body: 'Senior-level pressure' },
];

// Days-until presets for the interview horizon. `days` is used to compute the
// ISO date we send to the backend. `null` means "no fixed date".
const HORIZON_OPTIONS = [
  { id: '3', days: 3, title: '3 days', body: 'Sprint — essentials only' },
  { id: '7', days: 7, title: '1 week', body: 'Focused 7-day push' },
  { id: '14', days: 14, title: '2 weeks', body: 'Balanced, covers weak spots' },
  { id: '30', days: 30, title: '1 month', body: 'Deep prep, everything' },
  { id: 'flex', days: null, title: 'Flexible', body: 'No date yet — steady practice' },
];

function formatDayCard(startDate, dayOffset) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  const labelIdx = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  return { label: DAY_LABELS[labelIdx], num: d.getDate() };
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function isoDateFromDate(d) {
  if (!d) return '';
  const v = new Date(d);
  if (Number.isNaN(v.getTime())) return '';
  return v.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Snaps an existing interviewDate back to the nearest preset so the form
// reflects what the plan was generated with.
function horizonIdFromDate(dateLike) {
  if (!dateLike) return 'flex';
  const ms = new Date(dateLike).getTime();
  if (Number.isNaN(ms)) return 'flex';
  const days = Math.round((ms - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 4) return '3';
  if (days <= 10) return '7';
  if (days <= 21) return '14';
  return '30';
}

// Converts a preset id back into an ISO date (or null for "flex").
function isoFromHorizon(id) {
  const option = HORIZON_OPTIONS.find((o) => o.id === id);
  if (!option || option.days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + option.days);
  return isoDateFromDate(d);
}

function LoadingState({ message }) {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <div
        className="mono"
        style={{ color: 'var(--lime)', letterSpacing: '0.15em', fontSize: 12, marginBottom: 12 }}
      >
        GEMINI · PLANNING
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>
        {message}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Takes 5–12 seconds.</p>
    </div>
  );
}

// Reusable selector grid — same visual language as InterviewSetup.
function OptionGrid({ options, value, onSelect, disabled }) {
  return (
    <div className="option-grid">
      {options.map((o) => (
        <div
          key={o.id}
          className={`option-card${value === o.id ? ' selected' : ''}`}
          style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          onClick={() => onSelect(o.id)}
        >
          <h5>{o.title}</h5>
          <p>{o.body}</p>
        </div>
      ))}
    </div>
  );
}

function ConfigurePanel({ plan, regenerating, onSubmit, onCancel }) {
  // Seed form state from the existing plan so tweaking one field doesn't wipe
  // the others.
  const [form, setForm] = useState(() => ({
    targetRole: plan?.targetRole || 'SDE / Full-Stack',
    experience: plan?.experience || 'fresher',
    difficulty: plan?.difficulty || 'medium',
    horizon: horizonIdFromDate(plan?.interviewDate),
  }));

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      targetRole: form.targetRole,
      experience: form.experience,
      difficulty: form.difficulty,
      interviewDate: isoFromHorizon(form.horizon),
    });
  };

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ marginTop: 24, padding: 32 }}
    >
      <div className="card-head" style={{ marginBottom: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic' }}>
          Configure your <em style={{ color: 'var(--lime)' }}>plan</em>
        </h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={regenerating}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 24 }}>
        Tell the AI who you are and what you're prepping for — it will tailor difficulty,
        topic mix, and task depth accordingly.
      </p>

      <div className="setup-grid" style={{ marginTop: 16 }}>
        <div className="setup-group">
          <h4><em>Role</em></h4>
          <OptionGrid
            options={ROLE_OPTIONS}
            value={form.targetRole}
            onSelect={set('targetRole')}
            disabled={regenerating}
          />
        </div>
        <div className="setup-group">
          <h4><em>Experience</em></h4>
          <OptionGrid
            options={EXPERIENCE_OPTIONS}
            value={form.experience}
            onSelect={set('experience')}
            disabled={regenerating}
          />
        </div>
        <div className="setup-group">
          <h4><em>Difficulty</em></h4>
          <OptionGrid
            options={DIFFICULTY_OPTIONS}
            value={form.difficulty}
            onSelect={set('difficulty')}
            disabled={regenerating}
          />
        </div>
        <div className="setup-group">
          <h4><em>Time horizon</em></h4>
          <OptionGrid
            options={HORIZON_OPTIONS}
            value={form.horizon}
            onSelect={set('horizon')}
            disabled={regenerating}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Shorter horizons pack the first few days with essentials; longer ones
            space things out.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          alignItems: 'center',
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={regenerating}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={regenerating}>
          {regenerating ? 'Generating…' : 'Generate plan →'}
        </button>
      </div>
    </form>
  );
}

function formatExperience(id) {
  return EXPERIENCE_OPTIONS.find((o) => o.id === id)?.title || id;
}

function formatDifficulty(id) {
  return DIFFICULTY_OPTIONS.find((o) => o.id === id)?.title || id;
}

function formatInterviewDate(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const diffDays = Math.round((d - Date.now()) / (1000 * 60 * 60 * 24));
  const human = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (diffDays < 0) return `${human} (past)`;
  if (diffDays === 0) return `${human} (today)`;
  return `${human} (in ${diffDays} day${diffDays === 1 ? '' : 's'})`;
}

export default function PrepPlan() {
  const dispatch = useDispatch();
  const { plan, loading, regenerating, error } = useSelector((s) => s.prep);
  const [selectedDay, setSelectedDay] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!plan && !loading) dispatch(fetchPrepPlan());
  }, [dispatch, plan, loading]);

  useEffect(() => {
    if (!plan || selectedDay !== null) return;
    const idx = plan.todayIndex < 0 ? 0 : Math.min(6, plan.todayIndex);
    setSelectedDay(idx);
  }, [plan, selectedDay]);

  const dayCards = useMemo(
    () => (plan ? Array.from({ length: 7 }, (_, i) => formatDayCard(plan.startDate, i)) : []),
    [plan]
  );

  if ((loading || regenerating) && !plan) {
    return (
      <>
        <TopBar searchPlaceholder="Search…" />
        <LoadingState message={regenerating ? 'Regenerating with your new config…' : 'Building your 7-day plan…'} />
      </>
    );
  }

  if (error && !plan) {
    return (
      <>
        <TopBar searchPlaceholder="Search…" />
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 12 }}>
            Couldn&apos;t load your plan
          </div>
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 24 }}>{error.message}</p>
          <button className="btn btn-primary" onClick={() => dispatch(fetchPrepPlan())}>
            Retry
          </button>
        </div>
      </>
    );
  }

  if (!plan) return null;

  const currentDay = selectedDay ?? 0;
  const tasksForDay = plan.tasks.filter((t) => t.day === currentDay);
  const doneForDay = tasksForDay.filter((t) => t.done).length;

  const dayStatus = (i) => {
    if (i === plan.todayIndex) return 'today';
    if (plan.todayIndex >= 0 && i < plan.todayIndex) return 'done';
    return 'upcoming';
  };

  const onConfigSubmit = async (payload) => {
    const result = await dispatch(regeneratePrepPlan(payload));
    if (regeneratePrepPlan.fulfilled.match(result)) setConfigOpen(false);
  };

  const interviewLabel = formatInterviewDate(plan.interviewDate);

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="prep-wrap">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 className="page-title">Your <em>7-day</em> prep plan.</h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="pill pill-lime">{plan.targetRole}</span>
              <span className="pill">{formatExperience(plan.experience)}</span>
              <span className="pill">{formatDifficulty(plan.difficulty)} difficulty</span>
              {interviewLabel && <span className="pill pill-cream">Interview: {interviewLabel}</span>}
            </div>
            {plan.weakTopicsSnapshot?.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
                Focus on weak areas: {plan.weakTopicsSnapshot.join(', ')}
              </p>
            )}
          </div>
          <button
            className="btn btn-ghost"
            disabled={regenerating}
            onClick={() => setConfigOpen((o) => !o)}
          >
            {configOpen ? 'Close config' : '↻ Configure & regenerate'}
          </button>
        </div>

        {configOpen && (
          <ConfigurePanel
            plan={plan}
            regenerating={regenerating}
            onSubmit={onConfigSubmit}
            onCancel={() => setConfigOpen(false)}
          />
        )}

        <div className="day-track" style={{ marginTop: 32 }}>
          {dayCards.map((d, i) => {
            const status = dayStatus(i);
            const isSelected = i === currentDay;
            const tasksOnDay = plan.tasks.filter((t) => t.day === i);
            const doneOnDay = tasksOnDay.filter((t) => t.done).length;
            return (
              <div
                key={i}
                className={`day-card${status === 'today' ? ' today' : ''}${status === 'done' ? ' done' : ''}`}
                onClick={() => setSelectedDay(i)}
                style={{
                  outline: isSelected && status !== 'today' ? '1px solid var(--lime)' : undefined,
                  outlineOffset: isSelected && status !== 'today' ? 2 : undefined,
                }}
              >
                <div className="day-label">{d.label}</div>
                <div className="day-num">{d.num}</div>
                <div className="day-status">
                  {tasksOnDay.length > 0 ? `${doneOnDay}/${tasksOnDay.length} done` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-head">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic' }}>
            {currentDay === plan.todayIndex ? (
              <><em>Today&apos;s</em> tasks</>
            ) : (
              <>Day {currentDay + 1} tasks</>
            )}{' '}
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              · {doneForDay} of {tasksForDay.length} complete
            </span>
          </h3>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error.message}</p>
        )}

        <div className="task-list">
          {tasksForDay.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
              Nothing scheduled for this day.
            </p>
          )}
          {tasksForDay.map((t) => (
            <div
              key={t.id}
              className={`task-item${t.done ? ' done' : ''}`}
              onClick={() => dispatch(toggleTask(t.id))}
            >
              <div className={`task-check${t.done ? ' done' : ''}`}>{t.done ? '✓' : ''}</div>
              <div className="task-body">
                <h5>{t.title}</h5>
                {t.body && <p>{t.body}</p>}
                {t.refUrl && (
                  <a
                    href={t.refUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                      fontSize: 12,
                      color: 'var(--lime)',
                      marginTop: 6,
                      textDecoration: 'none',
                    }}
                  >
                    ↗ {hostFromUrl(t.refUrl)}
                  </a>
                )}
              </div>
              <span className={t.priority ? 'pill pill-lime' : 'pill'}>
                {t.category}
                {t.duration ? ` · ${t.duration}` : ''}
                {t.priority ? ' · High' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
