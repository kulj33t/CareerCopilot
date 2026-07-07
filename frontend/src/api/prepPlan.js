import { api } from './client.js';

export const prepPlanApi = {
  get: () => api.get('/api/prep-plan').then((d) => d.plan),
  regenerate: (payload = {}) =>
    api.post('/api/prep-plan/regenerate', payload).then((d) => d.plan),
  toggleTask: (taskId) =>
    api.post(`/api/prep-plan/tasks/${taskId}/toggle`).then((d) => d.plan),
};
