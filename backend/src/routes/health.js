import { Router } from 'express';
import { dbStatus } from '../config/db.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { isLlmConfigured } from '../services/llm.js';

export const healthRouter = Router();

/**
 * GET /api/health
 * Lightweight status check. Reports whether each external dependency is
 * configured + (for Mongo) the live connection state. Useful for uptime
 * monitors and as a smoke test while onboarding.
 */
healthRouter.get('/', (req, res) => {
  const db = dbStatus();
  const ai = isLlmConfigured() ? 'configured' : 'not_configured';
  const storage = isCloudinaryConfigured() ? 'configured' : 'not_configured';

  // This app's user-facing routes require MongoDB, so missing configuration is unhealthy too.
  const dbHealthy = db === 'connected';
  const status = dbHealthy ? 200 : 503;

  res.status(status).json({
    ok: status === 200,
    uptime: Math.round(process.uptime()),
    db,
    ai,
    storage,
    timestamp: new Date().toISOString(),
  });
});
