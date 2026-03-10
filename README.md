# Internal Chat - 内网聊天系统

企业级内网即时通讯系统，支持完全离线环境部署。

## 功能特性

- ✅ 单聊 / 群聊
- ✅ 好友管理
- ✅ 群组管理
- ✅ 文件传输（图片、文件）
- ✅ 消息持久化
- ✅ 离线消息推送
- ✅ 历史消息查询

## 技术栈

### 前端
- React 18 + TypeScript
- Ant Design
- Zustand (状态管理)
- Socket.io-client

### 后端
- Node.js + Fastify + TypeScript
- Socket.io
- PostgreSQL
- Redis
- 本地文件系统

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 7

### 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd web
npm install
```

### 配置环境变量

```bash
# server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/internal_chat
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FILE_STORAGE_PATH=/data/files
FILE_MAX_SIZE=52428800  # 50MB
PORT=3000
```

### 初始化数据库

```bash
cd server
npm run db:migrate
npm run db:seed  # 创建管理员账号
```

### 启动开发服务器

```bash
# 后端
cd server
npm run dev

# 前端
cd web
npm run dev
```

## 项目结构

```
internal-chat/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面
│   │   ├── stores/         # 状态管理
│   │   ├── services/       # API 服务
│   │   ├── types/          # 类型定义
│   │   └── utils/          # 工具函数
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   ├── middleware/     # 中间件
│   │   ├── socket/         # WebSocket 处理
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 工具函数
│   │   ├── config/         # 配置
│   │   └── app.ts          # 应用入口
│   └── package.json
│
├── docker/                 # Docker 配置
├── docs/                   # 文档
└── README.md
```

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

⚠️ 首次登录后请立即修改密码

## 文档

- [API 文档](./docs/api.md)
- [部署指南](./docs/deploy.md)
- [PRD 文档](../prd-internal-chat.md)

## License

MIT