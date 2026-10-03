import { User } from '../models/User.js';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../services/auth.js';

// Attaches req.user if a valid auth cookie is present; 401s otherwise.
// Route handlers downstream can assume req.user exists.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    // #region agent log
    fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'requireAuth.js:entry',message:'auth check',data:{hasToken:!!token,cookieKeys:Object.keys(req.cookies||{}),origin:req.headers.origin||null,host:req.headers.host||null},timestamp:Date.now(),hypothesisId:'C-E'})}).catch(()=>{});
    // #endregion
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
