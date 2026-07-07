import { api, ApiError } from './client.js';

async function fetchActiveOrNull() {
  try {
    const { session } = await api.get('/api/interview/sessions/active');
    return session;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const interviewApi = {
  active: fetchActiveOrNull,
  start: (setup) => api.post('/api/interview/sessions', setup).then((d) => d.session),
  get: (id) => api.get(`/api/interview/sessions/${id}`).then((d) => d.session),
  sendMessage: (id, text) =>
    api.post(`/api/interview/sessions/${id}/messages`, { text }).then((d) => d.session),
  endSession: (id) =>
    api.post(`/api/interview/sessions/${id}/end`).then((d) => d.session),
  abandonSession: (id) =>
    api.post(`/api/interview/sessions/${id}/abandon`).then((d) => d.session),
};
