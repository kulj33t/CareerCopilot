import { api } from './client.js';

export const authApi = {
  signup: ({ name, email, password }) => api.post('/api/auth/signup', { name, email, password }),
  login: ({ email, password }) => api.post('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  providers: () => api.get('/api/auth/providers'),
};
