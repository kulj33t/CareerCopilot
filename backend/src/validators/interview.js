import { z } from 'zod';

export const setupSchema = z.object({
  mode: z.enum(['text', 'voice', 'video']).default('text'),
  role: z.enum(['sde', 'frontend', 'backend', 'data']).default('sde'),
  round: z.enum(['dsa', 'technical', 'system', 'behavioral']).default('technical'),
  level: z.enum(['fresher', 'early', 'mid', 'senior']).default('fresher'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']).default('medium'),
});

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, 'Answer is empty').max(4000, 'Answer is too long'),
});
