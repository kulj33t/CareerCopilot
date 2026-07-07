import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import TopBar from '../components/TopBar.jsx';
import { fetchDashboard } from '../store/slices/userSlice.js';

function Heatmap({ cells }) {
  // Fall back to an empty grid if the server hasn't returned yet.
  if (!cells || cells.length === 0) {
    return (
      <div className="heatmap-grid">
        {Array.from({ length: 84 }).map((_, i) => (
          <div key={i} className="heatmap-cell" />
        ))}
      </div>
    );
  }
  return (
    <div className="heatmap-grid">
      {cells.map((c, i) => (
        <div
          key={i}
          className={`heatmap-cell${c.level > 0 ? ' l' + c.level : ''}`}
          title={`${new Date(c.date).toLocaleDateString()}: ${c.level === 0 ? 'no activity' : 'level ' + c.level}`}
        />
      ))}
    </div>
  );
}

function topicColor(key) {
  return `var(--${key})`;
}

function signed(delta) {
  if (delta > 0) return `↑ ${delta}`;
  if (delta < 0) return `↓ ${Math.abs(delta)}`;
  return '—';
}

function trendClass(delta) {
  return `trend${delta < 0 ? ' down' : ''}`;
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { stats, recommendations, activity, weakTopics, heatmap, loading, loaded, error } =
    useSelector((s) => s.user);
  const authUser = useSelector((s) => s.auth.user);
  const firstName = (authUser?.name || 'there').split(' ')[0];

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  const onRecClick = (rec) => {
    // Simple keyword mapping from recommendation title → destination route.
    const t = rec.title.toLowerCase();
    if (t.includes('resume')) navigate('/resume');
    else if (t.includes('mock')) navigate('/interview/setup');
    else if (t.includes('match your resume')) navigate('/jd-match');
    else if (t.includes('weakest') || t.includes('topic')) navigate('/prep');
    else navigate('/prep');
  };

  const heroHeadline =
    stats.streak >= 7
      ? "you're on fire."
      : stats.streak >= 3
      ? "keep it rolling."
      : 'ready to ramp up?';

  return (
    <>
      <TopBar
        rightContent={
          <span className="pill pill-lime">🔥 {stats.streak}-day streak</span>
        }
      />

      <div className="page-hero">
        <div>
          <h1>
            Hey {firstName} — <em>{heroHeadline}</em>
          </h1>
          <div className="page-hero-meta">
            {loading && !loaded
              ? 'Loading your progress…'
              : error
              ? `Couldn't load your dashboard: ${error.message}`
              : "Here's what's happening with your prep journey today."}
          </div>
        </div>
        <div className="streak-card">
          <div className="streak-num">{stats.streak}</div>
          <div className="streak-label">Day Streak</div>
        </div>
      </div>

      <div className="dash-grid">
        <div
          className="stat-card"
          style={{ gridColumn: 'span 3', cursor: 'pointer' }}
          onClick={() => navigate('/resume')}
        >
          <div className="label">Resume Score</div>
          <div className="value">
            {stats.resumeScore}
            <span style={{ color: 'var(--text-dim)', fontSize: 20 }}>/100</span>
          </div>
          <div className={trendClass(stats.resumeDelta)}>
            {stats.resumeScore > 0 ? `${signed(stats.resumeDelta)} from last version` : 'No analysis yet'}
          </div>
        </div>
        <div
          className="stat-card"
          style={{ gridColumn: 'span 3', cursor: 'pointer' }}
          onClick={() => navigate('/interview/setup')}
        >
          <div className="label">Mock Interviews</div>
          <div className="value">{stats.mockInterviews}</div>
          <div className="trend">
            {stats.mockInterviews === 0 ? 'Run your first' : signed(stats.mockInterviewsWeek) + ' this week'}
          </div>
        </div>
        <div
          className="stat-card"
          style={{ gridColumn: 'span 3', cursor: 'pointer' }}
          onClick={() => navigate('/questions')}
        >
          <div className="label">Questions Practiced</div>
          <div className="value">{stats.questionsPracticed}</div>
          <div className="trend">{signed(stats.questionsWeek)} this week</div>
        </div>
        <div className="stat-card" style={{ gridColumn: 'span 3' }}>
          <div className="label">Avg. Performance</div>
          <div className="value">
            {stats.avgPerformance}
            <span style={{ color: 'var(--text-dim)', fontSize: 20 }}>/10</span>
          </div>
          <div className={trendClass(stats.avgDelta)}>
            {stats.mockInterviews === 0 ? 'Complete a mock to see' : signed(stats.avgDelta) + ' this week'}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-head">
            <h3><em>Recommended</em> for you</h3>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {recommendations.length === 0 && loaded && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                You&apos;re all caught up — nice work.
              </p>
            )}
            {recommendations.map((r, i) => (
              <div key={i} className="rec-card" onClick={() => onRecClick(r)}>
                <div className="rec-icon">{r.icon}</div>
                <div>
                  <h5>{r.title}</h5>
                  <p>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-head">
            <h3>Recent <em>activity</em></h3>
          </div>
          {activity.length === 0 && loaded && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
              Nothing yet — your actions will show up here.
            </p>
          )}
          {activity.map((a) => (
            <div key={a.id} className="activity-item">
              <div className="activity-dot" />
              <div className="body">
                <h5>{a.title}</h5>
                <div className="meta">{a.meta}</div>
              </div>
              {a.score && <div className="score">{a.score}</div>}
            </div>
          ))}
        </div>

        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="card-head">
            <h3>Your <em>grind</em></h3>
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              LAST 84 DAYS
            </span>
          </div>
          <Heatmap cells={heatmap} />
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-head">
            <h3>Weak <em>topics</em></h3>
          </div>
          {weakTopics.length === 0 && loaded && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Complete a mock interview to surface weak areas.
            </p>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {weakTopics.map((t) => (
              <div key={t.name}>
                <div className="topic-row">
                  <span>{t.name}</span>
                  <span className="mono" style={{ color: topicColor(t.color) }}>
                    {t.pct}%
                  </span>
                </div>
                <div className="topic-bar">
                  <div
                    className="topic-bar-fill"
                    style={{ width: `${t.pct}%`, background: topicColor(t.color) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
