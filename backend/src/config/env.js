import 'dotenv/config';
import { z } from 'zod';

// Zod schema validates + coerces env vars at startup. Required fields fail fast
// with a readable message; optional fields stay `undefined` until the feature
// that needs them is wired up in later phases.
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  // Optional in Phase 0 — server still boots without it, health endpoint
  // will report db: "not_configured" so you can verify the HTTP layer first.
  MONGODB_URI: z.string().optional(),

  // Phase 1+
  JWT_SECRET: z.string().min(16).optional(),
  COOKIE_SECRET: z.string().min(16).optional(),

  // Phase 2+
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // AI provider — Groq (LPU inference of Llama 3.3 70B Versatile).
  GROQ_API_KEY: z.string().optional(),

  // OAuth — both pairs are optional. If a pair is missing the corresponding
  // /api/auth/<provider> route returns 503 and the frontend button hides.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // Public URL of the backend, used to build OAuth redirect_uri callbacks.
  // In dev: http://localhost:4000. In prod: https://your-api.onrender.com.
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  // Public URL of the frontend, where we redirect the user after a successful
  // OAuth login. In dev: http://localhost:5173.
  PUBLIC_APP_URL: z.string().url().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
