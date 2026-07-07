import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import {
  endCurrentSession,
  loadActiveSession,
  optimisticUserMessage,
  sendAnswer,
  setDraft,
} from '../store/slices/interviewSlice.js';
import { useVoiceMode } from '../hooks/useVoiceMode.js';

const ROUND_LABEL = {
  dsa: 'DSA',
  technical: 'Technical',
  system: 'System Design',
  behavioral: 'Behavioral',
};
const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', adaptive: 'Adaptive' };
const ROLE_LABEL = { sde: 'SDE', frontend: 'Frontend', backend: 'Backend', data: 'Data / ML' };
const LEVEL_LABEL = { fresher: 'Fresher', early: 'Early', mid: 'Mid', senior: 'Senior' };

function formatElapsed(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Cheap way to re-render once per second so the elapsed-timer ticks.
function useTick(everyMs) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
}

function initialsOf(name) {
  return (
    (name || '')
      .split(/\s+/)
      .map((p) => p[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════
export default function InterviewChat() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { session, draftMessage, aiTyping, ending, error } = useSelector((s) => s.interview);
  const userInitials = useSelector((s) => initialsOf(s.auth.user?.name || ''));
  useTick(1000);

  const voiceMode = session?.setup?.mode === 'voice';
  const [muted, setMuted] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(false);
  // Mid-session the user can drop back to text if voice is giving them grief.
  const [forceText, setForceText] = useState(false);
  // The last transcript that actually got committed to the backend. We flash
  // this in the UI for a couple of seconds so the user can verify what was
  // heard — critical feedback when recognition is imperfect.
  const [lastHeard, setLastHeard] = useState('');
  const lastHeardTimerRef = useRef(null);

  const voice = useVoiceMode({
    muted,
    // 1800ms silence is forgiving enough for natural pauses while still
    // feeling responsive. The user can bypass the wait entirely with the
    // "Done" button during listening.
    silenceThresholdMs: voiceMode && !forceText ? 1800 : 0,
    onTranscript: (text) => {
      if (!session || aiTyping) return;
      setLastHeard(text);
      clearTimeout(lastHeardTimerRef.current);
      lastHeardTimerRef.current = setTimeout(() => setLastHeard(''), 3500);
      dispatch(optimisticUserMessage(text));
      dispatch(sendAnswer({ sessionId: session.id, text }));
    },
  });

  // On reload, pick up the active session.
  useEffect(() => {
    if (!session) dispatch(loadActiveSession());
  }, [dispatch, session]);

  // Navigate to the report when the session ends (from this tab or another).
  useEffect(() => {
    if (session && session.state === 'ended') navigate('/interview/report');
  }, [session, navigate]);

  // Auto-speak newly-arrived AI messages. Gated on:
  //  - voice mode active + user pressed Begin
  //  - voices loaded (so we use the Natural voice, not the robotic default)
  //  - not paused/forced-text
  const lastSpokenIdRef = useRef(null);
  useEffect(() => {
    if (!voiceMode || forceText || !voiceStarted || !session) return;
    if (!voice.voicesReady) return; // wait so the right voice gets used
    const msgs = session.messages;
    if (msgs.length === 0) return;
    const latest = msgs[msgs.length - 1];
    if (latest.role !== 'ai') return;
    if (latest.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = latest.id;
    if (muted) {
      if (!voicePaused) voice.start();
      return;
    }
    voice.speak(latest.html, {
      onEnd: () => {
        // Tiny buffer so speaker reverb / OS TTS tail doesn't bleed into
        // the recognition stream as the mic opens.
        setTimeout(() => {
          if (!voicePaused && !forceText) voice.start();
        }, 350);
      },
    });
  }, [voiceMode, forceText, voiceStarted, session, muted, voicePaused, voice]);

  // Stop listening the moment a network turn is in flight.
  useEffect(() => {
    if (!voiceMode || forceText) return;
    if (aiTyping && voice.listening) voice.cancel();
  }, [voiceMode, forceText, aiTyping, voice]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      voice.cancel();
      voice.cancelSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <>
        <TopBar searchPlaceholder="Search…" />
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 12 }}>
            No active interview
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Head over to setup to start a new one.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/interview/setup')}>
            Go to setup →
          </button>
        </div>
      </>
    );
  }

  const submitText = (e) => {
    e.preventDefault();
    const text = draftMessage.trim();
    if (!text || aiTyping) return;
    dispatch(optimisticUserMessage(text));
    dispatch(sendAnswer({ sessionId: session.id, text }));
  };

  const onEnd = async () => {
    if (ending || aiTyping) return;
    if (!window.confirm('End this interview and generate your report?')) return;
    voice.cancel();
    voice.cancelSpeaking();
    const result = await dispatch(endCurrentSession(session.id));
    if (endCurrentSession.fulfilled.match(result)) navigate('/interview/report');
  };

  const onBegin = () => {
    // Prime TTS during the user gesture — unlocks Chromium's autoplay policy.
    voice.prime();
    setVoiceStarted(true);
  };

  // Voice mode before user clicks "Begin"
  if (voiceMode && !forceText && !voiceStarted) {
    return (
      <BeginOverlay
        session={session}
        onBegin={onBegin}
        onSwitchToText={() => setForceText(true)}
        supported={voice.supported}
      />
    );
  }

  // Voice mode, active
  if (voiceMode && !forceText) {
    return (
      <VoiceInterviewLayout
        session={session}
        voice={voice}
        aiTyping={aiTyping}
        ending={ending}
        error={error}
        muted={muted}
        voicePaused={voicePaused}
        userInitials={userInitials}
        lastHeard={lastHeard}
        onToggleMute={() => {
          setMuted((m) => !m);
          voice.cancelSpeaking();
        }}
        onTogglePause={() => {
          setVoicePaused((p) => {
            const next = !p;
            if (next) {
              voice.cancel();
              voice.cancelSpeaking();
            } else if (!aiTyping && !voice.speaking) {
              voice.start();
            }
            return next;
          });
        }}
        // Manual commit — bypass the 1.8s silence wait when the user knows
        // they're done.
        onDoneSpeaking={() => {
          if (voice.listening) voice.stop();
        }}
        onEnd={onEnd}
        onSwitchToText={() => {
          voice.cancel();
          voice.cancelSpeaking();
          setForceText(true);
        }}
      />
    );
  }

  // Text mode (also the fallback path when voice is disabled mid-session)
  return (
    <TextInterviewLayout
      session={session}
      aiTyping={aiTyping}
      ending={ending}
      error={error}
      draftMessage={draftMessage}
      onChangeDraft={(v) => dispatch(setDraft(v))}
      onSubmitText={submitText}
      onEnd={onEnd}
      userInitials={userInitials}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// Begin-interview overlay (voice-mode only, first visit)
// ═══════════════════════════════════════════════════════════════════
function BeginOverlay({ session, onBegin, onSwitchToText, supported }) {
  const { role, round, level, difficulty } = session.setup;
  const summary = [
    ROLE_LABEL[role] || role,
    ROUND_LABEL[round] || round,
    LEVEL_LABEL[level] || level,
    DIFF_LABEL[difficulty] || difficulty,
    'Voice mode',
  ].join(' · ');

  return (
    <>
      <TopBar searchPlaceholder="Search…" />
      <div
        style={{
          minHeight: 'calc(100vh - 77px)',
          display: 'grid',
          placeItems: 'center',
          padding: 32,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'var(--bg-elev-1)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '48px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 0%, var(--lime-glow), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              className="voice-orb idle"
              style={{ width: 120, height: 120, margin: '0 auto 24px' }}
            >
              <span style={{ fontSize: 42 }}>🎙️</span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                marginBottom: 12,
              }}
            >
              Your mock <em style={{ color: 'var(--lime)' }}>interview</em> is ready
            </h1>
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: 'var(--text-dim)',
                marginBottom: 24,
              }}
            >
              {summary}
            </div>

            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                textAlign: 'left',
                display: 'grid',
                gap: 10,
                marginBottom: 32,
                maxWidth: 420,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <Step n="1" title="Allow microphone access" body="Your browser will ask once — grant it so the interview can hear you." />
              <Step n="2" title="Just talk naturally" body="Answers auto-submit after you pause for about a second — no button needed." />
              <Step n="3" title="Pause any time" body="Use the Pause button if you need a breath, or End whenever you're done." />
            </ol>

            {!supported ? (
              <>
                <p style={{ color: 'var(--warning)', fontSize: 13, marginBottom: 16 }}>
                  Your browser doesn&apos;t support the Web Speech API. Use Chrome, Edge, or Safari
                  for voice — or continue with text below.
                </p>
                <button className="btn btn-primary btn-lg" onClick={onSwitchToText}>
                  Continue with text →
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={onBegin}
                  style={{ minWidth: 240, padding: '16px 28px', fontSize: 16 }}
                >
                  Begin interview →
                </button>
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={onSwitchToText}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Or take this interview in text mode
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, body }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--bg-elev-2)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="mono"
        style={{
          width: 28,
          height: 28,
          borderRadius: 50,
          background: 'var(--bg-elev-3)',
          color: 'var(--lime)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{body}</div>
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Active voice interview layout
// ═══════════════════════════════════════════════════════════════════
function VoiceInterviewLayout({
  session,
  voice,
  aiTyping,
  ending,
  error,
  muted,
  voicePaused,
  userInitials,
  lastHeard,
  onToggleMute,
  onTogglePause,
  onDoneSpeaking,
  onEnd,
  onSwitchToText,
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  // Resolve which orb state we're in — drives colors, animations, labels.
  let orbState = 'idle';
  let statusLabel = 'Ready';
  if (voicePaused) {
    orbState = 'paused';
    statusLabel = 'Paused · tap resume when you\'re ready';
  } else if (voice.speaking) {
    orbState = 'speaking';
    statusLabel = 'Interviewer is speaking…';
  } else if (aiTyping) {
    orbState = 'thinking';
    statusLabel = 'Thinking…';
  } else if (voice.listening) {
    orbState = 'listening';
    statusLabel = 'Your turn — start speaking';
  } else {
    orbState = 'idle';
    statusLabel = 'Starting…';
  }

  const headerMeta = `${ROLE_LABEL[session.setup.role] || session.setup.role} · ${
    ROUND_LABEL[session.setup.round] || session.setup.round
  } · ${DIFF_LABEL[session.setup.difficulty] || session.setup.difficulty}`;

  const currentTopic =
    session.topicsCovered.find((t) => !t.done)?.name || session.topicsCovered.slice(-1)[0]?.name;

  const questionsProgress = `${session.questionsCovered}/${session.questionsTarget}`;

  return (
    <>
      <TopBar
        searchPlaceholder="Search…"
        rightContent={
          <>
            <span className="pill pill-lime">🔴 Live · {headerMeta}</span>
          </>
        }
      />

      <div
        style={{
          minHeight: 'calc(100vh - 77px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 48px 0',
          maxWidth: 900,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* ── Top bar: elapsed + topic + end ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="chat-timer">⏱ {formatElapsed(session.startedAt)}</span>
            <span className="pill">Q {questionsProgress}</span>
            {currentTopic && <span className="pill pill-cream">on: {currentTopic}</span>}
          </div>
          <button
            type="button"
            onClick={onEnd}
            disabled={ending || aiTyping || voice.speaking}
            style={{
              padding: '8px 18px',
              borderRadius: 100,
              border: '1px solid rgba(248, 113, 113, 0.4)',
              background: 'rgba(248, 113, 113, 0.08)',
              color: 'var(--danger)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              cursor: ending || aiTyping ? 'not-allowed' : 'pointer',
              opacity: ending || aiTyping ? 0.5 : 1,
            }}
          >
            {ending ? 'Ending…' : '■ End interview'}
          </button>
        </div>

        {/* ── Center stage ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 0',
            gap: 24,
            minHeight: 400,
          }}
        >
          <div className={`voice-orb ${orbState}`}>
            <span style={{ fontSize: 44, opacity: 0.9 }}>
              {orbState === 'listening' ? '🎤' : orbState === 'paused' ? '⏸' : 'C'}
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              letterSpacing: '-0.01em',
              textAlign: 'center',
              color: 'var(--text)',
              minHeight: 36,
            }}
          >
            {statusLabel}
          </div>

          {/* "I heard …" confirmation — flashes for ~3.5s right after the
              user's transcript is committed, so they can verify transcription
              quality before the AI's response arrives. */}
          {lastHeard && (
            <div
              style={{
                width: '100%',
                maxWidth: 640,
                padding: '12px 18px',
                borderRadius: 12,
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--lime-dim)',
                fontSize: 13,
                color: 'var(--text-muted)',
                textAlign: 'left',
              }}
            >
              <span
                className="mono"
                style={{ color: 'var(--lime)', fontSize: 10, letterSpacing: '0.15em', marginRight: 8 }}
              >
                HEARD
              </span>
              <span style={{ color: 'var(--text)' }}>{lastHeard}</span>
            </div>
          )}

          {/* Live transcript card. Always present when listening so it doesn't
              flicker in and out; empty state uses muted text. */}
          {(orbState === 'listening' || orbState === 'speaking' || voice.interim) && (
            <div
              style={{
                width: '100%',
                maxWidth: 640,
                padding: '16px 20px',
                borderRadius: 14,
                background: 'var(--bg-elev-1)',
                border: `1px solid ${voice.interim ? 'var(--lime-dim)' : 'var(--border)'}`,
                fontSize: 15,
                lineHeight: 1.55,
                minHeight: 72,
                color: voice.interim ? 'var(--text)' : 'var(--text-dim)',
                fontStyle: voice.interim ? 'normal' : 'italic',
                textAlign: 'center',
                transition: 'border-color 0.15s',
              }}
            >
              {orbState === 'speaking'
                ? 'The interviewer is speaking — you can listen.'
                : voice.interim
                ? voice.interim
                : 'Speak now — pauses of about 2 seconds will auto-submit your answer.'}
            </div>
          )}

          {/* Manual "I'm done" button — lets the user force commit without
              waiting for the silence timer. Only visible while listening and
              there's something worth sending. */}
          {orbState === 'listening' && voice.interim && (
            <button
              type="button"
              onClick={onDoneSpeaking}
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: 13.5 }}
            >
              ✓ Done, send my answer
            </button>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>
              {error.message}
            </p>
          )}

          {voice.error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>
              Mic: {voice.error}. Check browser permissions.
            </p>
          )}
        </div>

        {/* ── Controls ── */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={onTogglePause}
            className="btn btn-ghost"
            style={{ minWidth: 130 }}
          >
            {voicePaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="btn btn-ghost"
            style={{ minWidth: 130 }}
          >
            {muted ? '🔇 Muted' : '🔊 Audio on'}
          </button>
          <button
            type="button"
            onClick={onSwitchToText}
            className="btn btn-ghost"
            style={{ minWidth: 130 }}
          >
            ⌨ Switch to text
          </button>
        </div>

        {/* ── Transcript / history ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, paddingBottom: 40 }}>
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
              marginBottom: historyOpen ? 14 : 0,
            }}
          >
            {historyOpen ? '▼' : '▶'} Transcript ({session.messages.length} messages)
          </button>
          {historyOpen && (
            <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {session.messages.map((m) => (
                <TranscriptRow key={m.id} m={m} userInitials={userInitials} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TranscriptRow({ m, userInitials }) {
  const isAI = m.role === 'ai';
  return (
    <div className={`msg ${isAI ? 'msg-ai' : 'msg-user'}`}>
      <div className="msg-avatar">{isAI ? 'C' : userInitials}</div>
      <div>
        <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
        {m.feedback && (
          <div className="msg-feedback">
            <div className="feedback-head">
              <span>Rating: {m.feedback.rating}</span>
              <span>{m.feedback.tags}</span>
            </div>
            {m.feedback.great && (
              <p><strong>What was great:</strong> {m.feedback.great}</p>
            )}
            {m.feedback.sharper && (
              <p><strong>What could be sharper:</strong> {m.feedback.sharper}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Text interview layout (unchanged behavior from earlier phase)
// ═══════════════════════════════════════════════════════════════════
function TextInterviewLayout({
  session,
  aiTyping,
  ending,
  error,
  draftMessage,
  onChangeDraft,
  onSubmitText,
  onEnd,
  userInitials,
}) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session.messages.length, aiTyping]);

  const headerMeta = `${ROLE_LABEL[session.setup.role] || session.setup.role} · ${
    ROUND_LABEL[session.setup.round] || session.setup.round
  } · ${DIFF_LABEL[session.setup.difficulty] || session.setup.difficulty}`;

  const topicsDone = session.topicsCovered.filter((t) => t.done).length;

  return (
    <>
      <TopBar
        searchPlaceholder="Search…"
        rightContent={
          <>
            <span className="pill pill-lime">🔴 Live Session</span>
            <span className="pill">{headerMeta}</span>
          </>
        }
      />

      <div className="chat-wrap">
        <div className="chat-main">
          <div className="chat-header">
            <h3>
              {ROUND_LABEL[session.setup.round] || 'Mock'} <em>interview</em>
            </h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="chat-timer">⏱ {formatElapsed(session.startedAt)}</div>
              <button
                type="button"
                onClick={onEnd}
                disabled={ending || aiTyping}
                style={{
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: '1px solid rgba(248, 113, 113, 0.4)',
                  background: 'rgba(248, 113, 113, 0.08)',
                  color: 'var(--danger)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: ending || aiTyping ? 'not-allowed' : 'pointer',
                  opacity: ending || aiTyping ? 0.5 : 1,
                }}
              >
                {ending ? 'Ending…' : '■ End interview'}
              </button>
            </div>
          </div>

          <div className="messages" ref={scrollRef}>
            {session.messages.map((m) => (
              <TranscriptRow key={m.id} m={m} userInitials={userInitials} />
            ))}
            {aiTyping && (
              <div className="msg msg-ai">
                <div className="msg-avatar">C</div>
                <div className="msg-bubble typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: '10px 0' }}>
              {error.message}
            </p>
          )}

          <form className="chat-input-wrap" onSubmit={onSubmitText}>
            <div className="chat-input">
              <input
                type="text"
                placeholder={aiTyping ? 'Interviewer is responding…' : 'Type your answer…'}
                value={draftMessage}
                onChange={(e) => onChangeDraft(e.target.value)}
                disabled={aiTyping}
                autoFocus
              />
              <button type="submit" aria-label="Send" disabled={aiTyping || !draftMessage.trim()}>
                →
              </button>
            </div>
          </form>
        </div>

        <aside className="chat-side">
          <div className="progress-ring">
            <div className="p-num">
              {session.questionsCovered}/{session.questionsTarget}
            </div>
            <div className="p-label">Questions covered</div>
          </div>

          <h4>Topics</h4>
          <div className="topic-list">
            {session.topicsCovered.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                Topics will appear as the interview progresses…
              </div>
            )}
            {session.topicsCovered.map((t, i) => (
              <div key={i} className={`topic-item${t.done ? ' topic-done' : ''}`}>
                {t.name}
                {t.done && <span>✓</span>}
              </div>
            ))}
          </div>

          <h4>Live performance</h4>
          <div style={{ padding: 16, background: 'var(--bg-elev-2)', borderRadius: 10 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 44,
                color: 'var(--lime)',
                lineHeight: 1,
              }}
            >
              {session.liveScore ?? 0}
              <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/10</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {session.questionsCovered > 0 ? 'Average so far' : 'Nothing scored yet'}
            </div>
            {session.topicsCovered.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--success)' }}>
                {topicsDone}/{session.topicsCovered.length} topics covered
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
