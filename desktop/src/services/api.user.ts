import api from './api.base';

// User API
export const userApi = {
  search: (keyword: string, page = 1, pageSize = 20) =>
    api.get('/users/search', { params: { keyword, page, pageSize } }),

  getProfile: (id: string) => api.get(`/users/${id}`),

  getMe: () => api.get('/users/me/profile'),

  updateProfile: (data: { nickname?: string; signature?: string }) =>
    api.put('/users/profile', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
