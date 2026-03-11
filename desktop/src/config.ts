// 应用配置
export const config = {
  // API 服务器地址 - 可根据实际部署修改
  apiBaseUrl: 'http://localhost:3001/api',
  
  // WebSocket 服务器地址
  wsUrl: 'ws://localhost:3001',
  
  // 文件上传大小限制 (字节)
  maxFileSize: 500 * 1024 * 1024, // 500MB
  
  // 是否为桌面应用
  isDesktop: true,
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