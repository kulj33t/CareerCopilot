import { api } from './client.js';

function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const companyQuestionsApi = {
  companies: () => api.get('/api/company-questions/companies').then((d) => d.companies),
  list: (params) => api.get(`/api/company-questions${buildQuery(params)}`),
  status: () => api.get('/api/company-questions/status'),
  generateAnswer: (id, { force = false } = {}) =>
    api.post(`/api/company-questions/${id}/answer${force ? '?force=true' : ''}`),
};
