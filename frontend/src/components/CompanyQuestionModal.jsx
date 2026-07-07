import { useEffect, useState } from 'react';
import { companyQuestionsApi } from '../api/companyQuestions.js';

function difficultyPill(d) {
  if (d === 'HARD') return { className: 'pill pill-coral', label: 'Hard' };
  if (d === 'MEDIUM') return { className: 'pill pill-cream', label: 'Medium' };
  return {
    className: 'pill',
    label: 'Easy',
    style: { color: 'var(--success)', borderColor: 'var(--success)' },
  };
}

function hostFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function LoadingState() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div
        className="mono"
        style={{ color: 'var(--lime)', letterSpacing: '0.15em', fontSize: 11, marginBottom: 10 }}
      >
        AI · THINKING
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>
        Drafting the model answer…
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Usually 2–4 seconds.</p>
    </div>
  );
}

// Separate modal (vs reusing QuestionDetailModal) because the data shape
// differs — company questions have `link` + `frequency` + `acceptanceRate`,
// no Redux slice, and answer is fetched via a one-shot hook rather than
// through a thunk cache. Layout is deliberately the same so users get the
// same muscle memory.
export default function CompanyQuestionModal({ question, onClose }) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  // Lock page scroll while open + close on Esc.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const load = async ({ force = false } = {}) => {
    setStatus('loading');
    setError(null);
    try {
      const res = await companyQuestionsApi.generateAnswer(question.id, { force });
      setAnswer(res.answer);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const dp = difficultyPill(question.difficulty);

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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className="pill pill-cream">{question.company}</span>
                <span className={dp.className} style={dp.style}>{dp.label}</span>
                {Number.isFinite(question.frequency) && question.frequency > 0 && (
                  <span className="pill" title="Company-specific ask frequency">
                    {question.frequency.toFixed(1)}% asked
                  </span>
                )}
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
                {question.title}
              </h2>
              {question.topics && question.topics.length > 0 && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-dim)',
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {question.topics.join(' · ')}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
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

          {question.link && (
            <div style={{ marginTop: 14 }}>
              <a
                href={question.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                ↗ Solve on LeetCode
              </a>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {status === 'loading' && <LoadingState />}

          {status === 'error' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 10 }}>
                Couldn&apos;t fetch an answer
              </div>
              <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {error?.message}
              </p>
              <button className="btn btn-primary" onClick={() => load({ force: true })}>
                Try again
              </button>
            </div>
          )}

          {status === 'ready' && answer && (
            <>
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

              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontStyle: 'italic',
                  marginBottom: 10,
                }}
              >
                How to <em style={{ color: 'var(--lime)' }}>approach it</em>
              </h3>
              <div
                className="answer-html"
                style={{ fontSize: 14, lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: answer.explanation }}
              />

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
                    }}
                  >
                    <code>{answer.codeSample}</code>
                  </pre>
                </>
              )}

              {answer.keyPoints && answer.keyPoints.length > 0 && (
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
                      <li
                        key={i}
                        style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-muted)' }}
                      >
                        {kp}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {answer.followUps && answer.followUps.length > 0 && (
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

              {answer.references && answer.references.length > 0 && (
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
                      >
                        <span>↗ {r.title}</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                          {hostFromUrl(r.url)}
                        </span>
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
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Press <span className="mono">Esc</span> to close
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => load({ force: true })}
              disabled={status === 'loading'}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              {status === 'loading' ? 'Regenerating…' : '↻ Regenerate'}
            </button>
            <button
              type="button"
              onClick={onClose}
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
