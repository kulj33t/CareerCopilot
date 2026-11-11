import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuthError, login, signup } from "../store/slices/authSlice.js";
import { authApi } from "../api/auth.js";
import BrandMark from "../components/BrandMark.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OAUTH_ERROR_MESSAGES = {
  access_denied: 'Sign-in was cancelled. You can try again whenever you’re ready.',
  invalid_state: 'We couldn’t verify that sign-in attempt. Please try again.',
  provider_timeout: 'The sign-in provider took too long to respond. Please try again.',
  provider_failed: 'We couldn’t complete sign-in with that provider. Please try again.',
  email_unverified: 'Your provider did not share a verified email. Use email sign-in or try another provider.',
};

function safeReturnTo(value) {
  const isInternalPath = (path) =>
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth');

  if (typeof value === 'string') return isInternalPath(value) ? value : '/dashboard';
  if (value && typeof value === 'object' && isInternalPath(value.pathname)) {
    return {
      pathname: value.pathname,
      search: typeof value.search === 'string' && value.search.startsWith('?') ? value.search : '',
      hash: typeof value.hash === 'string' && value.hash.startsWith('#') ? value.hash : '',
    };
  }
  return '/dashboard';
}

function validate(form, mode) {
  const errors = {};
  if (mode === "signup" && !form.name.trim())
    errors.name = "Please enter your full name.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(form.email))
    errors.email = "That doesn’t look like a valid email.";
  if (!form.password) errors.password = "Password is required.";
  else if (mode === "signup" && form.password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  return errors;
}

export default function Auth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const submitting = useSelector((s) => s.auth.submitting);
  const serverError = useSelector((s) => s.auth.error);
  const user = useSelector((s) => s.auth.user);

  const [mode, setMode] = useState(() =>
    searchParams.get("mode") === "login" ? "login" : "signup",
  );
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [providers, setProviders] = useState({
    google: false,
    linkedin: false,
  });
  const oauthError = searchParams.get("oauth_error");

  useEffect(() => {
    let cancelled = false;
    authApi.providers().then(
      (r) => {
        if (!cancelled) setProviders(r.providers || {});
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
    setMode((currentMode) => currentMode === nextMode ? currentMode : nextMode);
  }, [searchParams]);

  useEffect(() => {
    if (user) navigate(safeReturnTo(location.state?.from), { replace: true });
  }, [user, navigate, location.state]);

  useEffect(() => {
    if (oauthError) {
      const t = setTimeout(() => {
        searchParams.delete("oauth_error");
        setSearchParams(searchParams, { replace: true });
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [oauthError, searchParams, setSearchParams]);

  const showError = (field) =>
    (touched[field] || touched._submitted) && errors[field];

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

    const thunk = mode === "signup" ? signup : login;
    const result = await dispatch(thunk(form));
    if (thunk.fulfilled.match(result)) {
      navigate(safeReturnTo(location.state?.from), { replace: true });
    }
  };

  const switchMode = (e) => {
    e.preventDefault();
    const nextMode = mode === "signup" ? "login" : "signup";
    setMode(nextMode);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("mode", nextMode);
      return next;
    }, { replace: true });
    setTouched({});
    setErrors({});
    if (serverError) dispatch(clearAuthError());
  };

  const isSignup = mode === "signup";

  return (
    <div className="auth-wrap">
      <div className="auth-visual">
        <div className="auth-visual-content auth-brand-row">
          <Link to="/" className="auth-brand-link" aria-label="CareerCopilot home">
            <div className="auth-brand-lockup">
              <BrandMark />
              <strong>CareerCopilot</strong>
            </div>
          </Link>
        </div>
        <div className="auth-visual-copy">
          <p className="auth-eyebrow">CAREER PREPARATION</p>
          <h1 className="auth-quote">Make your next move <em>with confidence.</em></h1>
          <p className="auth-visual-description">
            A focused workspace to improve your resume, prepare for interviews, and decide what to work on next.
          </p>
          <div className="auth-benefits">
            <div><span>01</span><p><strong>See your strengths</strong><small>Get clear feedback on your resume.</small></p></div>
            <div><span>02</span><p><strong>Focus on the role</strong><small>Understand where your skills align.</small></p></div>
            <div><span>03</span><p><strong>Practice with direction</strong><small>Build confidence one session at a time.</small></p></div>
          </div>
        </div>
        <p className="auth-visual-note">Less noise. Clearer next steps.</p>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>
            {isSignup ? "Create your " : "Welcome "}
            <em>{isSignup ? "account" : "back"}</em>
          </h2>
          <p>
            {isSignup
              ? "Free forever. No credit card required."
              : "Sign in to pick up where you left off."}
          </p>

          {location.state?.reason === 'session-expired' && (
            <p role="status" style={{ color: 'var(--lime)', fontSize: 13, margin: '12px 0 0' }}>
              Your session expired. Sign in again to continue where you left off.
            </p>
          )}

          {isSignup && (
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input
                type="text"
                className="input"
                placeholder="Kuljeet Singh"
                value={form.name}
                onChange={set("name")}
                onBlur={blur("name")}
                style={
                  showError("name")
                    ? { borderColor: "var(--danger)" }
                    : undefined
                }
              />
              {showError("name") && (
                <p
                  style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}
                >
                  {errors.name}
                </p>
              )}
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="kuljeet@college.edu"
              value={form.email}
              onChange={set("email")}
              onBlur={blur("email")}
              style={
                showError("email")
                  ? { borderColor: "var(--danger)" }
                  : undefined
              }
            />
            {showError("email") && (
              <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>
                {errors.email}
              </p>
            )}
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder={isSignup ? "Minimum 8 characters" : "Your password"}
              value={form.password}
              onChange={set("password")}
              onBlur={blur("password")}
              style={
                showError("password")
                  ? { borderColor: "var(--danger)" }
                  : undefined
              }
            />
            {showError("password") && (
              <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>
                {errors.password}
              </p>
            )}
          </div>

          {serverError && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 4 }}>
              {serverError.message}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account →"
                : "Sign in →"}
          </button>

          {oauthError && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 13,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {OAUTH_ERROR_MESSAGES[oauthError] || 'We couldn’t complete sign-in. Please try again.'}
            </p>
          )}

          {(providers.google || providers.linkedin) && (
            <>
              <div className="auth-divider">or continue with</div>
              <div className="auth-oauth">
                {providers.google && (
                  <a
                    href="/api/auth/google"
                    className="btn btn-ghost"
                  >
                    Google
                  </a>
                )}
                {providers.linkedin && (
                  <a
                    href="/api/auth/linkedin"
                    className="btn btn-ghost"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </>
          )}

          <p className="auth-mode-switch">
            {isSignup ? "Already have an account? " : "New here? "}
            <Link to="#" onClick={switchMode} style={{ color: "var(--lime)" }}>
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-home-row"><Link to="/">Back to home</Link></p>
        </form>
      </div>
    </div>
  );
}
