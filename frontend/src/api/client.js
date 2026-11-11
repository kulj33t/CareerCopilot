// Leave VITE_API_BASE_URL empty to use same-origin /api rewrites. This is the
// recommended cookie-auth setup; a direct remote URL uses credentialed CORS.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
export const SESSION_EXPIRED_EVENT = 'careercopilot:session-expired';

const inFlight = new Map();
const mutationInFlight = new Map();
const cooldownUntil = new Map();
const failureCounts = new Map();
const lastRequestAt = new Map();
let sessionExpiryNotified = false;
const DEFAULT_TIMEOUT_MS = 30_000;
const AI_TIMEOUT_MS = 75_000;
const MAX_BACKOFF_MS = 30_000;

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function requestBodyKey(body) {
  if (body === undefined) return '';
  if (!isFormData(body)) {
    try { return JSON.stringify(body); } catch { return String(body); }
  }
  return JSON.stringify(Array.from(body.entries(), ([key, value]) => [
    key,
    typeof value === 'string'
      ? value
      : [value.name, value.size, value.lastModified],
  ]));
}

function retryAfterMilliseconds(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(headerValue);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function waitLabel(milliseconds) {
  if (milliseconds < 1_000) return 'a moment';
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return seconds < 60 ? `${seconds} second${seconds === 1 ? '' : 's'}` : `${Math.ceil(seconds / 60)} minute${seconds < 120 ? '' : 's'}`;
}

function isTransient(error) {
  return error.status == null || error.status === 408 || error.status === 429 || error.status >= 500;
}

function timeoutFor(path, requestedTimeout) {
  if (requestedTimeout) return requestedTimeout;
  return /analysis|\/messages|answer|match|prep/i.test(path)
    ? AI_TIMEOUT_MS
    : DEFAULT_TIMEOUT_MS;
}

function isAuthEndpoint(path) {
  return /^\/api\/auth\/(?:me|login|signup|logout|providers)(?:\?|$)/.test(path);
}

function notifySessionExpired(path) {
  if (sessionExpiryNotified || typeof window === 'undefined') return;
  sessionExpiryNotified = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { path } }));
}

async function performRequest(path, { method, body, headers, timeoutMs }) {
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutFor(path, timeoutMs));

  try {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: API_BASE ? 'include' : 'same-origin',
        headers: {
          ...(body !== undefined && !isFormData(body) ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : isFormData(body) ? body : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (didTimeout) {
        throw new ApiError('The service took too long to respond. Wait a moment, then try again.', {
          status: 408,
          details: { kind: 'timeout' },
        });
      }
      throw new ApiError('Could not reach the service. Check your connection and try again.', {
        details: { kind: 'network', cause: error?.message },
      });
    }

    // Empty and 204 responses are valid. Proxies may return HTML or plain text
    // when an upstream service fails, so parse defensively and keep a useful error.
    let text;
    try {
      text = await response.text();
    } catch (error) {
      if (didTimeout) {
        throw new ApiError('The service took too long to respond. Wait a moment, then try again.', {
          status: 408,
          details: { kind: 'timeout' },
        });
      }
      throw new ApiError('The response was interrupted. Check your connection and try again.', {
        details: { kind: 'network', cause: error?.message },
      });
    }
    let data = null;
    let invalidJson = false;
    if (text) {
      try { data = JSON.parse(text); } catch { invalidJson = true; }
    }

    if (!response.ok) {
      if (response.status === 401 && !isAuthEndpoint(path)) {
        notifySessionExpired(path);
      }
      const retryAfterMs = retryAfterMilliseconds(response.headers.get('retry-after'));
      const message = response.status === 429
        ? 'The service is receiving too many requests. Please wait before trying again.'
        : response.status >= 500
          ? 'Something went wrong on our side. Please try again in a moment.'
          : data?.error?.message || `Request failed with ${response.status}`;
      throw new ApiError(message, {
        status: response.status,
        details: {
          ...(data?.error?.details || {}),
          ...(invalidJson ? { unreadableBody: true } : {}),
          ...(retryAfterMs == null ? {} : { retryAfterMs }),
        },
      });
    }

    if (invalidJson) {
      const contentType = response.headers.get('content-type') || '';
      throw new ApiError(`The service returned an unreadable response (HTTP ${response.status}).`, {
        status: response.status,
        details: { contentType },
      });
    }

    if (/^\/api\/auth\/(?:me|login|signup)(?:\?|$)/.test(path)) {
      sessionExpiryNotified = false;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function request(path, { method = 'GET', body, headers, timeoutMs } = {}) {
  const routeKey = `${method}:${path}`;
  const bodyKey = method === 'GET' ? '' : requestBodyKey(body);
  const requestKey = `${routeKey}:${bodyKey}`;
  const now = Date.now();
  const waitMs = (cooldownUntil.get(routeKey) || 0) - now;

  if (waitMs > 0) {
    throw new ApiError(`Please wait ${waitLabel(waitMs)} before retrying this request.`, {
      status: 429,
      details: { retryAfterMs: waitMs, kind: 'client-cooldown' },
    });
  }

  // Coalesce repeated clicks and StrictMode effect repeats while the same
  // request is pending. Mutations are never retried automatically.
  if (inFlight.has(requestKey)) return inFlight.get(requestKey);
  if (method !== 'GET' && mutationInFlight.has(routeKey)) {
    throw new ApiError('A request is already running. Wait for it to finish before trying again.', {
      status: 409,
      details: { kind: 'mutation-in-flight' },
    });
  }

  const minimumInterval = method === 'GET' ? 250 : 1_000;
  const intervalWait = minimumInterval - (now - (lastRequestAt.get(routeKey) || 0));
  if (intervalWait > 0) {
    throw new ApiError(`Please wait ${waitLabel(intervalWait)} before sending another request.`, {
      status: 429,
      details: { retryAfterMs: intervalWait, kind: 'client-throttle' },
    });
  }

  const pending = performRequest(path, { method, body, headers, timeoutMs });
  inFlight.set(requestKey, pending);
  if (method !== 'GET') mutationInFlight.set(routeKey, pending);
  lastRequestAt.set(routeKey, Date.now());

  try {
    const result = await pending;
    failureCounts.delete(routeKey);
    cooldownUntil.delete(routeKey);
    return result;
  } catch (error) {
    if (isTransient(error)) {
      const count = (failureCounts.get(routeKey) || 0) + 1;
      failureCounts.set(routeKey, count);
      const backoffMs = Math.min(2_000 * (2 ** (count - 1)), MAX_BACKOFF_MS);
      const delayMs = error.details?.retryAfterMs ?? backoffMs;
      cooldownUntil.set(routeKey, Date.now() + delayMs);
      if (error instanceof ApiError) {
        error.details = { ...(error.details || {}), retryAfterMs: delayMs };
      }
    } else {
      failureCounts.delete(routeKey);
      cooldownUntil.delete(routeKey);
    }
    throw error;
  } finally {
    if (inFlight.get(requestKey) === pending) inFlight.delete(requestKey);
    if (mutationInFlight.get(routeKey) === pending) mutationInFlight.delete(routeKey);
  }
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData, options = {}) => request(path, { ...options, method: 'POST', body: formData }),
};
