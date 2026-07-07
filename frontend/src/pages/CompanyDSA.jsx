import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import CompanyQuestionModal from '../components/CompanyQuestionModal.jsx';
import { companyQuestionsApi } from '../api/companyQuestions.js';

const DIFFICULTY_OPTIONS = ['All', 'EASY', 'MEDIUM', 'HARD'];

function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function difficultyPill(d) {
  if (d === 'HARD') return { className: 'pill pill-coral', label: 'Hard' };
  if (d === 'MEDIUM') return { className: 'pill pill-cream', label: 'Medium' };
  return {
    className: 'pill',
    label: 'Easy',
    style: { color: 'var(--success)', borderColor: 'var(--success)' },
  };
}

function formatFrequency(f) {
  if (!Number.isFinite(f)) return '—';
  if (f >= 10) return `${f.toFixed(0)}%`;
  return `${f.toFixed(1)}%`;
}

function formatAcceptance(r) {
  if (!Number.isFinite(r) || r === 0) return '—';
  return `${Math.round(r * 100)}%`;
}

function timeAgo(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CompanyDSA() {
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companySearch, setCompanySearch] = useState('');

  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [problemSearch, setProblemSearch] = useState('');
  const debouncedProblemSearch = useDebounced(problemSearch, 300);

  const [problems, setProblems] = useState([]);
  const [problemTotal, setProblemTotal] = useState(0);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [openProblem, setOpenProblem] = useState(null);

  // Load the company list + sync status once.
  useEffect(() => {
    let cancelled = false;
    companyQuestionsApi
      .companies()
      .then((list) => {
        if (cancelled) return;
        setCompanies(list);
        setCompaniesLoading(false);
        const pick =
          list.find((c) => c.name === 'Amazon') ||
          list.find((c) => c.name === 'Google') ||
          list[0];
        if (pick) setSelectedCompany(pick.name);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setCompaniesLoading(false);
      });

    companyQuestionsApi
      .status()
      .then((s) => !cancelled && setSyncStatus(s))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch problems whenever filters change.
  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    setProblemsLoading(true);
    setError(null);
    companyQuestionsApi
      .list({
        company: selectedCompany,
        difficulty: difficultyFilter === 'All' ? undefined : difficultyFilter,
        q: debouncedProblemSearch.trim() || undefined,
        limit: 200,
      })
      .then((data) => {
        if (cancelled) return;
        setProblems(data.problems || []);
        setProblemTotal(data.total || 0);
        setProblemsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setProblemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCompany, difficultyFilter, debouncedProblemSearch]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, companySearch]);

  return (
    <>
      <TopBar searchPlaceholder="Search…" />

      <div className="page">
        <h1 className="page-title">
          Company-wise <em>DSA practice.</em>
        </h1>
        <p className="page-subtitle">
          Pick a company, drill its most-asked LeetCode problems, sorted by frequency. Data from
          the <a href="https://github.com/liquidslr/leetcode-company-wise-problems" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)' }}>liquidslr/leetcode-company-wise-problems</a> repo — hit the link on each row to solve on LeetCode.
        </p>
        {syncStatus && (
          <div
            style={{
              display: 'inline-flex',
              gap: 10,
              alignItems: 'center',
              marginTop: 12,
              padding: '6px 12px',
              borderRadius: 100,
              background: 'var(--bg-elev-2)',
              border: '1px solid var(--border)',
              fontSize: 11.5,
              color: 'var(--text-muted)',
            }}
            title={`Commit ${syncStatus.lastCommitSha?.slice(0, 7) || '—'} · last checked ${timeAgo(syncStatus.lastCheckedAt)}`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 50,
                background: 'var(--success)',
              }}
            />
            <span>
              {syncStatus.rows.toLocaleString()} problems · {syncStatus.companies} companies · synced{' '}
              <strong style={{ color: 'var(--text)' }}>{timeAgo(syncStatus.lastSyncedAt)}</strong>
            </span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: 20,
            marginTop: 32,
          }}
          className="company-dsa-layout"
        >
          {/* ─── Company picker ─── */}
          <aside
            style={{
              background: 'var(--bg-elev-1)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 16,
              height: 'fit-content',
              position: 'sticky',
              top: 96,
              maxHeight: 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                color: 'var(--text-dim)',
                marginBottom: 10,
              }}
            >
              {companies.length} COMPANIES
            </div>
            <input
              type="text"
              className="input"
              placeholder="Search companies…"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 13, marginBottom: 10 }}
            />
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {companiesLoading && (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Loading companies…
                </p>
              )}
              {!companiesLoading && filteredCompanies.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  No companies match "{companySearch}".
                </p>
              )}
              {!companiesLoading && companies.length === 0 && !error && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  No data yet — the backend is scraping in the background. Refresh in a minute.
                </div>
              )}
              {filteredCompanies.map((c) => {
                const active = c.name === selectedCompany;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedCompany(c.name)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: active ? 'var(--bg-elev-2)' : 'transparent',
                      border: '1px solid transparent',
                      borderColor: active ? 'var(--border-strong)' : 'transparent',
                      borderRadius: 8,
                      color: active ? 'var(--lime)' : 'var(--text-muted)',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <span>{c.name}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: 'var(--text-dim)' }}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ─── Problems table ─── */}
          <section>
            {!selectedCompany && !companiesLoading && (
              <div
                style={{
                  padding: 60,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-elev-1)',
                  border: '1px dashed var(--border)',
                  borderRadius: 14,
                }}
              >
                Pick a company to see its most-asked LeetCode problems.
              </div>
            )}

            {selectedCompany && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 36,
                      fontStyle: 'italic',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {selectedCompany} <em style={{ color: 'var(--lime)' }}>problems</em>
                    <span
                      style={{
                        fontSize: 14,
                        color: 'var(--text-muted)',
                        fontStyle: 'normal',
                        fontFamily: 'var(--font-body)',
                        marginLeft: 12,
                      }}
                    >
                      · {problemTotal} total
                    </span>
                  </h2>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficultyFilter(d)}
                      className={`filter-chip${d === difficultyFilter ? ' active' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {d === 'All' ? 'All' : d.charAt(0) + d.slice(1).toLowerCase()}
                    </button>
                  ))}
                  <input
                    type="text"
                    className="input"
                    placeholder="Search problem title…"
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: '8px 14px',
                      fontSize: 13,
                    }}
                  />
                </div>

                {error && (
                  <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
                    {error.message}
                  </p>
                )}

                {problemsLoading && problems.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', padding: 24 }}>
                    Loading problems…
                  </p>
                )}

                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'var(--bg-elev-1)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 90px 90px 60px',
                      gap: 12,
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      background: 'var(--bg-elev-2)',
                    }}
                  >
                    <span>Difficulty</span>
                    <span>Problem</span>
                    <span style={{ textAlign: 'right' }}>Frequency</span>
                    <span style={{ textAlign: 'right' }}>Accept.</span>
                    <span style={{ textAlign: 'right' }}>Solve</span>
                  </div>

                  {problems.map((p) => {
                    const dp = difficultyPill(p.difficulty);
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenProblem({ ...p, company: selectedCompany })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenProblem({ ...p, company: selectedCompany });
                          }
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 90px 90px 60px',
                          gap: 12,
                          padding: '14px 20px',
                          borderBottom: '1px solid var(--border)',
                          alignItems: 'center',
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elev-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>
                          <span className={dp.className} style={dp.style}>
                            {dp.label}
                          </span>
                        </span>
                        <span>
                          <span style={{ color: 'var(--text)' }}>{p.title}</span>
                          {p.topics && p.topics.length > 0 && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--text-dim)',
                                marginTop: 4,
                                lineHeight: 1.4,
                              }}
                            >
                              {p.topics.slice(0, 4).join(' · ')}
                              {p.topics.length > 4 ? ` +${p.topics.length - 4}` : ''}
                            </div>
                          )}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12.5,
                            color: p.frequency >= 50 ? 'var(--lime)' : 'var(--text-muted)',
                            textAlign: 'right',
                          }}
                        >
                          {formatFrequency(p.frequency)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12.5,
                            color: 'var(--text-muted)',
                            textAlign: 'right',
                          }}
                        >
                          {formatAcceptance(p.acceptanceRate)}
                        </span>
                        <span style={{ textAlign: 'right' }}>
                          {p.link ? (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: 'var(--lime)',
                                textDecoration: 'none',
                                fontSize: 13,
                              }}
                              title="Open on LeetCode (Ctrl+click opens in new tab)"
                            >
                              ↗
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                          )}
                        </span>
                      </div>
                    );
                  })}

                  {!problemsLoading && problems.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No problems match these filters.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {openProblem && (
        <CompanyQuestionModal
          question={openProblem}
          onClose={() => setOpenProblem(null)}
        />
      )}
    </>
  );
}
