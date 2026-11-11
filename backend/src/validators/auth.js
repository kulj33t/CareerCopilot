import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(1, { error: 'Name is required' }).max(120),
  email: z.string().trim().toLowerCase().email({ error: 'Invalid email' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ error: 'Invalid email' }),
  password: z.string().min(1, { error: 'Password is required' }),
});

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    const err = new Error(first?.message || 'Invalid request body');
    err.status = 400;
    err.details = z.flattenError(result.error).fieldErrors;
    throw err;
  }
  return result.data;
}
