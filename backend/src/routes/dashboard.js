import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { buildDashboard } from '../services/dashboard.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const dashboard = await buildDashboard(req.user._id);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});
