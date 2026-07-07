import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { resumesRouter } from './resumes.js';
import { jdMatchRouter } from './jdMatch.js';
import { questionsRouter } from './questions.js';
import { prepPlanRouter } from './prepPlan.js';
import { interviewRouter } from './interview.js';
import { dashboardRouter } from './dashboard.js';
import { companyQuestionsRouter } from './companyQuestions.js';

export const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/resumes', resumesRouter);
router.use('/jd-match', jdMatchRouter);
router.use('/questions', questionsRouter);
router.use('/prep-plan', prepPlanRouter);
router.use('/interview', interviewRouter);
router.use('/dashboard', dashboardRouter);
router.use('/company-questions', companyQuestionsRouter);
