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

export function authCookieOptions() {
  const isSecureDeployment =
    env.NODE_ENV === 'production' || env.PUBLIC_APP_URL.startsWith('https://');
  return {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    secure: isSecureDeployment,
  };
}
