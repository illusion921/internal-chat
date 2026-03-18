import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@stores/authStore';
import { config as appConfig } from '@src/config';

const api = axios.create({
  timeout: 300000, // 5 分钟，支持大文件上传
  headers: {
    'Content-Type': 'application/json',
  },
});

// 动态获取 baseURL
api.interceptors.request.use((config) => {
  config.baseURL = appConfig.apiBaseUrl;
  return config;
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
    const originalRequest = error.config as any;

    // 会话被踢出（特定错误码）
    if (error.response?.data?.code === 10004 || (error.response?.data as any)?.kicked) {
      const { logout } = useAuthStore.getState();
      logout();
      // 显示提示
      alert(error.response?.data?.message || '您的账号在其他地方登录，已被强制下线');
      window.location.href = '/login';
      return Promise.reject(error.response.data);
    }

    // Token 过期，尝试刷新
    if (error.response?.status === 401 && originalRequest) {
      const { refreshToken, updateToken, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response: any = await axios.post(`${appConfig.apiBaseUrl}/auth/refresh`, {
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
