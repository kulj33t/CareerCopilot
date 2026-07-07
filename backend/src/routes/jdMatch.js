import { Router } from 'express';
import { Resume } from '../models/Resume.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import { matchJobDescription } from '../services/jdMatch.js';
import { parseBody } from '../validators/auth.js';
import { jdMatchSchema } from '../validators/jdMatch.js';

export const jdMatchRouter = Router();

jdMatchRouter.use(requireAuth);
jdMatchRouter.use(llmLimiter);

/**
 * POST /api/jd-match
 * Body: { resumeId, jdText }
 * Returns: { matchPct, summary, matching[], missing[], tip }
 *
 * Not cached — users tweak JDs and expect fresh results each call.
 */
jdMatchRouter.post('/', async (req, res, next) => {
  try {
    const { resumeId, jdText } = parseBody(jdMatchSchema, req.body);

    const resume = await Resume.findById(resumeId);
    if (!resume || resume.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: { message: 'Resume not found' } });
    }

    const result = await matchJobDescription({ resume, jdText });
    res.json({ match: result });
  } catch (err) {
    next(err);
  }
});
