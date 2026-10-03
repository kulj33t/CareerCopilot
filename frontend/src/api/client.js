export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

if (import.meta.env.PROD && API_BASE) {
  console.warn(
    '[CareerCopilot] VITE_API_URL is set in production. Cross-site auth cookies to the API host often fail in the browser. Prefer Vercel /api rewrites with VITE_API_URL unset.'
  );
}

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE}${path}`;
  // #region agent log
  fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'client.js:request',message:'api request',data:{apiBase:API_BASE||'(empty-same-origin)',url,method,pageOrigin:typeof location!=='undefined'?location.origin:null},timestamp:Date.now(),hypothesisId:'C-D'})}).catch(()=>{});
  // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7916/ingest/35ecbcca-33a5-4f04-b3c9-d8cb6558a87a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cbb595'},body:JSON.stringify({sessionId:'cbb595',location:'client.js:request-fail',message:'api error response',data:{url,status:res.status,errorMsg:data?.error?.message},timestamp:Date.now(),hypothesisId:'C-E'})}).catch(()=>{});
    // #endregion
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
