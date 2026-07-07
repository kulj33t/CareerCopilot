import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import {
  abandonCurrentSession,
  clearInterviewError,
  loadActiveSession,
  setSetupField,
  startSession,
} from '../store/slices/interviewSlice.js';

const modes = [
  { id: 'text', icon: '💬', title: 'Text', body: 'Type your answers. Best for DSA and coding.', pill: 'Most accurate', pillStyle: '' },
  { id: 'voice', icon: '🎙️', title: 'Voice', body: 'Speak out loud. Get filler-word and pacing analysis.', pill: 'Recommended', pillStyle: 'pill-lime' },
  { id: 'video', icon: '📹', title: 'Video', body: 'Full video simulation with posture analysis.', pill: 'Coming v2', pillStyle: 'pill-cream', disabled: true },
];

const roles = [
  { id: 'sde', title: 'SDE / Full-Stack', body: 'General software engineering' },
  { id: 'frontend', title: 'Frontend', body: 'React, UI, performance' },
  { id: 'backend', title: 'Backend', body: 'APIs, databases, scaling' },
  { id: 'data', title: 'Data / ML', body: 'Analytics, models, stats' },
];

const rounds = [
  { id: 'dsa', title: 'DSA', body: 'Coding & algorithms' },
  { id: 'technical', title: 'Technical', body: 'Concepts & fundamentals' },
  { id: 'system', title: 'System Design', body: 'Architecture & scale' },
  { id: 'behavioral', title: 'Behavioral', body: 'Stories & soft skills' },
];

const levels = [
  { id: 'fresher', title: 'Fresher', body: '0–1 years' },
  { id: 'early', title: 'Early career', body: '1–3 years' },
  { id: 'mid', title: 'Mid-level', body: '3–6 years' },
  { id: 'senior', title: 'Senior', body: '6+ years' },
];

const difficulties = [
  { id: 'easy', title: 'Easy', body: 'Warm-up, confidence' },
  { id: 'medium', title: 'Medium', body: 'Realistic & adaptive' },
  { id: 'hard', title: 'Hard', body: 'Senior-level pressure' },
  { id: 'adaptive', title: 'Adaptive', body: 'AI adjusts live' },
];

function OptionGrid({ options, value, onSelect }) {
  return (
    <div className="option-grid">
      {options.map((o) => (
        <div
          key={o.id}
          className={`option-card${value === o.id ? ' selected' : ''}`}
          onClick={() => onSelect(o.id)}
        >
          <h5>{o.title}</h5>
          <p>{o.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function InterviewSetup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setup, session, starting, loading, error } = useSelector((s) => s.interview);
  const [abandoning, setAbandoning] = useState(false);

  // Don't auto-bounce — give the user a choice. They might have closed a tab
  // mid-interview and want a clean slate rather than being trapped resuming.
  useEffect(() => {
    dispatch(loadActiveSession());
  }, [dispatch]);

  const hasActiveSession = session && session.state === 'active';

  const set = (field) => (value) => {
    dispatch(setSetupField({ field, value }));
    if (error) dispatch(clearInterviewError());
  };

  const onStart = async () => {
    const result = await dispatch(startSession(setup));
    if (startSession.fulfilled.match(result)) navigate('/interview/chat');
  };

  const onResume = () => navigate('/interview/chat');

  const onDiscardAndStartNew = async () => {
    if (!session) return;
    if (!window.confirm('Discard the in-progress interview? Nothing will be saved.')) return;
    setAbandoning(true);
    const r = await dispatch(abandonCurrentSession(session.id));
    setAbandoning(false);
    if (!abandonCurrentSession.fulfilled.match(r)) return;
    // Reload active-session state so downstream reads are clean.
    dispatch(loadActiveSession());
  };

  const summary = `${modes.find((m) => m.id === setup.mode)?.title} mode · ${
    roles.find((r) => r.id === setup.role)?.title
  } · ${rounds.find((r) => r.id === setup.round)?.title} · ${
    levels.find((l) => l.id === setup.level)?.title
  } · ${difficulties.find((d) => d.id === setup.difficulty)?.title}`;

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="setup-wrap">
        <h1 className="page-title">Start a <em>mock interview.</em></h1>
        <p className="page-subtitle">
          Configure your session. The AI interviewer will adapt in real time to your answer quality.
        </p>

        {hasActiveSession && (
          <div
            style={{
              marginTop: 24,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(250, 82, 15, 0.06)',
              border: '1px solid var(--lime-dim)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic' }}>
                You have an <em style={{ color: 'var(--lime)' }}>interview in progress</em>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                {session.questionsCovered}/{session.questionsTarget} questions covered · started{' '}
                {new Date(session.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onDiscardAndStartNew}
                disabled={abandoning}
              >
                {abandoning ? 'Discarding…' : 'Discard & start new'}
              </button>
              <button type="button" className="btn btn-primary" onClick={onResume}>
                Resume →
              </button>
            </div>
          </div>
        )}

        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', margin: '40px 0 20px' }}>
          Choose a <em style={{ color: 'var(--lime)' }}>mode</em>
        </h4>
        <div className="mode-grid">
          {modes.map((m) => (
            <div
              key={m.id}
              className={`mode-card${setup.mode === m.id ? ' selected' : ''}`}
              style={m.disabled ? { opacity: 0.5 } : undefined}
              onClick={() => !m.disabled && set('mode')(m.id)}
            >
              <div className="mode-icon">{m.icon}</div>
              <h4>{m.title}</h4>
              <p>{m.body}</p>
              <div className={`pill ${m.pillStyle}`.trim()}>{m.pill}</div>
            </div>
          ))}
        </div>

        <div className="setup-grid">
          <div className="setup-group">
            <h4><em>Role</em></h4>
            <OptionGrid options={roles} value={setup.role} onSelect={set('role')} />
          </div>
          <div className="setup-group">
            <h4><em>Round type</em></h4>
            <OptionGrid options={rounds} value={setup.round} onSelect={set('round')} />
          </div>
          <div className="setup-group">
            <h4><em>Experience level</em></h4>
            <OptionGrid options={levels} value={setup.level} onSelect={set('level')} />
          </div>
          <div className="setup-group">
            <h4><em>Difficulty</em></h4>
            <OptionGrid options={difficulties} value={setup.difficulty} onSelect={set('difficulty')} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 48,
            paddingTop: 32,
            borderTop: '1px solid var(--border)',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Session will be ~30 minutes</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{summary}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {error && (
              <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error.message}</span>
            )}
            <button
              className="btn btn-primary btn-lg"
              onClick={onStart}
              disabled={starting || loading || hasActiveSession}
              title={
                hasActiveSession
                  ? 'Resume or discard the existing session above first'
                  : undefined
              }
            >
              {starting ? 'Starting…' : 'Start interview →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
