import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@stores/authStore';
import { config } from '@src/config';

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 300000, // 5分钟，支持大文件上传
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const originalRequest = error.config;

    // Token 过期，尝试刷新
    if (error.response?.status === 401 && originalRequest) {
      const { refreshToken, updateToken, logout } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          const response: any = await axios.post('/api/auth/refresh', {
            refreshToken,
          });
          
          updateToken(response.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          
          return api(originalRequest);
        } catch {
          logout();
          window.location.href = '/login';
        }
      } else {
        logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  
  logout: () => api.post('/auth/logout'),
  
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/password', { oldPassword, newPassword }),
};

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

// Friend API
export const friendApi = {
  getList: () => api.get('/friends'),
  
  sendRequest: (friendId: string, message?: string) =>
    api.post('/friends/request', { friendId, message }),
  
  getRequests: () => api.get('/friends/requests'),
  
  handleRequest: (id: string, action: 'accept' | 'reject') =>
    api.put(`/friends/request/${id}`, { action }),
  
  delete: (id: string) => api.delete(`/friends/${id}`),
  
  setRemark: (id: string, remark: string) =>
    api.put(`/friends/${id}/remark`, { remark }),
};

// Group API
export const groupApi = {
  getList: () => api.get('/groups'),
  
  create: (name: string, memberIds?: string[]) =>
    api.post('/groups', { name, memberIds }),
  
  getDetail: (id: string) => api.get(`/groups/${id}`),
  
  get: (id: string) => api.get(`/groups/${id}`),
  
  update: (id: string, data: { name?: string; avatar?: string; announcement?: string }) =>
    api.put(`/groups/${id}`, data),
  
  delete: (id: string) => api.delete(`/groups/${id}`),
  
  inviteMembers: (id: string, memberIds: string[]) =>
    api.post(`/groups/${id}/members`, { memberIds }),
  
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),
  
  setMemberRole: (groupId: string, memberId: string, role: 'admin' | 'member') =>
    api.put(`/groups/${groupId}/members/${memberId}/role`, { role }),
  
  setRole: (groupId: string, memberId: string, role: 'admin' | 'member') =>
    api.put(`/groups/${groupId}/members/${memberId}/role`, { role }),
  
  quit: (id: string) => api.post(`/groups/${id}/quit`),
};

// Message API
export const messageApi = {
  getConversations: () => api.get('/conversations'),
  
  getMessages: (conversationId: string, page = 1, pageSize = 50) =>
    api.get(`/conversations/${conversationId}/messages`, {
      params: { page, pageSize },
    }),
  
  markAsRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`),
  
  getUnreadCount: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/unread-count`),
};

// File API
export const fileApi = {
  upload: (file: File, type?: 'file' | 'image', onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: type ? { type } : undefined,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },
  
  getInfo: (id: string) => api.get(`/files/${id}`),
  
  getDownloadUrl: (id: string) => `/api/files/${id}/download`,
};