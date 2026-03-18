import api from './api.base';

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/password', { oldPassword, newPassword }),

  getMe: () => api.get('/auth/me'),
};
