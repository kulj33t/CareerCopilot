import { api } from './client.js';

function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === 'All') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const questionsApi = {
  list: (params) => api.get(`/api/questions${buildQuery(params)}`),
  bookmark: (id) => api.post(`/api/questions/${id}/bookmark`),
  unbookmark: (id) => api.del(`/api/questions/${id}/bookmark`),

  // Answer endpoints — GET is cached-only (404 if not yet generated),
  // POST is idempotent and triggers generation when missing.
  getAnswer: (id) => api.get(`/api/questions/${id}/answer`).then((d) => d.answer),
  generateAnswer: (id, { force = false } = {}) =>
    api.post(`/api/questions/${id}/answer${force ? '?force=true' : ''}`),
};
