import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../services/auth.js';

// Attaches req.user if a valid auth cookie is present; 401s otherwise.
// Route handlers downstream can assume req.user exists.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: { message: 'Not authenticated' } });

    const payload = verifyAuthToken(token);
    if (!payload?.sub) return res.status(401).json({ error: { message: 'Invalid session' } });

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: { message: 'User no longer exists' } });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
