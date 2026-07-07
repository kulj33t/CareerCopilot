import { Router } from 'express';
import mongoose from 'mongoose';
import { PrepPlan } from '../models/PrepPlan.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import { generatePrepPlan } from '../services/prepPlan.js';
import { parseBody } from '../validators/auth.js';
import { prepPlanInputSchema } from '../validators/prepPlan.js';

export const prepPlanRouter = Router();

prepPlanRouter.use(requireAuth);

/**
 * GET /api/prep-plan
 * Returns the current plan, auto-generating one if none exists yet.
 * Uses llmLimiter because the first call runs a Gemini generation.
 */
prepPlanRouter.get('/', llmLimiter, async (req, res, next) => {
  try {
    const existing = await PrepPlan.findOne({ userId: req.user._id });
    if (existing) return res.json({ plan: existing.toPublic(), generated: false });

    const plan = await generatePrepPlan({
      user: req.user,
      targetRole: 'Full-stack / SDE',
      experience: 'fresher',
      difficulty: 'medium',
      interviewDate: null,
      weakTopics: [],
    });
    res.json({ plan: plan.toPublic(), generated: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/prep-plan/regenerate
 * Body: { targetRole?, interviewDate?, weakTopics? }
 * Replaces the existing plan.
 */
prepPlanRouter.post('/regenerate', llmLimiter, async (req, res, next) => {
  try {
    const input = parseBody(prepPlanInputSchema, req.body || {});
    const plan = await generatePrepPlan({
      user: req.user,
      targetRole: input.targetRole || 'Full-stack / SDE',
      experience: input.experience || 'fresher',
      difficulty: input.difficulty || 'medium',
      interviewDate: input.interviewDate || null,
      weakTopics: input.weakTopics || [],
    });
    res.json({ plan: plan.toPublic(), generated: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/prep-plan/tasks/:taskId/toggle
 * Flips the `done` flag on a single task. Returns the whole updated plan
 * so the client stays in sync without a second fetch.
 */
prepPlanRouter.post('/tasks/:taskId/toggle', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.taskId)) {
      return res.status(400).json({ error: { message: 'Invalid task id' } });
    }

    const plan = await PrepPlan.findOne({ userId: req.user._id });
    if (!plan) return res.status(404).json({ error: { message: 'No prep plan found' } });

    const task = plan.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ error: { message: 'Task not found' } });

    task.done = !task.done;
    await plan.save();
    res.json({ plan: plan.toPublic() });
  } catch (err) {
    next(err);
  }
});
