import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

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
  const { user, bootstrapped } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!bootstrapped) return <AuthLoader />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
