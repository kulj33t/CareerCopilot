import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeQuestion,
  loadAnswer,
  toggleBookmark,
} from '../store/slices/questionsSlice.js';

// Converts the *asterisk* shorthand into <em> spans. Mirrors the logic in
// the card grid so the title stays consistent.
function highlightAsterisks(text) {
  const parts = String(text || '').split(/\*([^*]+)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>
  );
}

function difficultyPillClass(d) {
  if (d === 'Hard') return 'pill pill-coral';
  if (d === 'Medium') return 'pill pill-cream';
  return 'pill';
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LoadingState() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div
        className="mono"
        style={{
          color: 'var(--lime)',
          letterSpacing: '0.15em',
          fontSize: 11,
          marginBottom: 10,
        }}
      >
        GEMINI · THINKING
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 4 }}>
        Drafting the model answer…
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Usually 3–8 seconds.</p>
    </div>
  );
}

export default function QuestionDetailModal() {
  const dispatch = useDispatch();
  const { activeQuestionId, all, answers, answerStatus, answerError } = useSelector(
    (s) => s.questions
  );

  const question = useMemo(
    () => all.find((q) => q.id === activeQuestionId) || null,
    [all, activeQuestionId]
  );
  const answer = activeQuestionId ? answers[activeQuestionId] : null;
  const status = activeQuestionId ? answerStatus[activeQuestionId] : 'idle';

  const scrollRef = useRef(null);

  // Fetch (or generate) the answer the first time the modal opens for this question.
  useEffect(() => {
    if (activeQuestionId && !answer && status !== 'loading' && status !== 'error') {
      dispatch(loadAnswer({ id: activeQuestionId }));
    }
  }, [dispatch, activeQuestionId, answer, status]);

  // Close on Esc. Lock page scroll while open.
  useEffect(() => {
    if (!activeQuestionId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dispatch(closeQuestion());
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeQuestionId, dispatch]);

  // Scroll the modal to top whenever a different question is opened.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeQuestionId]);

  if (!activeQuestionId || !question) return null;

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) dispatch(closeQuestion());
  };

  const onBookmark = () => {
    dispatch(toggleBookmark({ id: question.id, bookmarked: question.bookmarked }));
  };

  const onRegenerate = () => {
    dispatch(loadAnswer({ id: question.id, force: true }));
  };

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 6, 8, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--bg-elev-1)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 28px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg, var(--bg-elev-2), var(--bg-elev-1))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="pill">{question.category}</span>
                <span
                  className={difficultyPillClass(question.difficulty)}
                  style={
                    question.difficulty === 'Easy'
                      ? { color: 'var(--success)', borderColor: 'var(--success)' }
                      : undefined
                  }
                >
                  {question.difficulty}
                </span>
                <span className="pill">⏱ {question.time}</span>
                {question.companies && <span className="pill pill-cream">{question.companies}</span>}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontStyle: 'italic',
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                }}
              >
                {highlightAsterisks(question.title)}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>
                {question.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(closeQuestion())}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-elev-2)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onBookmark}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              {question.bookmarked ? '🔖 Saved' : '+ Bookmark'}
            </button>
            {question.referenceUrl && (
              <a
                href={question.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                ↗ Practice on LeetCode
              </a>
            )}
          </div>
        </div>

        {/* Body — scrollable */}
        <div ref={scrollRef} style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {status === 'loading' && <LoadingState />}

          {status === 'error' && !answer && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10 }}>
                Couldn&apos;t fetch an answer
              </div>
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {answerError?.message}
              </p>
              <button className="btn btn-primary" onClick={onRegenerate}>
                Try again
              </button>
            </div>
          )}

          {answer && (
            <>
              {/* TL;DR */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--lime-glow)',
                  border: '1px solid var(--lime-dim)',
                  marginBottom: 20,
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    color: 'var(--lime)',
                    marginBottom: 6,
                  }}
                >
                  TL;DR
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{answer.tldr}</p>
              </div>

              {/* Explanation */}
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontStyle: 'italic',
                  marginBottom: 10,
                }}
              >
                How to <em style={{ color: 'var(--lime)' }}>answer</em>
              </h3>
              <div
                className="answer-html"
                style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: answer.explanation }}
              />

              {/* Code sample */}
              {answer.codeSample && (
                <>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontStyle: 'italic',
                      margin: '24px 0 10px',
                    }}
                  >
                    Sample <em style={{ color: 'var(--lime)' }}>code</em>
                    {answer.codeLanguage && (
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--text-dim)',
                          marginLeft: 10,
                          fontStyle: 'normal',
                        }}
                      >
                        {answer.codeLanguage}
                      </span>
                    )}
                  </h3>
                  <pre
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 16,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      overflowX: 'auto',
                      color: 'var(--text)',
                    }}
                  >
                    <code>{answer.codeSample}</code>
                  </pre>
                </>
              )}

              {/* Key points */}
              {answer.keyPoints.length > 0 && (
                <>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontStyle: 'italic',
                      margin: '24px 0 10px',
                    }}
                  >
                    Key <em style={{ color: 'var(--lime)' }}>points</em>
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                    {answer.keyPoints.map((kp, i) => (
                      <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-muted)' }}>
                        {kp}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Follow-ups */}
              {answer.followUps.length > 0 && (
                <>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontStyle: 'italic',
                      margin: '24px 0 10px',
                    }}
                  >
                    Likely <em style={{ color: 'var(--lime)' }}>follow-ups</em>
                  </h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {answer.followUps.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'var(--bg-elev-2)',
                          border: '1px solid var(--border)',
                          fontSize: 13.5,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Further reading */}
              {answer.references.length > 0 && (
                <>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontStyle: 'italic',
                      margin: '24px 0 10px',
                    }}
                  >
                    Further <em style={{ color: 'var(--lime)' }}>reading</em>
                  </h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {answer.references.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: 'var(--bg-elev-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          textDecoration: 'none',
                          fontSize: 13.5,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--lime-dim)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <span>↗ {r.title}</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{hostFromUrl(r.url)}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-elev-2)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Press <span className="mono">Esc</span> to close
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={status === 'loading'}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              {status === 'loading' ? 'Regenerating…' : '↻ Regenerate'}
            </button>
            <button
              type="button"
              onClick={() => dispatch(closeQuestion())}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
