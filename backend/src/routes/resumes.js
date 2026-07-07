import { Router } from 'express';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { llmLimiter } from '../middleware/rateLimit.js';
import { fileTypeFromUpload, resumeUploader } from '../middleware/uploadResume.js';
import {
  deleteResumeAsset,
  getSignedResumeUrl,
  uploadResume,
} from '../services/storage.js';
import { analyzeResume } from '../services/resumeAnalysis.js';

export const resumesRouter = Router();

// All resume endpoints require authentication.
resumesRouter.use(requireAuth);

/**
 * POST /api/resumes
 * multipart form with a single file under the field "resume".
 */
resumesRouter.post('/', resumeUploader, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file provided in "resume" field' } });
    }

    const fileType = fileTypeFromUpload(req.file);
    if (!fileType) {
      return res.status(400).json({ error: { message: 'Only PDF and DOCX files are allowed' } });
    }

    const uploaded = await uploadResume({
      buffer: req.file.buffer,
      userId: req.user._id.toString(),
      originalName: req.file.originalname,
    });

    const resume = await Resume.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileType,
      sizeBytes: uploaded.bytes || req.file.size,
      cloudinaryPublicId: uploaded.publicId,
      cloudinaryFormat: uploaded.format,
    });

    res.status(201).json({ resume: resume.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/resumes
 * Returns the current user's resumes, newest first.
 */
resumesRouter.get('/', async (req, res, next) => {
  try {
    const items = await Resume.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ resumes: items.map((r) => r.toPublic()) });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper — fetches a resume ensuring the current user owns it.
 * Returns 404 for any mismatch (don't leak existence to other users).
 */
async function findOwnedResume(req) {
  const resume = await Resume.findById(req.params.id);
  if (!resume || resume.userId.toString() !== req.user._id.toString()) {
    const err = new Error('Resume not found');
    err.status = 404;
    throw err;
  }
  return resume;
}

resumesRouter.get('/:id', async (req, res, next) => {
  try {
    const resume = await findOwnedResume(req);
    res.json({ resume: resume.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/resumes/:id/file
 * Redirects to a short-lived signed Cloudinary URL. Keeps the asset private.
 */
resumesRouter.get('/:id/file', async (req, res, next) => {
  try {
    const resume = await findOwnedResume(req);
    const url = getSignedResumeUrl({
      publicId: resume.cloudinaryPublicId,
      format: resume.cloudinaryFormat,
    });
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

resumesRouter.delete('/:id', async (req, res, next) => {
  try {
    const resume = await findOwnedResume(req);
    await deleteResumeAsset({ publicId: resume.cloudinaryPublicId });
    await ResumeAnalysis.deleteOne({ resumeId: resume._id });
    await resume.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/resumes/:id/analysis
 * Returns cached analysis, or 404 if none exists yet.
 */
resumesRouter.get('/:id/analysis', async (req, res, next) => {
  try {
    const resume = await findOwnedResume(req);
    const analysis = await ResumeAnalysis.findOne({ resumeId: resume._id });
    if (!analysis) {
      return res.status(404).json({ error: { message: 'No analysis yet for this resume' } });
    }
    res.json({ analysis: analysis.toPublic() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/resumes/:id/analysis
 * Idempotent — returns cached analysis if one exists, otherwise generates it
 * via Gemini. This is the endpoint the frontend calls on ResumeResults mount.
 * Accepts `?force=true` to force regeneration.
 *
 * `llmLimiter` guards the regeneration path (cached responses short-circuit
 * before hitting Gemini so the rate counter is a conservative upper bound).
 */
resumesRouter.post('/:id/analysis', llmLimiter, async (req, res, next) => {
  try {
    const resume = await findOwnedResume(req);
    const force = req.query.force === 'true';

    if (!force) {
      const existing = await ResumeAnalysis.findOne({ resumeId: resume._id });
      if (existing) return res.json({ analysis: existing.toPublic(), cached: true });
    }

    const analysis = await analyzeResume(resume);
    res.json({ analysis: analysis.toPublic(), cached: false });
  } catch (err) {
    next(err);
  }
});
