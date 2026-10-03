import { buildApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedQuestionsIfEmpty } from './services/questionSeed.js';
import { bootstrapCompanyQuestions } from './services/companyQuestionScrape.js';

async function start() {
  try {
    await connectDb();
  } catch (err) {
    console.error('[startup] failed to connect to MongoDB:', err.message);
  }

  try {
    await seedQuestionsIfEmpty();
  } catch (err) {
    console.warn('[startup] question seed failed:', err.message);
  }

  
  bootstrapCompanyQuestions();

  const app = buildApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
    console.log(`[server] CORS origin: ${env.CORS_ORIGIN}`);
    console.log(`[server] env: ${env.NODE_ENV}`);
  });
}

start();
