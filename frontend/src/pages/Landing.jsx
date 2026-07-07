import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark.jsx';
import { useTheme } from '../hooks/useTheme.js';

// 12 cols x 7 rows = 84 days, matching the "Last 84 days" label
const MINI_HEATMAP = (() => {
  const out = [];
  let seed = 19;
  for (let i = 0; i < 84; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    let cls = 'heatmap-cell';
    if (r > 0.82) cls += ' l4';
    else if (r > 0.62) cls += ' l3';
    else if (r > 0.42) cls += ' l2';
    else if (r > 0.22) cls += ' l1';
    out.push(cls);
  }
  return out;
})();

export default function Landing() {
  const { theme, toggle } = useTheme();

  return (
    <section>
      <header className="landing-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark />
          <strong style={{ fontSize: 15 }}>CareerCopilot</strong>
        </div>
        <nav>
          <a href="#features">Features</a>
          <Link to="/auth">Log in</Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="landing-theme-toggle" onClick={toggle} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <Link to="/auth" className="btn btn-primary">Get started</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-badge">
          <span className="dot" /> Now live — free for students
        </div>
        <h1>
          The <em>fair advantage</em>
          <br />
          for your next interview.
        </h1>
        <p>
          AI-powered resume analysis, job-matching, mock interviews, and prep plans.
          Built for Indian job seekers. Free forever.
        </p>
        <div className="hero-ctas">
          <Link to="/auth" className="btn btn-primary btn-lg">Start free →</Link>
        </div>
        <div className="hero-meta">
          <div><strong>12,840+</strong> resumes analyzed</div>
          <div><strong>3,200+</strong> mock interviews</div>
          <div><strong>4.8/5</strong> user rating</div>
        </div>
      </section>

      <section id="features" className="section-head">
        <div className="eyebrow">What you get</div>
        <h2>
          One platform. <em>Every stage</em> of the job hunt.
        </h2>
      </section>

      <section className="bento">
        <div className="bento-card bento-span-4 bento-featured bento-tall">
          <div className="bento-icon">📄</div>
          <h3>Resume, <em>analyzed.</em></h3>
          <p style={{ maxWidth: 440 }}>
            Upload once. Get 5-dimension scoring, ATS compatibility checks, and specific line-by-line rewrites powered by AI.
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
            <div>
              <div className="mono" style={{ color: 'var(--lime)', fontSize: 32 }}>82</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>OVERALL SCORE</div>
            </div>
            <div>
              <div className="mono" style={{ color: 'var(--lime)', fontSize: 32 }}>9/12</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>ATS CHECKS</div>
            </div>
            <div>
              <div className="mono" style={{ color: 'var(--lime)', fontSize: 32 }}>24</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>SUGGESTIONS</div>
            </div>
          </div>
        </div>
        <div className="bento-card bento-span-2 bento-tall">
          <div className="bento-icon">🎯</div>
          <h3><em>Match</em> any JD.</h3>
          <p>Paste a job description. See exactly where you fit and what&apos;s missing.</p>
        </div>
        <div className="bento-card bento-span-2">
          <div className="bento-icon">🎙️</div>
          <h3>Mock <em>interviews.</em></h3>
          <p>Text or voice. AI interviewer adapts to your level.</p>
        </div>
        <div className="bento-card bento-span-2">
          <div className="bento-icon">📚</div>
          <h3>2,000+ <em>questions.</em></h3>
          <p>Filtered by role, company, and topic.</p>
        </div>
        <div className="bento-card bento-span-2">
          <div className="bento-icon">📈</div>
          <h3>Track <em>progress.</em></h3>
          <p>Daily streaks, weak-topic heatmaps, smart recommendations.</p>
        </div>
      </section>

      <section className="section-head">
        <div className="eyebrow">A peek inside</div>
        <h2>The whole product, <em>at a glance.</em></h2>
      </section>

      <section className="preview-strip">
        <Link to="/dashboard" className="preview-card feature" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="preview-card-head">
            <h4>Your <em>dashboard</em></h4>
            <span className="preview-card-tag">01 · Home</span>
          </div>
          <div className="preview-body">
            <div className="mini-dash-greeting">
              <div>
                <div className="mini-dash-greet-small">Hey Piyush —</div>
                <div className="mini-dash-greet-big">you&apos;re on <em>fire.</em></div>
              </div>
              <div className="mini-streak-badge">
                <div className="mini-streak-num">7</div>
                <div className="mini-streak-label">Day streak</div>
              </div>
            </div>

            <div className="mini-stat-grid">
              <div className="mini-stat">
                <div className="label">Resume</div>
                <div className="value">82<span className="suffix">/100</span></div>
                <div className="trend">↑ 14 vs last</div>
              </div>
              <div className="mini-stat">
                <div className="label">Mocks</div>
                <div className="value">14</div>
                <div className="trend">↑ 4 this wk</div>
              </div>
              <div className="mini-stat">
                <div className="label">Practice</div>
                <div className="value">127</div>
                <div className="trend">↑ 23 this wk</div>
              </div>
              <div className="mini-stat">
                <div className="label">Avg score</div>
                <div className="value">7.4<span className="suffix">/10</span></div>
                <div className="trend">↑ 0.6 this wk</div>
              </div>
            </div>

            <div className="mini-dash-split">
              <div className="mini-dash-col">
                <div className="mini-dash-col-head">
                  <h5>Your <em>grind</em></h5>
                  <span className="mono">Last 84 days</span>
                </div>
                <div className="mini-heatmap">
                  {MINI_HEATMAP.map((cls, i) => (
                    <div key={i} className={cls} />
                  ))}
                </div>
              </div>

              <div className="mini-dash-col">
                <div className="mini-dash-col-head">
                  <h5>Weak <em>topics</em></h5>
                </div>
                <div className="mini-topic-list">
                  {[
                    { name: 'Dynamic Programming', pct: 42, color: 'danger' },
                    { name: 'System Design', pct: 55, color: 'warning' },
                    { name: 'Graphs', pct: 61, color: 'warning' },
                    { name: 'Behavioral', pct: 78, color: 'success' },
                  ].map((t) => (
                    <div key={t.name}>
                      <div className="mini-topic-row">
                        <span>{t.name}</span>
                        <span className="mono" style={{ color: `var(--${t.color})` }}>{t.pct}%</span>
                      </div>
                      <div className="mini-topic-bar">
                        <div
                          className="mini-topic-bar-fill"
                          style={{ width: `${t.pct}%`, background: `var(--${t.color})` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Link>

        <div className="preview-strip-row">
          <Link to="/resume/results" className="preview-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="preview-card-head">
              <h4>Resume, <em>scored</em></h4>
              <span className="preview-card-tag">02 · Analysis</span>
            </div>
            <div className="mini-resume">
              <div className="mini-ring">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle className="ring-bg" cx="65" cy="65" r="58" />
                  <circle
                    className="ring-fill"
                    cx="65"
                    cy="65"
                    r="58"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * 0.18}
                  />
                </svg>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div className="mini-ring-num">82</div>
                  <div className="mini-ring-label">Score</div>
                </div>
              </div>
              <div className="mini-dims">
                {[
                  { label: 'Clarity', v: 85 },
                  { label: 'Impact', v: 68, warn: true },
                  { label: 'ATS', v: 91 },
                  { label: 'Skill Fit', v: 72, warn: true },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="mini-dim-row">
                      <strong>{d.label}</strong>
                      <span>{d.v}</span>
                    </div>
                    <div className="mini-dim-bar">
                      <div
                        className="mini-dim-bar-fill"
                        style={{ width: `${d.v}%`, background: d.warn ? 'var(--warning)' : 'var(--lime)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          <Link to="/interview/chat" className="preview-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="preview-card-head">
              <h4><em>Mock</em> interview</h4>
              <span className="preview-card-tag">03 · Live session</span>
            </div>
            <div className="mini-chat">
              <div className="mini-msg">
                <div className="mini-msg-avatar">C</div>
                <div>
                  <div className="mini-msg-bubble">
                    Explain the difference between <code style={{ background: 'var(--bg-elev-3)', padding: '1px 4px', borderRadius: 3 }}>let</code>, <code style={{ background: 'var(--bg-elev-3)', padding: '1px 4px', borderRadius: 3 }}>const</code>, and <code style={{ background: 'var(--bg-elev-3)', padding: '1px 4px', borderRadius: 3 }}>var</code>.
                  </div>
                </div>
              </div>
              <div className="mini-msg mini-msg-user">
                <div className="mini-msg-avatar">PT</div>
                <div>
                  <div className="mini-msg-bubble">
                    var is function-scoped and hoisted. let &amp; const are block-scoped with TDZ…
                  </div>
                </div>
              </div>
              <div className="mini-msg">
                <div className="mini-msg-avatar">C</div>
                <div>
                  <div className="mini-msg-bubble">Good, clear answer. You covered scoping and the TDZ.</div>
                  <div className="mini-msg-feedback">Rating: 8/10 — Strong · ✓ Complete · ✓ Accurate</div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="preview-strip-row">
          <Link to="/jd-match" className="preview-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="preview-card-head">
              <h4>JD <em>matcher</em></h4>
              <span className="preview-card-tag">04 · Tailored fit</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--lime)', lineHeight: 1 }}>
                  74<span style={{ fontSize: 22 }}>%</span>
                </div>
                <div className="mini-ring-label">Match</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Matching (7)
                </div>
                <div className="skill-pills" style={{ marginBottom: 10 }}>
                  {['JavaScript', 'Node.js', 'REST', 'Git', 'SQL'].map((s) => (
                    <span key={s} className="pill pill-lime">{s}</span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--coral)', marginBottom: 6 }}>
                  Missing (3)
                </div>
                <div className="skill-pills">
                  {['Docker', 'Kafka', 'PostgreSQL'].map((s) => (
                    <span key={s} className="pill pill-coral">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>

          <Link to="/questions" className="preview-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="preview-card-head">
              <h4>Question <em>bank</em></h4>
              <span className="preview-card-tag">05 · 2,000+ Qs</span>
            </div>
            <div className="mini-q">
              <div className="mini-q-card">
                <div className="mini-q-tags">
                  <span className="pill">DSA</span>
                  <span className="pill pill-coral">Hard</span>
                </div>
                <h5>Design an <em>LRU cache</em> with O(1) operations.</h5>
                <div className="meta">
                  <span className="company">Amazon · Google · Meta</span> · ⏱ 25 min
                </div>
              </div>
              <div className="mini-q-card">
                <div className="mini-q-tags">
                  <span className="pill">Behavioral</span>
                  <span className="pill" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                    Easy
                  </span>
                </div>
                <h5>Tell me about a time you <em>disagreed</em> with a team member.</h5>
                <div className="meta">
                  <span className="company">All companies</span> · ⏱ 5 min
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="section-head">
        <div className="eyebrow">How it works</div>
        <h2>Go from <em>confused</em> to <em>confident</em> in four steps.</h2>
      </section>

      <section className="steps">
        <div className="step">
          <div className="step-num">01</div>
          <h4>Upload your resume</h4>
          <p>Drop a PDF or DOCX. We extract every detail in under 10 seconds.</p>
        </div>
        <div className="step">
          <div className="step-num">02</div>
          <h4>Get AI feedback</h4>
          <p>Scoring, rewrites, and ATS checks — more useful than three senior reviewers.</p>
        </div>
        <div className="step">
          <div className="step-num">03</div>
          <h4>Practice daily</h4>
          <p>Follow your personalized 7-day plan. Build streaks. Master weak topics.</p>
        </div>
        <div className="step">
          <div className="step-num">04</div>
          <h4>Ace the interview</h4>
          <p>Voice or text mock sessions simulate the real thing — with instant feedback.</p>
        </div>
      </section>

      <section className="cta-big">
        <div className="cta-big-inner card-cream">
          <h2>Ready to <em>get hired?</em></h2>
          <p>Free to start. No credit card. Built for Indian students and young professionals.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            <Link to="/auth" className="btn btn-orange btn-lg">Create your account →</Link>
            <a href="#features" className="btn btn-on-cream btn-lg">See features</a>
          </div>
        </div>
      </section>

      <div className="sunset-stripe" />

      <footer className="site-footer">
        <div>© 2026 CareerCopilot. All rights reserved.</div>
        <div>Privacy · Terms · Contact</div>
      </footer>
    </section>
  );
}
