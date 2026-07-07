import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import QuestionDetailModal from '../components/QuestionDetailModal.jsx';
import {
  fetchQuestions,
  openQuestion,
  setFilter,
  setSearch,
  toggleBookmark,
} from '../store/slices/questionsSlice.js';

// Renders "Design an *LRU cache* with O(1) operations." — turns *...* into <em>
function highlightAsterisks(text) {
  const parts = text.split(/\*([^*]+)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>
  );
}

function difficultyPillClass(d) {
  if (d === 'Hard') return 'pill pill-coral';
  if (d === 'Medium') return 'pill pill-cream';
  return 'pill';
}

// Debounces a value by `delay` ms. Prevents the search box from firing a
// request on every keystroke.
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function QuestionBank() {
  const dispatch = useDispatch();
  const { all, total, filters, activeFilter, searchQuery, loading, error } = useSelector(
    (s) => s.questions
  );
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Refetch whenever the user changes filter or search (debounced).
  useEffect(() => {
    dispatch(fetchQuestions());
  }, [dispatch, activeFilter, debouncedSearch]);

  const handleFilter = (f) => {
    if (f !== activeFilter) dispatch(setFilter(f));
  };

  const handleBookmark = (q) => {
    dispatch(toggleBookmark({ id: q.id, bookmarked: q.bookmarked }));
  };

  return (
    <>
      <TopBar searchPlaceholder="Search questions…" />

      <div className="qb-layout">
        <h1 className="page-title">
          Interview <em>questions.</em> One search.
        </h1>
        <p className="page-subtitle" style={{ marginBottom: 32 }}>
          Filtered by role, company, topic, and difficulty. Bookmark what matters.
        </p>

        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            className="input"
            placeholder="Search title or content…"
            value={searchQuery}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            style={{ maxWidth: 480 }}
          />
        </div>

        <div className="qb-filters">
          {filters.map((f) => (
            <div
              key={f}
              className={`filter-chip${f === activeFilter ? ' active' : ''}`}
              onClick={() => handleFilter(f)}
            >
              {f === 'Bookmarked' ? '🔖 Bookmarked' : f}
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
            {error.message}
          </p>
        )}

        {loading && all.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: 24 }}>Loading questions…</p>
        ) : (
          <>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 12 }}>
              {total === 0 ? 'No matches' : `${all.length} of ${total} questions`}
              {loading && ' · refreshing…'}
            </div>

            <div className="q-grid">
              {all.map((q) => (
                <div
                  key={q.id}
                  className="q-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => dispatch(openQuestion(q.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      dispatch(openQuestion(q.id));
                    }
                  }}
                >
                  <div className="q-head">
                    <span className="pill">{q.category}</span>
                    <span
                      className={difficultyPillClass(q.difficulty)}
                      style={
                        q.difficulty === 'Easy'
                          ? { color: 'var(--success)', borderColor: 'var(--success)' }
                          : undefined
                      }
                    >
                      {q.difficulty}
                    </span>
                    <span
                      className="pill"
                      role="button"
                      title={q.bookmarked ? 'Remove bookmark' : 'Bookmark this'}
                      style={{
                        cursor: 'pointer',
                        marginLeft: 'auto',
                        color: q.bookmarked ? 'var(--lime)' : 'var(--text-dim)',
                        borderColor: q.bookmarked ? 'var(--lime-dim)' : 'var(--border)',
                      }}
                      onClick={(e) => {
                        // Keep the bookmark button from also opening the modal.
                        e.stopPropagation();
                        handleBookmark(q);
                      }}
                    >
                      {q.bookmarked ? '🔖 Saved' : '+ Bookmark'}
                    </span>
                  </div>
                  <h4>{highlightAsterisks(q.title)}</h4>
                  <p>{q.body}</p>
                  <div className="q-foot">
                    <span className="company">{q.companies}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {q.referenceUrl && (
                        <a
                          href={q.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: 'var(--lime)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          ↗ LeetCode
                        </a>
                      )}
                      <span>⏱ {q.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {all.length === 0 && !loading && (
              <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
                No questions match that filter.
              </p>
            )}
          </>
        )}
      </div>

      <QuestionDetailModal />
    </>
  );
}
