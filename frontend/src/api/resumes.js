import { api, API_BASE } from './client.js';

// Multipart upload delegates to the shared request wrapper, which preserves
// timeout, throttling, and credential behavior while omitting JSON encoding.
async function uploadResume(file) {
  const form = new FormData();
  form.append('resume', file);
  const data = await api.upload('/api/resumes', form);
  return data.resume;
}

export const resumesApi = {
  list: () => api.get('/api/resumes').then((d) => d.resumes),
  get: (id) => api.get(`/api/resumes/${id}`).then((d) => d.resume),
  upload: uploadResume,
  remove: (id) => api.del(`/api/resumes/${id}`),
  fileUrl: (id) => `${API_BASE}/api/resumes/${id}/file`, // server redirects to signed Cloudinary URL

  // Analysis — GET is cached-only (404 if never analyzed). POST is idempotent;
  // returns cached or triggers a fresh analysis. ?force=true bypasses cache.
  getAnalysis: (id) => api.get(`/api/resumes/${id}/analysis`).then((d) => d.analysis),
  analyze: (id, { force = false } = {}) =>
    api.post(`/api/resumes/${id}/analysis${force ? '?force=true' : ''}`),
};
