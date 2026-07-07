import { Router } from 'express';
import mongoose from 'mongoose';
import { CompanyQuestion } from '../models/CompanyQuestion.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import {
  getScrapeStatus,
  syncIfChanged,
} from '../services/companyQuestionScrape.js';
import { generateAnswerFields } from '../services/questionAnswer.js';

export const companyQuestionsRouter = Router();

companyQuestionsRouter.use(requireAuth);

/**
 * GET /api/company-questions/companies
 * Returns distinct companies with the count of problems we have for each,
 * sorted alphabetically. Powers the company picker sidebar.
 */
companyQuestionsRouter.get('/companies', async (req, res, next) => {
  try {
    const rows = await CompanyQuestion.aggregate([
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      companies: rows.map((r) => ({ name: r._id, count: r.count })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/company-questions?company=&difficulty=&q=&limit=&offset=
 * Paginated problem list for a given company. Sorted by frequency desc.
 */
companyQuestionsRouter.get('/', async (req, res, next) => {
  try {
    const { company, difficulty, q } = req.query;
    if (!company) {
      return res.status(400).json({ error: { message: '`company` query param is required' } });
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const filter = { company };
    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(String(difficulty).toUpperCase())) {
      filter.difficulty = String(difficulty).toUpperCase();
    }
    if (q && String(q).trim()) {
      filter.title = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      CompanyQuestion.find(filter)
        .sort({ frequency: -1, title: 1 })
        .skip(offset)
        .limit(limit),
      CompanyQuestion.countDocuments(filter),
    ]);

    res.json({
      company,
      total,
      nextOffset: offset + items.length < total ? offset + items.length : null,
      problems: items.map((i) => i.toPublic()),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/company-questions/status
 * Reports when we last synced from the upstream repo and the current SHA.
 * Used by the UI to show a "fresh/stale" indicator.
 */
companyQuestionsRouter.get('/status', async (req, res, next) => {
  try {
    res.json(await getScrapeStatus());
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/company-questions/reseed
 * Dev-only: forces an immediate sync regardless of the stored SHA.
 * Returns immediately; the scrape runs asynchronously.
 */
/**
 * GET /api/company-questions/:id/answer
 * Returns the embedded cached answer, or 404 if none yet.
 */
companyQuestionsRouter.get('/:id/answer', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    const q = await CompanyQuestion.findById(req.params.id);
    if (!q) return res.status(404).json({ error: { message: 'Question not found' } });
    const answer = q.answerPublic();
    if (!answer) return res.status(404).json({ error: { message: 'No answer yet' } });
    res.json({ answer, question: q.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/company-questions/:id/answer
 * Idempotent — returns cached if present, generates otherwise. Cached result
 * is embedded directly on the CompanyQuestion doc (one cache across all users
 * since problem answers don't vary per candidate).
 * ?force=true bypasses the cache.
 */
companyQuestionsRouter.post('/:id/answer', llmLimiter, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    const q = await CompanyQuestion.findById(req.params.id);
    if (!q) return res.status(404).json({ error: { message: 'Question not found' } });

    const force = req.query.force === 'true';
    if (!force && q.answer && q.answer.tldr) {
      return res.json({ answer: q.answerPublic(), question: q.toPublic(), cached: true });
    }

    // Reuse the exact same prompt machinery as the in-house Question bank.
    // We pass the CompanyQuestion shape in — the prompt only cares about
    // title/category/difficulty/body.
    const fields = await generateAnswerFields({
      title: q.title,
      body: `Difficulty: ${q.difficulty}. ${q.topics?.length ? 'Topics: ' + q.topics.join(', ') + '.' : ''} This is a ${q.company} interview problem. LeetCode link: ${q.link || 'n/a'}`,
      category: 'DSA',
      difficulty: q.difficulty === 'EASY' ? 'Easy' : q.difficulty === 'HARD' ? 'Hard' : 'Medium',
    });

    q.answer = { ...fields, generatedAt: new Date() };
    await q.save();
    res.json({ answer: q.answerPublic(), question: q.toPublic(), cached: false });
  } catch (err) {
    next(err);
  }
});

companyQuestionsRouter.post('/reseed', async (req, res, next) => {
  try {
    syncIfChanged({ force: true })
      .then((r) => console.log('[company-scrape] forced reseed done:', r.scraped ? 'scraped' : 'no-op'))
      .catch((e) => console.error('[company-scrape] forced reseed failed:', e.message));
    res.json({ ok: true, message: 'Sync triggered — check server logs for progress.' });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
