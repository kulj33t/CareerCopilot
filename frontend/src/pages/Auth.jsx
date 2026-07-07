import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, login, signup } from '../store/slices/authSlice.js';
import { authApi } from '../api/auth.js';
import { API_BASE } from '../api/client.js';
import BrandMark from '../components/BrandMark.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, mode) {
  const errors = {};
  if (mode === 'signup' && !form.name.trim()) errors.name = 'Please enter your full name.';
  if (!form.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(form.email)) errors.email = 'That doesn’t look like a valid email.';
  if (!form.password) errors.password = 'Password is required.';
  else if (mode === 'signup' && form.password.length < 8)
    errors.password = 'Password must be at least 8 characters.';
  return errors;
}

export default function Auth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const submitting = useSelector((s) => s.auth.submitting);
  const serverError = useSelector((s) => s.auth.error);

  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [providers, setProviders] = useState({ google: false, linkedin: false });
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthError = searchParams.get('oauth_error');

  useEffect(() => {
    let cancelled = false;
    authApi.providers().then(
      (r) => { if (!cancelled) setProviders(r.providers || {}); },
      () => {}
    );
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Surface OAuth errors briefly, then strip the query param so a refresh
    // doesn't keep re-showing the same message.
    if (oauthError) {
      const t = setTimeout(() => {
        searchParams.delete('oauth_error');
        setSearchParams(searchParams, { replace: true });
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [oauthError, searchParams, setSearchParams]);

  const showError = (field) => (touched[field] || touched._submitted) && errors[field];

  const runValidation = (nextForm) => {
    const e = validate(nextForm, mode);
    setErrors(e);
    return e;
  };

  const set = (field) => (e) => {
    const value = e.target.value;
    const next = { ...form, [field]: value };
    setForm(next);
    runValidation(next);
    if (serverError) dispatch(clearAuthError());
  };

  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((t) => ({ ...t, _submitted: true }));
    const found = runValidation(form);
    if (Object.keys(found).length > 0) return;

    const thunk = mode === 'signup' ? signup : login;
    const result = await dispatch(thunk(form));
    if (thunk.fulfilled.match(result)) navigate('/dashboard');
  };

  const switchMode = (e) => {
    e.preventDefault();
    setMode((m) => (m === 'signup' ? 'login' : 'signup'));
    setTouched({});
    setErrors({});
    if (serverError) dispatch(clearAuthError());
  };

  const isSignup = mode === 'signup';

  return (
    <div className="auth-wrap">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark />
            <strong>CareerCopilot</strong>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="auth-quote">
            Ace every<br /><em>interview.</em>
          </div>

          {/* Mock interview chat card */}
          <div className="auth-product-card">
            {/* Card header */}
            <div className="auth-card-header">
              <div>
                <div className="auth-card-label">Mock Interview</div>
                <div className="auth-card-filename">Software Engineer · System Design</div>
              </div>
              <div className="auth-session-badge">● Live</div>
            </div>

            {/* AI message */}
            <div className="auth-msg">
              <div className="auth-msg-avatar">C</div>
              <div className="auth-msg-bubble">
                Walk me through designing a URL shortener at scale — cover storage, hashing, and caching.
              </div>
            </div>

            {/* User message */}
            <div className="auth-msg auth-msg-user">
              <div className="auth-msg-bubble auth-msg-bubble-user">
                I'd use a base-62 hash for short codes, store mappings in Postgres with a Redis cache for hot links, and add a CDN layer for global latency…
              </div>
              <div className="auth-msg-avatar auth-msg-avatar-user">PT</div>
            </div>

            {/* Feedback pill */}
            <div className="auth-card-tip">
              <span style={{ color: 'rgba(255,255,255,0.55)', marginRight: 8 }}>AI Feedback</span>
              <strong>8.5 / 10</strong>
              <span style={{ marginLeft: 10, opacity: 0.7 }}>✓ Structured &nbsp;✓ Deep</span>
            </div>
          </div>
        </div>

        {/* Feature chips */}
        <div className="auth-feature-list">
          <div className="auth-chips">
            {['⚡ 2,000+ Questions', '📄 AI Resume Scorer', '🎯 JD Fit Analysis', '📈 Prep Plans'].map((c) => (
              <span key={c} className="auth-chip">{c}</span>
            ))}
          </div>
          <div className="auth-feature-footer">Free forever · No credit card · Built for India</div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>
            {isSignup ? 'Create your ' : 'Welcome '}
            <em>{isSignup ? 'account' : 'back'}</em>
          </h2>
          <p>{isSignup ? 'Free forever. No credit card required.' : 'Sign in to pick up where you left off.'}</p>

          {isSignup && (
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input
                type="text"
                className="input"
                placeholder="Piyush Thakur"
                value={form.name}
                onChange={set('name')}
                onBlur={blur('name')}
                style={showError('name') ? { borderColor: 'var(--danger)' } : undefined}
              />
              {showError('name') && (
                <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.name}</p>
              )}
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@college.edu"
              value={form.email}
              onChange={set('email')}
              onBlur={blur('email')}
              style={showError('email') ? { borderColor: 'var(--danger)' } : undefined}
            />
            {showError('email') && (
              <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.email}</p>
            )}
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder={isSignup ? 'Minimum 8 characters' : 'Your password'}
              value={form.password}
              onChange={set('password')}
              onBlur={blur('password')}
              style={showError('password') ? { borderColor: 'var(--danger)' } : undefined}
            />
            {showError('password') && (
              <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.password}</p>
            )}
          </div>

          {serverError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>
              {serverError.message}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting
              ? isSignup ? 'Creating account…' : 'Signing in…'
              : isSignup ? 'Create account →' : 'Sign in →'}
          </button>

          {oauthError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              Sign-in failed: {decodeURIComponent(oauthError)}
            </p>
          )}

          {(providers.google || providers.linkedin) && (
            <>
              <div className="auth-divider">or continue with</div>
              <div className="auth-oauth">
                {providers.google && (
                  <a href={`${API_BASE}/api/auth/google`} className="btn btn-ghost">Google</a>
                )}
                {providers.linkedin && (
                  <a href={`${API_BASE}/api/auth/linkedin`} className="btn btn-ghost">LinkedIn</a>
                )}
              </div>
            </>
          )}

          <p style={{ marginTop: 32, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <Link to="#" onClick={switchMode} style={{ color: 'var(--lime)' }}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
