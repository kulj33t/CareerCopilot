// Shared fetch wrapper. Handles JSON, auth cookies, and error unification so
// every API module can stay small and declarative.

// In dev, VITE_API_URL is unset and the empty base lets Vite's proxy forward
// /api → http://localhost:4000. In prod, set VITE_API_URL to the deployed
// backend origin (e.g. https://career-copilot-api.onrender.com).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
    credentials: 'include', // send/receive auth cookie
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 / empty bodies are valid (e.g. logout). Guard against JSON.parse('').
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || `Request failed with ${res.status}`;
    throw new ApiError(message, { status: res.status, details: data?.error?.details });
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
