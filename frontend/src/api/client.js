// Use one browser origin in every environment. Vite proxies /api locally and
// Vercel proxies /api to Render in production, keeping cookies first-party.
export const API_BASE = '';

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'same-origin', // the proxy makes the API same-origin locally and in production
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 / empty bodies are valid (e.g. logout). Proxies can also return plain
  // text or HTML when an upstream service fails, so don't let JSON.parse hide
  // the useful HTTP status behind a SyntaxError.
  const text = await res.text();
  let data = null;
  let invalidJson = false;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      invalidJson = true;
    }
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html') || text.trimStart().startsWith('<');
    const upstreamMessage = invalidJson && !isHtml ? text.trim().slice(0, 240) : null;
    const message =
      data?.error?.message ||
      upstreamMessage ||
      (isHtml
        ? `Request failed with ${res.status}; the server returned an HTML error page.`
        : `Request failed with ${res.status}`);
    throw new ApiError(message, {
      status: res.status,
      details: data?.error?.details || (invalidJson ? { contentType } : undefined),
    });
  }

  if (invalidJson) {
    const contentType = res.headers.get('content-type') || '';
    throw new ApiError(`The server returned a non-JSON response (HTTP ${res.status}).`, {
      status: res.status,
      details: { contentType },
    });
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
