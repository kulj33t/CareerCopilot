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
      email: p.email?.trim().toLowerCase(),
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
      email: p.email?.trim().toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name || [p.given_name, p.family_name].filter(Boolean).join(' ') || 'User',
      avatarUrl: p.picture || null,
    }),
  },
};

const PROVIDER_TIMEOUT_MS = 12_000;

async function fetchProviderJson(url, options, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`${label} failed (${response.status})`);
      error.status = 502;
      throw error;
    }
    try {
      return JSON.parse(text);
    } catch {
      const error = new Error(`${label} returned an unreadable response`);
      error.status = 502;
      throw error;
    }
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error(`${label} timed out`);
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

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
  // OAuth callbacks must land on the SPA origin so the browser stores the
  // session cookie for that origin. /api is proxied to this service by Vite or Vercel.
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}/api/auth/${name}/callback`;
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

  const token = await fetchProviderJson(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(name),
      client_id: p.clientId(),
      client_secret: p.clientSecret(),
    }),
  }, `${name} token exchange`);
  const accessToken = token.access_token;
  if (!accessToken) {
    const err = new Error(`OAuth token response missing access_token (${name})`);
    err.status = 502;
    throw err;
  }

  const profile = await fetchProviderJson(p.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, `${name} profile lookup`);
  const mapped = p.mapProfile(profile);
  if (!profile.sub) {
    const err = new Error(`${name} did not return an account identifier`);
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
  const isSecureDeployment =
    env.NODE_ENV === 'production' || env.PUBLIC_APP_URL.startsWith('https://');
    // The callback is a top-level GET and Lax keeps the nonce cookie out of
    // cross-site subrequests while sending it back during the OAuth redirect.
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureDeployment,
    maxAge: 10 * 60 * 1000, // 10 minutes — the user must complete OAuth in this window
    path: '/',
  };
}
