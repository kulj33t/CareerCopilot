import { Router } from 'express';
import { dbStatus } from '../config/db.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { isLlmConfigured } from '../services/llm.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

/**
 * GET /api/health
 * Lightweight status check. Reports whether each external dependency is
 * configured + (for Mongo) the live connection state. Useful for uptime
 * monitors and as a smoke test while onboarding.
 */
healthRouter.get('/', (req, res) => {
  const db = dbStatus();
  const auth = env.JWT_SECRET ? 'configured' : 'not_configured';
  const ai = isLlmConfigured() ? 'configured' : 'not_configured';
  const storage = isCloudinaryConfigured() ? 'configured' : 'not_configured';

  // Auth and database are needed for the core app; AI and storage are reported
  // separately so optional provider outages do not mark the API as down.
  const ready = db === 'connected' && auth === 'configured';
  const status = ready ? 200 : 503;

  res.status(status).json({
    ok: status === 200,
    uptime: Math.round(process.uptime()),
    db,
    auth,
    ai,
    storage,
    timestamp: new Date().toISOString(),
  });
});
