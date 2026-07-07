import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '7d';
export const AUTH_COOKIE_NAME = 'cc_session';

function requireJwtSecret() {
  if (!env.JWT_SECRET) {
    throw Object.assign(new Error('JWT_SECRET is not configured on the server'), { status: 500 });
  }
  return env.JWT_SECRET;
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signAuthToken(userId) {
  return jwt.sign({ sub: userId.toString() }, requireJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, requireJwtSecret());
  } catch {
    return null;
  }
}

// Cookie options kept in one place so behavior stays consistent across set/clear.
// In prod the frontend (Vercel) and backend (Render) live on different origins,
// so the cookie must be SameSite=None;Secure to be sent on cross-site requests.
// In dev they share an origin via Vite's proxy, so SameSite=Lax is fine.
export function authCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
