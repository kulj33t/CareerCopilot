import { useEffect } from 'react';
import { Link, Navigate, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AppLayout from './components/AppLayout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ResumeUpload from './pages/ResumeUpload.jsx';
import JDMatch from './pages/JDMatch.jsx';
import QuestionBank from './pages/QuestionBank.jsx';
import CompanyDSA from './pages/CompanyDSA.jsx';
import PrepPlan from './pages/PrepPlan.jsx';
import InterviewSetup from './pages/InterviewSetup.jsx';
import InterviewChat from './pages/InterviewChat.jsx';
import Report from './pages/Report.jsx';
import { bootstrapAuth, markSessionExpired } from './store/slices/authSlice.js';
import { SESSION_EXPIRED_EVENT } from './api/client.js';

function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--text)',
        background: 'var(--bg)',
      }}
    >
      <section style={{ maxWidth: 480, textAlign: 'center' }}>
        <p className="mono" style={{ color: 'var(--lime)', letterSpacing: '0.14em' }}>404 · PAGE NOT FOUND</p>
        <h1 style={{ margin: '12px 0', fontFamily: 'var(--font-display)' }}>This page isn’t here.</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          The address may have changed, or the page may no longer be available.
        </p>
        <Link className="btn btn-primary" to="/" replace>Go to home</Link>
      </section>
    </main>
  );
}

export default function App() {
  const dispatch = useDispatch();

  // A 401 from a protected API call means the HttpOnly session cookie is no
  // longer usable. Clear private client state and let RequireAuth preserve the
  // current URL while sending the user to sign in.
  useEffect(() => {
    const onSessionExpired = () => dispatch(markSessionExpired());
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [dispatch]);

  // Ask the server "who am I?" on every app load. The cookie is the source of
  // truth, so we don't trust any cached client-side auth state.
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="/auth" element={<Auth />} />

      {/* Everything below requires an authenticated session */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume" element={<ResumeUpload />} />
          {/* Old split-page URL — kept as a 301-ish alias so deep links /
              dashboard stat cards that still point here keep working. */}
          <Route path="/resume/results" element={<Navigate to="/resume" replace />} />
          <Route path="/jd-match" element={<JDMatch />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/company-dsa" element={<CompanyDSA />} />
          <Route path="/prep" element={<PrepPlan />} />
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interview/chat" element={<InterviewChat />} />
          <Route path="/interview/report" element={<Report />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
