import mongoose from 'mongoose';
import { env } from './env.js';

const READY_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export async function connectDb() {
  if (!env.MONGODB_URI) {
    console.warn('[db] MONGODB_URI not set — running without MongoDB.');
    return;
  }

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('[db] connected to MongoDB');
}

export function dbStatus() {
  if (!env.MONGODB_URI) return 'not_configured';
  return READY_STATE[mongoose.connection.readyState] ?? 'unknown';
}
