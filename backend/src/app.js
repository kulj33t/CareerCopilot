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

  app.use(requestId);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

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
