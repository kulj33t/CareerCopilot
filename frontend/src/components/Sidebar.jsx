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

export default function Sidebar() {
  const { theme, toggle } = useTheme();

  return (
    <aside className="nav">
      <div className="brand">
        <BrandMark />
        <div className="brand-name">CareerCopilot</div>
      </div>

      {sections.map((section) => (
        <div key={section.label}>
          <div className="nav-section-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="num">{item.num}</span> {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="nav-bottom">
        <button className="theme-toggle" onClick={toggle}>
          {theme === 'light' ? '🌙' : '☀️'}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </div>
    </aside>
  );
}
