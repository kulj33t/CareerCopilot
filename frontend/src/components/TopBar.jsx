import { useNavigation } from './NavigationContext.jsx';
import BrandMark from './BrandMark.jsx';
import SearchIcon from './SearchIcon.jsx';
import UserMenu from './UserMenu.jsx';

export default function TopBar({
  searchPlaceholder = 'Search resumes, questions, sessions…',
  rightContent,
}) {
  const { navigationOpen, toggleNavigation } = useNavigation();

  return (
    <header className="app-top">
      <div className="app-top-brand">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navigationOpen}
          aria-controls="app-navigation"
          onClick={toggleNavigation}
        >
          <span />
          <span />
          <span />
        </button>
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
