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

## 目录结构

```
desktop/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
├── src/               # React 渲染进程代码
│   ├── components/    # React 组件
│   ├── pages/         # 页面组件
│   ├── services/      # API 和 Socket 服务
│   ├── stores/        # 状态管理 (Zustand)
│   ├── types/         # TypeScript 类型定义
│   ├── utils/         # 工具函数
│   └── main.tsx       # 渲染进程入口
├── build/             # 构建资源（图标等）
├── dist/              # 编译输出
├── release/           # 打包输出
└── package.json
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包 (根据当前平台)
npm run package

# 指定平台打包
npm run package:win    # Windows
npm run package:linux  # Linux
npm run package:mac    # macOS
```

## 配置

首次运行需要在登录界面点击设置按钮配置服务器地址：
- API 服务器地址：如 `http://192.168.1.100:3001/api`
- WebSocket 服务器地址：如 `ws://192.168.1.100:3001`

配置会保存在 localStorage，下次启动自动加载。

## 功能

- ✅ 用户登录/注册
- ✅ 单聊/群聊
- ✅ 文件传输 (最大 500MB)
- ✅ 图片发送/预览
- ✅ 离线消息
- ✅ 好友管理
- ✅ 群组管理
- ✅ 通知提醒
- ✅ 未读消息徽章

## 打包输出

### Windows
- `内网聊天-1.0.0-win-x64.zip` - 便携版
- `内网聊天 -1.0.0-win-x64.exe` - 安装版 (NSIS)

### Linux
- `内网聊天 -1.0.0-linux-x64.deb` - Debian/Ubuntu
- `内网聊天 -1.0.0-linux-arm64.deb` - ARM64
- `内网聊天 -1.0.0-linux-x64.AppImage` - AppImage

### macOS
- `内网聊天 -1.0.0-mac-x64.dmg` - Intel
- `内网聊天 -1.0.0-mac-arm64.dmg` - Apple Silicon

## 图标资源

构建前需要在 `build/` 目录放置图标文件：
- `icon.ico` - Windows (256x256)
- `icon.icns` - macOS (512x512)
- `icon.png` - Linux (512x512)

## 代码优化

### 模块化 API
- `api.base.ts` - Axios 实例和拦截器
- `api.auth.ts` - 认证 API
- `api.user.ts` - 用户 API
- `api.friend.ts` - 好友 API
- `api.group.ts` - 群组 API
- `api.message.ts` - 消息 API
- `api.file.ts` - 文件 API

### Socket 服务
- 事件监听器分离
- 统一的连接管理

### 错误处理
- 全局错误边界
- 统一的错误处理中间件

## 支持平台

- Linux (x64, arm64)
- Windows (x64)
- macOS (x64, arm64)

## License

MIT License
