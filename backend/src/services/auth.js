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
  const secret = requireJwtSecret();
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function authCookieOptions() {
  const isSecureDeployment =
    env.NODE_ENV === 'production' || env.PUBLIC_APP_URL.startsWith('https://');
  return {
    httpOnly: true,
    // The subdomains share a schemeful site, so Lax does not block direct
    // API fetches. Keep this cookie host-only: production uses Vercel's /api
    // proxy so OAuth, login, and later requests all stay on one browser host.
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    secure: isSecureDeployment,
  };
}

export function clearAuthCookie(res) {
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
}
