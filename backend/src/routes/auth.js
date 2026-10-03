import { Router } from 'express';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  comparePassword,
  hashPassword,
  signAuthToken,
} from '../services/auth.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForProfile,
  isProviderConfigured,
  newStateNonce,
  OAUTH_STATE_COOKIE,
  stateCookieOptions,
} from '../services/oauth.js';
import { env } from '../config/env.js';
import { loginSchema, parseBody, signupSchema } from '../validators/auth.js';

export const authRouter = Router();

authRouter.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = parseBody(signupSchema, req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: { message: 'An account with that email already exists' } });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, provider: 'local' });

    res.cookie(AUTH_COOKIE_NAME, signAuthToken(user._id), authCookieOptions());
    res.status(201).json({ user: user.toPublic() });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: { message: 'An account with that email already exists' } });
    }
    next(err);
  }
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(401).json({ error: { message: 'Invalid email or password' } });
    if (!user.passwordHash) {
      return res.status(401).json({
        error: {
          message: `This account was created with ${user.provider}. Use the ${user.provider} button to sign in.`,
        },
      });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: { message: 'Invalid email or password' } });

    const cookieOpts = authCookieOptions();
    res.cookie(AUTH_COOKIE_NAME, signAuthToken(user._id), cookieOpts);
    // #region agent log
    fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'auth.js:login',message:'login cookie set',data:{nodeEnv:env.NODE_ENV,cookieOpts,origin:req.headers.origin||null,referer:req.headers.referer||null,corsOrigin:env.CORS_ORIGIN},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
    // #endregion
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { ...authCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// ── OAuth ──────────────────────────────────────────────────────────────
// Lists which OAuth providers are usable on this server. The frontend hits
// this to decide whether to render the Google/LinkedIn buttons.
authRouter.get('/providers', (_req, res) => {
  res.json({
    providers: {
      google: isProviderConfigured('google'),
      linkedin: isProviderConfigured('linkedin'),
    },
  });
});

// Safe runtime diagnostics for cross-origin cookie issues (no secrets).
authRouter.get('/diag', (req, res) => {
  const cookieOpts = authCookieOptions();
  const payload = {
    nodeEnv: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
    publicApiUrl: env.PUBLIC_API_URL,
    publicAppUrl: env.PUBLIC_APP_URL,
    requestHost: req.headers.host || null,
    requestOrigin: req.headers.origin || null,
    originMatchesCors: req.headers.origin === env.CORS_ORIGIN,
    hasSessionCookie: Boolean(req.cookies?.[AUTH_COOKIE_NAME]),
    cookieOpts,
    splitOrigins:
      env.PUBLIC_API_URL.replace(/\/$/, '') !== env.PUBLIC_APP_URL.replace(/\/$/, ''),
  };
  // #region agent log
  fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'auth.js:diag',message:'diag hit',data:payload,timestamp:Date.now(),hypothesisId:'A-C'})}).catch(()=>{});
  // #endregion
  res.json(payload);
});

// Kick off the OAuth dance. We set a short-lived state cookie for CSRF and
// redirect the user to the provider's consent screen.
function startOAuth(provider) {
  return (req, res) => {
    if (!isProviderConfigured(provider)) {
      return res.status(503).json({
        error: { message: `${provider} sign-in is not configured on this server` },
      });
    }
    const state = newStateNonce();
    res.cookie(OAUTH_STATE_COOKIE, state, stateCookieOptions());
    res.redirect(buildAuthorizeUrl(provider, state));
  };
}

// Handle the provider's callback. Verify state, exchange code, find/create
// the user (linking by email if a local account already exists), set the
// auth cookie, and bounce to the frontend.
function finishOAuth(provider) {
  return async (req, res, next) => {
    try {
      const { code, state, error: providerError } = req.query;

      if (providerError) {
        return res.redirect(`${env.PUBLIC_APP_URL}/auth?oauth_error=${encodeURIComponent(String(providerError))}`);
      }

      const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
      res.clearCookie(OAUTH_STATE_COOKIE, { ...stateCookieOptions(), maxAge: undefined });

      if (!code || !state || !cookieState || state !== cookieState) {
        return res.redirect(`${env.PUBLIC_APP_URL}/auth?oauth_error=invalid_state`);
      }

      const profile = await exchangeCodeForProfile(provider, String(code));

      // Match by (provider, providerId) first — most reliable. If no match,
      // fall back to email so a user who originally signed up locally can
      // still sign in with the same email via OAuth.
      let user = await User.findOne({ provider, providerId: profile.providerId });
      if (!user) {
        user = await User.findOne({ email: profile.email });
        if (user) {
          // Link this OAuth identity to the existing account.
          user.provider = provider;
          user.providerId = profile.providerId;
          if (!user.avatarUrl && profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
          await user.save();
        } else {
          user = await User.create({
            name: profile.name,
            email: profile.email,
            provider,
            providerId: profile.providerId,
            avatarUrl: profile.avatarUrl,
          });
        }
      }

      const cookieOpts = authCookieOptions();
      res.cookie(AUTH_COOKIE_NAME, signAuthToken(user._id), cookieOpts);
      // #region agent log
      fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'auth.js:oauth-callback',message:'oauth cookie set',data:{provider,cookieOpts,publicAppUrl:env.PUBLIC_APP_URL,host:req.headers.host||null},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      res.redirect(`${env.PUBLIC_APP_URL}/dashboard`);
    } catch (err) {
      // Any failure — token exchange, userinfo fetch, db error — funnels back
      // to the auth page with a generic message in the URL.
      const msg = err?.message ? encodeURIComponent(err.message.slice(0, 140)) : 'oauth_failed';
      res.redirect(`${env.PUBLIC_APP_URL}/auth?oauth_error=${msg}`);
    }
  };
}

authRouter.get('/google', startOAuth('google'));
authRouter.get('/google/callback', finishOAuth('google'));
authRouter.get('/linkedin', startOAuth('linkedin'));
authRouter.get('/linkedin/callback', finishOAuth('linkedin'));
