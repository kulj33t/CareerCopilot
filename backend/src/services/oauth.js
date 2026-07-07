import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Provider definitions. Each describes the OAuth 2.0 / OIDC endpoints, the
// scopes we ask for, and a `mapProfile` that normalizes the provider's
// userinfo response into { providerId, email, name, avatarUrl }.
const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    extraAuthParams: { access_type: 'online', prompt: 'select_account' },
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET,
    mapProfile: (p) => ({
      providerId: String(p.sub),
      email: p.email?.toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name || p.given_name || (p.email ? p.email.split('@')[0] : 'User'),
      avatarUrl: p.picture || null,
    }),
  },
  linkedin: {
    // LinkedIn's "Sign In with LinkedIn using OpenID Connect" product.
    // Scopes: openid (sub), profile (name + picture), email.
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userinfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid profile email',
    extraAuthParams: {},
    clientId: () => env.LINKEDIN_CLIENT_ID,
    clientSecret: () => env.LINKEDIN_CLIENT_SECRET,
    mapProfile: (p) => ({
      providerId: String(p.sub),
      email: p.email?.toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name || [p.given_name, p.family_name].filter(Boolean).join(' ') || 'User',
      avatarUrl: p.picture || null,
    }),
  },
};

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) {
    const err = new Error(`Unknown OAuth provider: ${name}`);
    err.status = 400;
    throw err;
  }
  return p;
}

export function isProviderConfigured(name) {
  const p = PROVIDERS[name];
  return Boolean(p?.clientId() && p?.clientSecret());
}

export function redirectUri(name) {
  return `${env.PUBLIC_API_URL}/api/auth/${name}/callback`;
}

// Build the URL we redirect the user to in order to start the OAuth dance.
export function buildAuthorizeUrl(name, state) {
  const p = getProvider(name);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: p.clientId(),
    redirect_uri: redirectUri(name),
    scope: p.scope,
    state,
    ...p.extraAuthParams,
  });
  return `${p.authorizeUrl}?${params.toString()}`;
}

// Exchange the auth code for an access token, then fetch userinfo and return
// a normalized profile.
export async function exchangeCodeForProfile(name, code) {
  const p = getProvider(name);

  const tokenRes = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(name),
      client_id: p.clientId(),
      client_secret: p.clientSecret(),
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    const err = new Error(`OAuth token exchange failed (${name}): ${text.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }
  const token = await tokenRes.json();
  const accessToken = token.access_token;
  if (!accessToken) {
    const err = new Error(`OAuth token response missing access_token (${name})`);
    err.status = 502;
    throw err;
  }

  const userRes = await fetch(p.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    const text = await userRes.text();
    const err = new Error(`OAuth userinfo fetch failed (${name}): ${text.slice(0, 200)}`);
    err.status = 502;
    throw err;
  }
  const profile = await userRes.json();
  const mapped = p.mapProfile(profile);
  if (!mapped.email) {
    const err = new Error(`${name} did not return an email — cannot create account`);
    err.status = 400;
    throw err;
  }
  return mapped;
}

// CSRF — a short-lived nonce we set as a cookie before redirecting to the
// provider, then verify against the `state` query param on callback.
export const OAUTH_STATE_COOKIE = 'cc_oauth_state';

export function newStateNonce() {
  return crypto.randomBytes(24).toString('hex');
}

export function stateCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  // OAuth callbacks are top-level navigations from the provider's domain back
  // to ours, so SameSite=Lax works for the dev case. In prod we still need
  // SameSite=None;Secure because the cookie was set during a redirect from
  // our backend and the browser treats the round-trip as cross-site.
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 10 * 60 * 1000, // 10 minutes — the user must complete OAuth in this window
    path: '/',
  };
}
