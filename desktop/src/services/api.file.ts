import api from './api.base';
import { config } from '@src/config';

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

  getDownloadUrl: (id: string) => `${config.apiBaseUrl}/files/${id}/download`,
};
