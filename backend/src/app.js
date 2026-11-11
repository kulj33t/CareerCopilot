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

morgan.token('rid', (req) => req.id || '-');

export function buildApp() {
  const app = express();

  app.disable('x-powered-by');
  // Render terminates TLS at its proxy and forwards the client address. Trust
  // only that nearest proxy so rate limits use the real client IP in prod.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(requestId);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGIN.includes(origin)) return callback(null, true);
        const error = Object.assign(new Error('Origin is not allowed by CORS'), { status: 403 });
        return callback(error);
      },
      credentials: true,
      exposedHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit', 'RateLimit-Policy'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // API payloads include account-specific data and must never be replayed from
  // a browser, CDN, or Vercel proxy cache after an account/session changes.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan(':rid :method :url :status :response-time ms', {
        skip: (req, res) => req.path === '/api/health' && res.statusCode < 400,
      })
    );
  }

  app.use(generalLimiter);

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
