import { api, API_BASE, ApiError } from './client.js';

// Multipart upload is the one call that can't use our JSON fetch wrapper, so
// it's implemented directly here. Everything else delegates to the `api` helper.
async function uploadResume(file) {
  const form = new FormData();
  form.append('resume', file);

  const res = await fetch(`${API_BASE}/api/resumes`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || `Upload failed with ${res.status}`;
    throw new ApiError(message, { status: res.status, details: data?.error?.details });
  }
  return data.resume;
}

export const resumesApi = {
  list: () => api.get('/api/resumes').then((d) => d.resumes),
  get: (id) => api.get(`/api/resumes/${id}`).then((d) => d.resume),
  upload: uploadResume,
  remove: (id) => api.del(`/api/resumes/${id}`),
  fileUrl: (id) => `${API_BASE}/api/resumes/${id}/file`, // server redirects to signed Cloudinary URL

  // Analysis — GET is cached-only (404 if never analyzed). POST is idempotent;
  // returns cached or triggers a fresh Gemini run. ?force=true bypasses cache.
  getAnalysis: (id) => api.get(`/api/resumes/${id}/analysis`).then((d) => d.analysis),
  analyze: (id, { force = false } = {}) =>
    api.post(`/api/resumes/${id}/analysis${force ? '?force=true' : ''}`),
};
