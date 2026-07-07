import { Router } from 'express';
import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { QuestionBookmark } from '../models/QuestionBookmark.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import {
  findExistingAnswer,
  generateQuestionAnswer,
} from '../services/questionAnswer.js';

export const questionsRouter = Router();

questionsRouter.use(requireAuth);

// Question bank is small (< ~300 items total) so a one-shot fetch of every
// match is cheap and lets the frontend skip pagination entirely.
const MAX_LIMIT = 300;
const DEFAULT_LIMIT = 50;

function parsePaging(req) {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  return { limit, offset };
}

function buildFilter(req) {
  const filter = {};
  const { category, company, difficulty, q, bookmarked } = req.query;

  if (category && category !== 'All') filter.category = category;
  if (difficulty) filter.difficulty = difficulty;

  // Company filter: match if the value appears anywhere in the companies array.
  // Case-insensitive to match what the UI sends.
  if (company) {
    filter.companies = { $regex: new RegExp(`^${escapeRegex(company)}$`, 'i') };
  }

  // Text search on title + body. Requires the text index in the Question model.
  if (q && typeof q === 'string' && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  return { filter, bookmarkedOnly: bookmarked === 'true' };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/questions
 * Query: category, company, difficulty, q, bookmarked=true, limit, offset
 * Response: { questions, total, nextOffset }
 */
questionsRouter.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = parsePaging(req);
    const { filter, bookmarkedOnly } = buildFilter(req);

    // If the user wants only bookmarked, first get their bookmark ids and
    // restrict the filter. Cheapest correct approach at this scale.
    if (bookmarkedOnly) {
      const marks = await QuestionBookmark.find({ userId: req.user._id }).select('questionId');
      const ids = marks.map((m) => m.questionId);
      if (ids.length === 0) {
        return res.json({ questions: [], total: 0, nextOffset: null });
      }
      filter._id = { $in: ids };
    }

    const [items, total, allMarks] = await Promise.all([
      Question.find(filter).sort({ createdAt: 1 }).skip(offset).limit(limit),
      Question.countDocuments(filter),
      QuestionBookmark.find({ userId: req.user._id }).select('questionId'),
    ]);

    const bookmarkedIds = new Set(allMarks.map((m) => m.questionId.toString()));
    const questions = items.map((q) => q.toPublic(bookmarkedIds.has(q._id.toString())));

    const nextOffset = offset + items.length < total ? offset + items.length : null;
    res.json({ questions, total, nextOffset });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/questions/:id/bookmark
 * Idempotent — already-bookmarked returns the same success shape.
 */
questionsRouter.post('/:id/bookmark', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: { message: 'Question not found' } });
    }

    try {
      await QuestionBookmark.create({ userId: req.user._id, questionId: question._id });
    } catch (err) {
      if (err?.code !== 11000) throw err; // duplicate key → already bookmarked, fine
    }

    res.json({ bookmarked: true, questionId: question._id.toString() });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/questions/:id/bookmark
 * Idempotent — removing a missing bookmark is a successful no-op.
 */
questionsRouter.delete('/:id/bookmark', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    await QuestionBookmark.deleteOne({ userId: req.user._id, questionId: req.params.id });
    res.json({ bookmarked: false, questionId: req.params.id });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/questions/:id/answer
 * Returns the cached answer if one exists, 404 otherwise.
 * Safe to call without counting against the LLM quota.
 */
questionsRouter.get('/:id/answer', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    const answer = await findExistingAnswer(req.params.id);
    if (!answer) return res.status(404).json({ error: { message: 'No answer yet' } });
    res.json({ answer: answer.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/questions/:id/answer
 * Idempotent: returns cached if present, otherwise generates via Gemini.
 * `?force=true` forces regeneration.
 */
questionsRouter.post('/:id/answer', llmLimiter, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid question id' } });
    }
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: { message: 'Question not found' } });
    }

    const force = req.query.force === 'true';
    if (!force) {
      const existing = await findExistingAnswer(question._id);
      if (existing) return res.json({ answer: existing.toPublic(), cached: true });
    }

    const answer = await generateQuestionAnswer(question);
    res.json({ answer: answer.toPublic(), cached: false });
  } catch (err) {
    next(err);
  }
});
