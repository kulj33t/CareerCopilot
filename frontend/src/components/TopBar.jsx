import BrandMark from './BrandMark.jsx';
import SearchIcon from './SearchIcon.jsx';
import UserMenu from './UserMenu.jsx';

export default function TopBar({
  searchPlaceholder = 'Search resumes, questions, sessions…',
  rightContent,
}) {
  return (
    <header className="app-top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandMark />
        <strong style={{ fontSize: 15 }}>CareerCopilot</strong>
      </div>
      <div className="app-search">
        <SearchIcon />
        <input type="text" placeholder={searchPlaceholder} />
      </div>
      <div className="app-top-right">
        {rightContent}
        <UserMenu />
      </div>
    </header>
  );
}
