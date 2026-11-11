import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapAuth } from '../store/slices/authSlice.js';

// Full-screen loader shown during the initial /api/auth/me bootstrap call.
// Avoids a flash of the login page for users who already have a valid cookie.
function AuthLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-muted)',
        fontSize: 14,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          className="mono"
          style={{ color: 'var(--lime)', letterSpacing: '0.15em', fontSize: 12, marginBottom: 8 }}
        >
          CAREERCOPILOT
        </div>
        Loading your session…
      </div>
    </div>
  );
}

export default function RequireAuth() {
  const dispatch = useDispatch();
  const { user, bootstrapped, sessionError, sessionExpired } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!bootstrapped) return <AuthLoader />;
  if (user) return <Outlet />;

  if (sessionError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text)' }}>Couldn’t verify your session</h2>
          <p>{sessionError.message || 'Check your connection and try again.'}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch(bootstrapAuth())}
          >
            Try again
          </button>
          <p style={{ marginTop: 16 }}>
            <Link to="/auth?mode=login" state={{ from: location }}>Go to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Navigate
      to="/auth?mode=login"
      replace
      state={{
        from: location,
        ...(sessionExpired ? { reason: 'session-expired' } : {}),
      }}
    />
  );
}
