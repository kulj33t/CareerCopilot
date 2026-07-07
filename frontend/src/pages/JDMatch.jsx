import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import {
  analyzeJd,
  clearJdError,
  setJdText,
  setSelectedResume,
} from '../store/slices/jdSlice.js';
import { fetchResumes, uploadResume } from '../store/slices/resumeSlice.js';

const MIN_JD_LENGTH = 30;
const ACCEPTED_EXT = ['pdf', 'docx'];
const MAX_BYTES = 2 * 1024 * 1024;

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function JDMatch() {
  const dispatch = useDispatch();

  const resumes = useSelector((s) => s.resume.list);
  const resumesLoading = useSelector((s) => s.resume.loading);
  const uploading = useSelector((s) => s.resume.uploading);
  const { jdText, selectedResumeId, result, analyzing, error } = useSelector((s) => s.jd);

  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Make sure resumes are loaded (user may deep-link here).
  useEffect(() => {
    if (resumes.length === 0 && !resumesLoading) dispatch(fetchResumes());
  }, [dispatch, resumes.length, resumesLoading]);

  // Default to the newest resume once the list arrives.
  useEffect(() => {
    if (!selectedResumeId && resumes.length > 0) {
      dispatch(setSelectedResume(resumes[0].id));
    }
    if (selectedResumeId && !resumes.some((r) => r.id === selectedResumeId)) {
      dispatch(setSelectedResume(resumes[0]?.id || null));
    }
  }, [dispatch, selectedResumeId, resumes]);

  const onAnalyze = () => {
    if (!selectedResumeId || jdText.trim().length < MIN_JD_LENGTH) return;
    dispatch(analyzeJd({ resumeId: selectedResumeId, jdText: jdText.trim() }));
  };

  const onChangeJd = (e) => {
    dispatch(setJdText(e.target.value));
    if (error) dispatch(clearJdError());
  };

  const handleFiles = async (files) => {
    setUploadError('');
    const file = files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setUploadError(`Unsupported file type ".${ext}". Upload a PDF or DOCX.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(`File is ${formatSize(file.size)} — max is 2 MB.`);
      return;
    }

    // The slice sets the new resume as active, and our effect syncs it into
    // the selected dropdown. User can immediately hit Analyze.
    const r = await dispatch(uploadResume(file));
    if (uploadResume.fulfilled.match(r)) {
      dispatch(setSelectedResume(r.payload.id));
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const canAnalyze = Boolean(selectedResumeId) && jdText.trim().length >= MIN_JD_LENGTH;
  const noResumes = !resumesLoading && resumes.length === 0;

  // Shared file input — used by both the empty-state drop zone and the
  // "upload new" button in the header.
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      style={{ display: 'none' }}
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="page">
        <h1 className="page-title">Match your resume to <em>any role.</em></h1>
        <p className="page-subtitle">
          Paste a job description. See exactly how you stack up — and what to add to close the gap.
        </p>
      </div>

      <div className="jd-layout">
        <div className="jd-input">
          {/* ─── Resume picker + always-visible upload zone ─── */}
          <div
            style={{
              background: 'var(--bg-elev-1)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
                gap: 12,
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic' }}>
                Your <em style={{ color: 'var(--lime)' }}>resume</em>
              </h3>
              {resumes.length > 0 && (
                <select
                  value={selectedResumeId || ''}
                  onChange={(e) => dispatch(setSelectedResume(e.target.value))}
                  disabled={analyzing || uploading}
                  style={{
                    background: 'var(--bg-elev-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    maxWidth: 260,
                    flex: '0 1 auto',
                  }}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {truncate(r.originalName, 36)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Drop zone is always visible. If resumes exist, it's a compact
                "upload a different version" style. If none, it's the primary
                call to action. */}
            <div
              onClick={uploading ? undefined : openPicker}
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={uploading ? (e) => e.preventDefault() : onDrop}
              style={{
                border: `2px dashed ${dragOver ? 'var(--lime)' : 'var(--border-strong)'}`,
                background: dragOver ? 'var(--bg-elev-2)' : 'transparent',
                borderRadius: 12,
                padding: resumes.length > 0 ? '16px 20px' : '28px 24px',
                textAlign: 'center',
                cursor: uploading ? 'progress' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: resumes.length > 0 ? 16 : 20,
                  marginBottom: 4,
                }}
              >
                {uploading
                  ? 'Uploading…'
                  : dragOver
                  ? 'Release to upload'
                  : resumes.length > 0
                  ? 'Upload a new resume'
                  : 'Upload a resume to match'}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                PDF or DOCX · Max 2 MB · Drop or click to browse
              </p>
            </div>

            {uploadError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>
                {uploadError}
              </p>
            )}

            {fileInput}
          </div>

          {/* ─── Job description ─── */}
          <div className="card-head">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic' }}>
              Job <em>description</em>
            </h3>
          </div>

          <textarea
            value={jdText}
            onChange={onChangeJd}
            placeholder="Paste the full job description here — responsibilities, requirements, nice-to-haves, the works."
            disabled={analyzing}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {jdText.trim().length < MIN_JD_LENGTH
                ? `${MIN_JD_LENGTH - jdText.trim().length} more characters needed`
                : `${jdText.trim().length} characters`}
              {noResumes && ' · upload a resume above first'}
            </span>
            <button
              className="btn btn-primary"
              onClick={onAnalyze}
              disabled={!canAnalyze || analyzing}
            >
              {analyzing ? 'Analyzing…' : result ? 'Re-analyze →' : 'Analyze match →'}
            </button>
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error.message}</p>
          )}
        </div>

        <div>
          {analyzing && !result && (
            <div className="match-hero" style={{ padding: 48 }}>
              <div
                className="mono"
                style={{
                  color: 'var(--lime)',
                  letterSpacing: '0.15em',
                  fontSize: 11,
                  marginBottom: 12,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                LLAMA · MATCHING
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Comparing your resume…
              </div>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  marginTop: 10,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Takes 3–6 seconds.
              </p>
            </div>
          )}

          {!analyzing && !result && (
            <div className="match-hero" style={{ padding: 48 }}>
              <div
                className="mono"
                style={{
                  color: 'var(--text-dim)',
                  letterSpacing: '0.15em',
                  fontSize: 11,
                  marginBottom: 12,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                NO MATCH YET
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {noResumes
                  ? 'Upload a resume, paste a JD, then click Analyze'
                  : (
                    <>
                      Paste a JD and click <em style={{ color: 'var(--lime)' }}>Analyze</em>
                    </>
                  )}
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="match-hero">
                <div className="match-percent">
                  {result.matchPct}
                  <span style={{ fontSize: 32 }}>%</span>
                </div>
                <div className="match-label">Match Score</div>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    marginTop: 12,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {result.summary}
                </p>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h4
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontStyle: 'italic',
                    marginBottom: 12,
                  }}
                >
                  Matching <em style={{ color: 'var(--lime)' }}>skills</em>{' '}
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontStyle: 'normal',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    ({result.matching.length})
                  </span>
                </h4>
                {result.matching.length > 0 ? (
                  <div className="skill-pills">
                    {result.matching.map((s) => (
                      <span key={s} className="pill pill-lime">{s}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No strong overlap detected.
                  </p>
                )}
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <h4
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontStyle: 'italic',
                    marginBottom: 12,
                  }}
                >
                  Missing <em style={{ color: 'var(--lime)' }}>skills</em>{' '}
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--coral)',
                      fontStyle: 'normal',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    ({result.missing.length})
                  </span>
                </h4>
                {result.missing.length > 0 ? (
                  <div className="skill-pills">
                    {result.missing.map((s) => (
                      <span key={s} className="pill pill-coral">{s}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--success)' }}>
                    No gaps detected — nice.
                  </p>
                )}
                {result.tip && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 12 }}>
                    💡 {result.tip}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
