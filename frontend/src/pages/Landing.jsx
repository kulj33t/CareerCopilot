import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark.jsx';
import { useTheme } from '../hooks/useTheme.js';

function ThemeGlyph({ theme }) {
  return theme === 'light' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.2 15.1A8.6 8.6 0 0 1 8.9 3.8 8.7 8.7 0 1 0 20.2 15.1Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.7" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  );
}

const features = [
  {
    number: '01',
    title: 'Improve your resume',
    copy: 'Get clear feedback on structure, impact, and how well your experience comes through.',
  },
  {
    number: '02',
    title: 'Focus on the role',
    copy: 'Compare your strengths with a job description and see which skills need more attention.',
  },
  {
    number: '03',
    title: 'Practice with purpose',
    copy: 'Work through role specific questions and realistic mock interviews at your own pace.',
  },
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  const themeLabel = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <main className="public-page">
      <header className="public-header">
        <Link to="/" className="public-brand" aria-label="CareerCopilot home">
          <BrandMark />
          <span>CareerCopilot</span>
        </Link>

        <div className="public-actions">
          <button
            type="button"
            className="public-theme-toggle"
            aria-label={themeLabel}
            title={themeLabel}
            onClick={toggle}
          >
            <ThemeGlyph theme={theme} />
          </button>
          <Link className="public-login" to="/auth?mode=login">Log in</Link>
          <Link className="public-signup" to="/auth?mode=signup">Sign up</Link>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-kicker"><span /> A clearer way to prepare</div>
          <h1>Show up to your next interview <span>ready.</span></h1>
          <p>
            Strengthen your resume, focus on the right skills, and practice with a plan built around the roles you want.
          </p>
          <div className="public-hero-actions">
            <Link to="/auth?mode=signup" className="public-primary-cta">Create your account <span aria-hidden="true">→</span></Link>
            <a href="#how-it-works" className="public-secondary-cta">See how it works</a>
          </div>
          <div className="public-capabilities" aria-label="CareerCopilot features">
            <span>Resume feedback</span>
            <span>Role matching</span>
            <span>Interview practice</span>
          </div>
        </div>

        <aside className="public-plan" aria-label="Preparation workflow">
          <div className="public-plan-top">
            <span>Your preparation</span>
            <span className="public-plan-status"><i /> Flexible</span>
          </div>
          <h2>A focused path to your next role.</h2>
          <ol>
            <li>
              <span className="public-step-number">01</span>
              <div><strong>Review your resume</strong><small>Make your experience easier to see</small></div>
            </li>
            <li>
              <span className="public-step-number">02</span>
              <div><strong>Find your focus</strong><small>Connect your skills to the role</small></div>
            </li>
            <li>
              <span className="public-step-number">03</span>
              <div><strong>Practice the conversation</strong><small>Build confidence one session at a time</small></div>
            </li>
          </ol>
          <div className="public-plan-foot">A practical workspace for your job search</div>
        </aside>
      </section>

      <section className="public-features" id="features">
        <div className="public-section-heading">
          <p className="public-eyebrow">One workspace, three useful tools</p>
          <h2>Make your preparation <span>count.</span></h2>
        </div>
        <div className="public-feature-grid">
          {features.map((feature) => (
            <article className="public-feature" key={feature.number}>
              <span className="public-feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-how" id="how-it-works">
        <div>
          <p className="public-eyebrow">Get started in a few steps</p>
          <h2>Less guessing.<br /><span>More useful practice.</span></h2>
        </div>
        <ol>
          <li><span>01</span><div><strong>Add your resume</strong><p>Start with the experience you already have.</p></div></li>
          <li><span>02</span><div><strong>Choose a target role</strong><p>Use a job description to guide your focus.</p></div></li>
          <li><span>03</span><div><strong>Practice and improve</strong><p>Turn feedback into your next concrete step.</p></div></li>
        </ol>
      </section>

      <section className="public-close">
        <div>
          <p className="public-eyebrow">CareerCopilot</p>
          <h2>Make your next move with confidence.</h2>
        </div>
        <Link to="/auth?mode=signup" className="public-primary-cta">Create your account <span aria-hidden="true">→</span></Link>
      </section>

    </main>
  );
}
