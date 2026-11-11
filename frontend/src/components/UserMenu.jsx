import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice.js';

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

export default function UserMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const toggleMenu = () => {
    setOpen((value) => !value);
  };

  // Close on outside click + Esc
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await dispatch(logout());
    navigate('/');
  };

  return (
    <div ref={ref} className="account-control">
      <button
        type="button"
        className="account-trigger"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Close account menu' : `${user.name || 'Account'} menu`}
        title={open ? 'Close account menu' : 'Open account menu'}
      >
        <span className="avatar">{initialsOf(user.name)}</span>
        <span className="account-trigger-name">{user.name?.split(' ')[0] || 'Account'}</span>
        <svg className={`account-chevron${open ? ' is-open' : ''}`} viewBox="0 0 20 20" aria-hidden="true">
          {open ? <path d="m6 6 8 8m0-8-8 8" /> : <path d="m5 7.5 5 5 5-5" />}
        </svg>
      </button>

      {open && (
        <div role="menu" className="account-menu">
          <div className="account-menu-user">
            <span className="avatar">{initialsOf(user.name)}</span>
            <span className="account-menu-identity">
              <strong>{user.name || 'Account'}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="account-logout"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v11A1.5 1.5 0 0 0 4.5 17H8m4-3 4-4-4-4m4 4H7" /></svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
