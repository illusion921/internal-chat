// 应用配置
export const config = {
  // API 服务器地址
  apiBaseUrl: '',
  
  // WebSocket 服务器地址
  wsUrl: '',
  
  // 文件上传大小限制 (字节)
  maxFileSize: 500 * 1024 * 1024, // 500MB
};

// 从本地存储加载用户自定义配置
export function loadUserConfig() {
  try {
    const saved = localStorage.getItem('serverConfig');
    if (saved) {
      const userConfig = JSON.parse(saved);
      Object.assign(config, userConfig);
    }
  } catch (e) {
    console.error('Failed to load user config:', e);
  }
}

// 保存用户自定义配置
export function saveUserConfig(newConfig: Partial<typeof config>) {
  try {
    localStorage.setItem('serverConfig', JSON.stringify(newConfig));
    Object.assign(config, newConfig);
  } catch (e) {
    console.error('Failed to save user config:', e);
  }
}

// 获取 API baseURL
export function getApiBaseUrl(): string {
  if (config.apiBaseUrl) {
    return config.apiBaseUrl;
  }
  // 默认使用相对路径（通过代理）
  return '/api';
}

// 获取 WebSocket URL
export function getWsUrl(): string {
  if (config.wsUrl) {
    return config.wsUrl;
  }
  // 默认使用当前页面的 origin
  return window.location.origin;
}