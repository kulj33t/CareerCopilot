import 'dotenv/config';
import { z } from 'zod';

const httpOrigin = z.string().url().refine(
  (value) => ['http:', 'https:'].includes(new URL(value).protocol),
  'Origin must use HTTP or HTTPS',
);
const corsOrigins = z.string().default('http://localhost:5173')
  .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
  .pipe(z.array(httpOrigin).min(1))
  .transform((origins) => origins.map((origin) => new URL(origin).origin));

// Zod schema validates + coerces env vars at startup. Required fields fail fast
// with a readable message; optional fields stay `undefined` until the feature
// that needs them is wired up in later phases.
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Accept a comma-separated allowlist for direct credentialed browser calls.
  CORS_ORIGIN: corsOrigins,

  // Optional in Phase 0 — server still boots without it, health endpoint
  // will report db: "not_configured" so you can verify the HTTP layer first.
  MONGODB_URI: z.string().optional(),

  // Phase 1+
  JWT_SECRET: z.string().min(16).optional(),

  // Phase 2+
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // AI provider — Groq (LPU inference; defaults to openai/gpt-oss-120b).
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),

  // OAuth — both pairs are optional. If a pair is missing the corresponding
  // /api/auth/<provider> route returns 503 and the frontend button hides.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),

  // Public frontend origin. Used for OAuth callback URLs.
  // In dev: http://localhost:5173. In prod: https://careercopilot.kuljeet.online.
  PUBLIC_APP_URL: httpOrigin.default('http://localhost:5173')
    .transform((value) => new URL(value).origin),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] invalid environment variables:');
  console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

export const env = parsed.data;
