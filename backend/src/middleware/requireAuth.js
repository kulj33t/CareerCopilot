import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME, clearAuthCookie, verifyAuthToken } from '../services/auth.js';
import { dbStatus } from '../config/db.js';

// Attaches req.user if a valid auth cookie is present; 401s otherwise.
// Route handlers downstream can assume req.user exists.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: { message: 'Not authenticated' } });

    const payload = verifyAuthToken(token);
    if (!payload?.sub) {
      clearAuthCookie(res);
      return res.status(401).json({ error: { message: 'Your session has expired. Please sign in again.' } });
    }

    if (dbStatus() !== 'connected') {
      return res.status(503).json({
        error: { message: 'Authentication is temporarily unavailable because the database is not connected.' },
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: { message: 'This account is no longer available. Please sign in again.' } });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
