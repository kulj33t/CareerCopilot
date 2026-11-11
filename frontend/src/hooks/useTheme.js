import { useState, useEffect } from 'react';

const KEY = 'career-copilot-theme-tokyo-night-v1';

function getStored() {
  try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; }
}

export function useTheme() {
  const [theme, setTheme] = useState(getStored);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return { theme, toggle };
}
