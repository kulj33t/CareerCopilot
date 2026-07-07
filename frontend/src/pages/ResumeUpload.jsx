import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import {
  analyzeResume,
  clearResumeError,
  deleteResume,
  fetchResumes,
  setActive,
  uploadResume,
} from '../store/slices/resumeSlice.js';

// ─── Shared helpers ────────────────────────────────────────────────
const ACCEPTED_EXT = ['pdf', 'docx'];
const MAX_BYTES = 2 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function headlineFromScore(score) {
  if (score >= 85) return { bold: 'excellent', soft: 'polish' };
  if (score >= 70) return { bold: 'solid', soft: 'room' };
  if (score >= 55) return { bold: 'promising', soft: 'work' };
  return { bold: 'rough', soft: 'significant work' };
}

// ─── Analysis sub-components (lifted from the old ResumeResults page) ──
const RING_RADIUS = 110;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ score }) {
  const offset = RING_CIRC * (1 - score / 100);
  return (
    <div className="score-ring">
      <svg width="240" height="240" viewBox="0 0 240 240">
        <circle className="ring-bg" cx="120" cy="120" r={RING_RADIUS} />
        <circle
          className="ring-fill"
          cx="120"
          cy="120"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-text">
        <div className="score-ring-num">{score}</div>
        <div className="score-ring-label">Overall Score</div>
      </div>
    </div>
  );
}

function DimCard({ d }) {
  const barColor =
    d.level === 'good' ? 'var(--lime)' : d.level === 'warn' ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="dim-card">
      <div className="label">{d.label}</div>
      <div className="value">{d.value}</div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${d.value}%`, background: barColor }} />
      </div>
    </div>
  );
}

function feedbackTag(item) {
  if (item.severity === 'high') {
    return { label: `Critical · ${item.category}`, className: 'pill pill-coral' };
  }
  if (item.severity === 'med') {
    return { label: `Warning · ${item.category}`, className: 'pill pill-cream' };
  }
  return { label: 'Suggestion', className: 'pill' };
}

// ─── Small building blocks ─────────────────────────────────────────
function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: 'var(--text-dim)' }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function AnalysisLoading() {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div
        className="mono"
        style={{ color: 'var(--lime)', letterSpacing: '0.15em', fontSize: 12, marginBottom: 12 }}
      >
        LLAMA · THINKING
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
        Analyzing your resume…
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>This usually takes 3–6 seconds.</p>
    </div>
  );
}

function AnalysisError({ message, onRetry }) {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 12 }}>
        Analysis failed
      </div>
      <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 20 }}>{message}</p>
      <button className="btn btn-primary" onClick={onRetry}>Try again</button>
    </div>
  );
}

function AnalysisView({ analysis, onRegenerate }) {
  const passed = analysis.atsChecks.filter((c) => c.pass).length;
  const head = headlineFromScore(analysis.overallScore);

  return (
    <>
      <div className="results-hero" style={{ padding: '32px 0', borderBottom: 'none', background: 'transparent' }}>
        <ScoreRing score={analysis.overallScore} />
        <div className="results-summary">
          <h2>
            Your resume is <em>{head.bold}</em> — with <em>{head.soft}</em> to grow.
          </h2>
          <p>{analysis.summary}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={onRegenerate}>
              Re-analyze
            </button>
          </div>
        </div>
      </div>

      <div className="dim-grid" style={{ padding: '16px 0' }}>
        {analysis.dimensions.map((d) => (
          <DimCard key={d.label} d={d} />
        ))}
      </div>

      <div className="feedback-grid" style={{ padding: '16px 0 0', maxWidth: 'none' }}>
        <div>
          <div className="card-head">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic' }}>
              Feedback &amp; <em>suggestions</em>
            </h3>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {analysis.feedback.length} items
            </span>
          </div>
          <div className="feedback-list">
            {analysis.feedback.map((f) => {
              const tag = feedbackTag(f);
              return (
                <div key={f.id} className={`feedback-item ${f.severity}`}>
                  <div className="head">
                    <h4>{f.title}</h4>
                    <span className={tag.className}>{tag.label}</span>
                  </div>
                  <p>{f.body}</p>
                  {f.suggestion && <div className="suggestion">{f.suggestion}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card-head">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic' }}>
              ATS <em>checks</em>
            </h3>
            <span className="pill pill-lime">
              {passed}/{analysis.atsChecks.length} passed
            </span>
          </div>
          <div className="ats-list">
            {analysis.atsChecks.map((c, i) => (
              <div key={i} className="ats-item">
                <div className={`ats-check ${c.pass ? 'pass' : 'fail'}`}>{c.pass ? '✓' : '✕'}</div>
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export default function ResumeUpload() {
  const dispatch = useDispatch();
  const {
    list,
    activeId,
    loading,
    uploading,
    error: serverError,
    analyses,
    analysisStatus,
    analysisError,
  } = useSelector((s) => s.resume);

  const fileInputRef = useRef(null);
  const analysisRef = useRef(null);
  const [clientError, setClientError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Fetch list on mount.
  useEffect(() => {
    dispatch(fetchResumes());
  }, [dispatch]);

  // When the list first arrives, default activeId to the latest resume
  // so the analysis section shows something useful immediately.
  useEffect(() => {
    if (!activeId && list.length > 0) {
      dispatch(setActive(list[0].id));
    }
    // If the current active resume was deleted, fall back to latest.
    if (activeId && !list.some((r) => r.id === activeId) && list.length > 0) {
      dispatch(setActive(list[0].id));
    }
  }, [dispatch, activeId, list]);

  // Auto-trigger analysis on the active resume if not already cached.
  useEffect(() => {
    if (!activeId) return;
    if (analyses[activeId]) return;
    if (analysisStatus[activeId] === 'loading') return;
    dispatch(analyzeResume({ resumeId: activeId }));
  }, [dispatch, activeId, analyses, analysisStatus]);

  const handleFiles = async (files) => {
    setClientError('');
    if (serverError) dispatch(clearResumeError());
    const file = files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setClientError(`Unsupported file type ".${ext}". Upload a PDF or DOCX.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError(`File is ${formatSize(file.size)} — max is 2 MB.`);
      return;
    }

    // Upload. The slice sets activeId to the newly uploaded resume on success,
    // which in turn triggers the effect above to fetch an analysis.
    const result = await dispatch(uploadResume(file));
    if (uploadResume.fulfilled.match(result)) {
      // Smooth-scroll to the analytics section so the user sees the newly
      // started analysis instead of the upload zone they just used.
      // Defer a tick so the analysis block has actually mounted.
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeResume = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this resume permanently?')) return;
    dispatch(deleteResume(id));
  };

  const combinedError = clientError || serverError?.message;
  const hasResumes = list.length > 0;
  const activeAnalysis = activeId ? analyses[activeId] : null;
  const activeStatus = activeId ? analysisStatus[activeId] : 'idle';
  const activeResume = list.find((r) => r.id === activeId);

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="page">
        <h1 className="page-title">
          Your <em>resume</em>, reviewed in seconds.
        </h1>
        <p className="page-subtitle">
          Upload a PDF or DOCX. We score it on 5 dimensions, surface ATS issues, and rewrite your
          weakest bullets — all on this page.
        </p>

        {/* ─── Upload zone ─── */}
        <div
          className="upload-zone"
          onClick={uploading ? undefined : openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={uploading ? (e) => e.preventDefault() : onDrop}
          style={{
            ...(dragOver ? { borderColor: 'var(--lime)', background: 'var(--bg-elev-2)' } : {}),
            ...(uploading ? { cursor: 'progress', opacity: 0.8 } : {}),
          }}
        >
          <div className="upload-icon">↑</div>
          <h3>
            {uploading
              ? 'Uploading…'
              : dragOver
              ? 'Release to upload'
              : hasResumes
              ? 'Upload a new version'
              : 'Drop your resume here'}
          </h3>
          <p>PDF or DOCX · Max 2 MB</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
          >
            {uploading ? 'Uploading…' : 'Browse files'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {combinedError && (
          <p style={{ color: 'var(--danger)', marginTop: 16, fontSize: 13 }}>{combinedError}</p>
        )}

        {/* ─── Recent uploads list ─── */}
        <div className="recent-resumes">
          <div className="card-head">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic' }}>
              Your <em>uploads</em>
            </h3>
            {list.length > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {list.length} {list.length === 1 ? 'resume' : 'resumes'}
                {' · click to switch'}
              </span>
            )}
          </div>

          {loading && list.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading your resumes…</p>
          )}

          {!loading && list.length === 0 && (
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-elev-1)',
                border: '1px dashed var(--border)',
                borderRadius: 14,
                fontSize: 14,
              }}
            >
              No resumes yet — upload your first above to get a full analysis.
            </div>
          )}

          {list.map((r, idx) => {
            const isActive = r.id === activeId;
            return (
              <div
                key={r.id}
                className="resume-row"
                onClick={() => dispatch(setActive(r.id))}
                style={{
                  borderColor: isActive ? 'var(--lime-dim)' : undefined,
                  background: isActive ? 'rgba(250,82,15,0.06)' : undefined,
                }}
              >
                <div className="file-icon">{r.fileType}</div>
                <div>
                  <h4>{r.originalName}</h4>
                  <div className="meta">
                    {formatRelativeTime(r.createdAt)} · {formatSize(r.sizeBytes)}
                    {isActive && ' · viewing'}
                  </div>
                </div>
                {idx === 0 ? (
                  <span className="pill pill-lime">Latest</span>
                ) : (
                  <span className="pill">v{list.length - idx}</span>
                )}
                <button
                  type="button"
                  onClick={(e) => removeResume(e, r.id)}
                  aria-label="Delete resume"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                >
                  ×
                </button>
                <ChevronRight />
              </div>
            );
          })}
        </div>

        {/* ─── Analysis section ─── */}
        {activeResume && (
          <div
            ref={analysisRef}
            style={{
              marginTop: 48,
              paddingTop: 32,
              borderTop: '1px solid var(--border)',
              scrollMarginTop: 20,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span className="mono" style={{ color: 'var(--lime)', fontSize: 11, letterSpacing: '0.15em' }}>
                ANALYSIS
              </span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 10, fontSize: 13 }}>
                of <strong style={{ color: 'var(--text)' }}>{activeResume.originalName}</strong>
              </span>
            </div>

            {activeStatus === 'loading' && <AnalysisLoading />}

            {activeStatus === 'error' && !activeAnalysis && (
              <AnalysisError
                message={analysisError?.message || 'Could not analyze this resume.'}
                onRetry={() => dispatch(analyzeResume({ resumeId: activeId, force: true }))}
              />
            )}

            {activeAnalysis && (
              <AnalysisView
                analysis={activeAnalysis}
                onRegenerate={() => dispatch(analyzeResume({ resumeId: activeId, force: true }))}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
