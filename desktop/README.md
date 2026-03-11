# 内网聊天桌面客户端

基于 Electron + React + TypeScript + Ant Design 的跨平台桌面聊天应用。

## 技术栈

- **Electron 28** - 跨平台桌面框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design 5** - UI 组件库
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **Socket.IO** - 实时通信

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包 (Linux)
npm run package
```

## 配置

首次运行需要在设置中配置服务器地址：
- API 服务器地址：如 `http://192.168.1.100:3001/api`
- WebSocket 服务器地址：如 `ws://192.168.1.100:3001`

## 功能

- ✅ 用户登录/注册
- ✅ 单聊/群聊
- ✅ 文件传输 (最大 500MB)
- ✅ 图片发送/预览
- ✅ 离线消息
- ✅ 好友管理
- ✅ 群组管理

## 打包输出

- `release/internal-chat-desktop_1.0.0_amd64.AppImage` - AppImage 格式
- `release/internal-chat-desktop_1.0.0_amd64.deb` - Debian/Ubuntu 安装包

## 支持

- Linux (x64, arm64)
- Windows (x64)
- macOS (x64, arm64)