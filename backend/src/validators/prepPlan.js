import { z } from 'zod';

// Body accepted on POST /regenerate. All fields optional — sensible defaults
// kick in when missing.
export const prepPlanInputSchema = z.object({
  targetRole: z.string().trim().min(1).max(120).optional(),
  experience: z.enum(['fresher', 'early', 'mid', 'senior']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  interviewDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional()
    .nullable(),
  weakTopics: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
});
