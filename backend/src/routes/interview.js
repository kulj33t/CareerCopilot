import { Router } from 'express';
import mongoose from 'mongoose';
import { InterviewSession } from '../models/InterviewSession.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import {
  endSessionWithReport,
  postUserAnswer,
  startSession,
} from '../services/interview.js';
import { parseBody } from '../validators/auth.js';
import { sendMessageSchema, setupSchema } from '../validators/interview.js';

export const interviewRouter = Router();

interviewRouter.use(requireAuth);

async function findOwnedSession(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const err = new Error('Invalid session id');
    err.status = 400;
    throw err;
  }
  const session = await InterviewSession.findById(req.params.id);
  if (!session || session.userId.toString() !== req.user._id.toString()) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
  return session;
}

/**
 * POST /api/interview/sessions
 * Starts a new session (Gemini generates the opening turn).
 * If an active session already exists, returns it — we never run parallel
 * sessions for the same user (see unique index on the model).
 */
interviewRouter.post('/sessions', llmLimiter, async (req, res, next) => {
  try {
    const setup = parseBody(setupSchema, req.body || {});

    const active = await InterviewSession.findOne({ userId: req.user._id, state: 'active' });
    if (active) return res.json({ session: active.toPublic(), reused: true });

    const session = await startSession({ user: req.user, setup });
    res.status(201).json({ session: session.toPublic(), reused: false });
  } catch (err) {
    next(err);
  }
});

/** GET /api/interview/sessions/active — current in-progress session, if any. */
interviewRouter.get('/sessions/active', async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ userId: req.user._id, state: 'active' });
    if (!session) return res.status(404).json({ error: { message: 'No active session' } });
    res.json({ session: session.toPublic() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/interview/sessions/:id — owned session (active or ended). */
interviewRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await findOwnedSession(req);
    res.json({ session: session.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interview/sessions/:id/messages
 * Body: { text }
 * Synchronous — waits for Gemini to respond, then returns the updated session.
 * Frontend shows a typing indicator during the wait.
 */
interviewRouter.post('/sessions/:id/messages', llmLimiter, async (req, res, next) => {
  try {
    const session = await findOwnedSession(req);
    if (session.state === 'ended') {
      return res.status(409).json({ error: { message: 'Session has already ended' } });
    }
    const { text } = parseBody(sendMessageSchema, req.body || {});
    const updated = await postUserAnswer(session, text);
    res.json({ session: updated.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interview/sessions/:id/end
 * Ends the session and generates the report. Idempotent — ending an
 * already-ended session just returns the existing report.
 */
interviewRouter.post('/sessions/:id/end', llmLimiter, async (req, res, next) => {
  try {
    const session = await findOwnedSession(req);
    const updated = await endSessionWithReport(session);
    res.json({ session: updated.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interview/sessions/:id/abandon
 * Marks the session ended WITHOUT generating a report. Unblocks users who
 * started an interview, closed the tab, and now want to start fresh — the
 * unique-active-session index otherwise refuses the new session.
 */
interviewRouter.post('/sessions/:id/abandon', async (req, res, next) => {
  try {
    const session = await findOwnedSession(req);
    if (session.state !== 'ended') {
      session.state = 'ended';
      session.endedAt = new Date();
      await session.save();
    }
    res.json({ session: session.toPublic() });
  } catch (err) {
    next(err);
  }
});
