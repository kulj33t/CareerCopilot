import { useEffect } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
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
import { bootstrapAuth } from './store/slices/authSlice.js';

export default function App() {
  const dispatch = useDispatch();

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
    </Routes>
  );
}
