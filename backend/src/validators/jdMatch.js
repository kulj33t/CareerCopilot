import { z } from 'zod';

export const jdMatchSchema = z.object({
  resumeId: z.string().regex(/^[a-f0-9]{24}$/, { error: 'Invalid resume id' }),
  jdText: z.string().trim().min(30, { error: 'Job description must be at least 30 characters' }).max(12_000),
});
