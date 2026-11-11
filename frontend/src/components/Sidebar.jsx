import { NavLink } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import { useTheme } from '../hooks/useTheme.js';

const sections = [
  {
    label: 'Core App',
    items: [
      { to: '/dashboard', num: '01', label: 'Dashboard' },
      // Upload + analysis now live on the same page.
      { to: '/resume', num: '02', label: 'Resume Analyzer' },
      { to: '/jd-match', num: '03', label: 'JD Matcher' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/questions', num: '04', label: 'Question Bank' },
      { to: '/company-dsa', num: '05', label: 'Company-wise DSA Prep' },
      { to: '/prep', num: '06', label: 'Prep Plan' },
    ],
  },
  {
    label: 'Interview',
    items: [
      { to: '/interview/setup', num: '07', label: 'Setup' },
      { to: '/interview/chat', num: '08', label: 'Live Session' },
      { to: '/interview/report', num: '09', label: 'Session Report' },
    ],
  },
];

function ThemeIcon({ theme }) {
  return theme === 'light' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.1A8.6 8.6 0 0 1 8.9 3.8 8.7 8.7 0 1 0 20.2 15.1Z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.7" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
  );
}

export default function Sidebar({ mobileOpen = false, onNavigate = () => {} }) {
  const { theme, toggle } = useTheme();

  return (
    <aside
      id="app-navigation"
      className={`nav${mobileOpen ? ' nav-open' : ''}`}
      role="dialog"
      aria-modal={mobileOpen ? 'true' : undefined}
      aria-label="App navigation"
      aria-hidden={!mobileOpen}
    >
      <div className="nav-brand-row">
        <div className="brand">
          <BrandMark />
          <div className="brand-name">CareerCopilot</div>
        </div>
        <button type="button" className="nav-close-btn" aria-label="Close navigation" onClick={onNavigate}>
          ×
        </button>
      </div>

      {sections.map((section) => (
        <div key={section.label}>
          <div className="nav-section-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="num">{item.num}</span> {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="nav-bottom">
        <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          <ThemeIcon theme={theme} />
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </div>
    </aside>
  );
}
