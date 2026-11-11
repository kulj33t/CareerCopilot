import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { NavigationProvider } from './NavigationContext.jsx';

export default function AppLayout() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeNavigation = () => setNavigationOpen(false);

  useEffect(() => {
    if (!navigationOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const navigation = document.getElementById('app-navigation');
    const focusable = navigation?.querySelectorAll('a[href], button:not([disabled])') || [];
    focusable[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setNavigationOpen(false);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [navigationOpen]);

  return (
    <NavigationProvider value={{
      navigationOpen,
      toggleNavigation: () => setNavigationOpen((open) => !open),
      closeNavigation,
    }}>
      <div className="app-shell">
        <Sidebar
          mobileOpen={navigationOpen}
          onNavigate={closeNavigation}
        />
        {navigationOpen && (
          <button
            type="button"
            className="nav-backdrop"
            aria-label="Close navigation"
            onClick={closeNavigation}
          />
        )}
        <main className="view">
          <div className="screen">
            <Outlet />
          </div>
        </main>
      </div>
    </NavigationProvider>
  );
}
