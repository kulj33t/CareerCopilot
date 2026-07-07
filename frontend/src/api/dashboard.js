import { api } from './client.js';

export const dashboardApi = {
  get: () => api.get('/api/dashboard').then((d) => d.dashboard),
};
