import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { requestId } from './middleware/requestId.js';
import { generalLimiter } from './middleware/rateLimit.js';

// Register a morgan token so our dev logs include the request id. Great for
// correlating a slow LLM call across client + server.
morgan.token('rid', (req) => req.id || '-');

export function buildApp() {
  const app = express();

  app.disable('x-powered-by');

  // requestId needs to run BEFORE morgan so the id appears in every log line.
  app.use(requestId);

  // Helmet adds sane security headers. crossOriginEmbedderPolicy is disabled
  // because we redirect to Cloudinary assets which don't set the COEP header.
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      // The API never serves HTML, so most CSP choices don't apply. Helmet's
      // default CSP blocks cross-origin fetches to our cdn assets, so we turn
      // it off on the API. Apply a strict CSP on the frontend host instead.
      contentSecurityPolicy: false,
    })
  );

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan(':rid :method :url :status :response-time ms', {
        // Health is noisy — only log when it actually fails.
        skip: (req, res) => req.path === '/api/health' && res.statusCode < 400,
      })
    );
  }

  // Catch-all limiter. Per-route limiters (auth, LLM) are stricter and
  // applied in their respective routers.
  app.use(generalLimiter);

  app.use('/api', router);

  // 404 + error handler must be last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
