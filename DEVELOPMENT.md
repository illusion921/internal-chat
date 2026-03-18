# 内网聊天系统 - 开发文档

## 项目简介

内网聊天系统是一个企业级即时通讯解决方案，支持私聊、群聊、好友管理、文件传输等功能。

## 技术栈

### 后端
- **框架**: Fastify 4.x (高性能 Node.js Web 框架)
- **数据库**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **缓存**: Redis (ioredis)
- **实时通信**: Socket.IO 4.x
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **文件存储**: 本地文件系统

### 前端
- **框架**: React 18
- **构建工具**: Vite 5.x
- **UI 组件库**: Ant Design 5.x
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **实时通信**: Socket.IO Client
- **样式**: CSS Modules

### 桌面端 (可选)
- **框架**: Electron
- **打包工具**: electron-builder

## 项目结构

```
internal-chat/
├── server/                 # 后端代码
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── user/       # 用户模块
│   │   │   ├── friend/     # 好友模块
│   │   │   ├── group/      # 群组模块
│   │   │   ├── message/    # 消息模块
│   │   │   ├── file/       # 文件模块
│   │   │   └── admin/      # 管理模块
│   │   ├── models/         # 数据模型
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 服务层
│   │   ├── socket/         # WebSocket 处理
│   │   ├── config/         # 配置
│   │   └── app.ts          # 应用入口
│   ├── prisma/             # 数据库 Schema
│   ├── uploads/            # 上传文件目录
│   └── package.json
│
├── web/                    # 前端代码
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── ChatWindow/ # 聊天窗口
│   │   │   ├── ContactList/# 联系人列表
│   │   │   ├── GroupInfo/  # 群组信息
│   │   │   └── ...
│   │   ├── pages/          # 页面
│   │   │   ├── Main/       # 主页面
│   │   │   ├── Login/      # 登录页
│   │   │   └── Admin/      # 管理页
│   │   ├── stores/         # 状态管理
│   │   ├── services/       # API 服务
│   │   ├── utils/          # 工具函数
│   │   └── types/          # 类型定义
│   └── package.json
│
├── desktop/                # 桌面端代码 (Electron)
├── docker/                 # Docker 配置
├── docs/                   # 文档目录
├── chat.sh                 # 服务管理脚本
└── docker-compose.yml      # Docker Compose 配置
```

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 6
- npm >= 9

### 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```env
# 服务端口
PORT=3002

# 数据库连接
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internal_chat

# Redis 连接
REDIS_URL=redis://localhost:6379

# JWT 密钥
JWT_SECRET=your-super-secret-key

# 文件存储路径
FILE_STORAGE_PATH=./uploads

# CORS 允许的源
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 初始化数据库

```bash
cd server

# 生成 Prisma Client
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# (可选) 填充测试数据
npm run db:seed
```

### 启动开发服务器

```bash
# 使用管理脚本（推荐）
./chat.sh start

# 或手动启动
# 后端
cd server
npm run dev

# 前端（另一个终端）
cd web
npm run dev
```

### 访问地址

- 前端: http://localhost:5173
- 后端 API: http://localhost:3002
- API 健康检查: http://localhost:3002/api/health

## API 文档

### 认证 API (`/api/auth`)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /register | 用户注册 |
| POST | /login | 用户登录 |
| POST | /logout | 用户登出 |
| GET | /me | 获取当前用户信息 |
| PUT | /password | 修改密码 |

### 用户 API (`/api/users`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /search | 搜索用户 |
| GET | /:id | 获取用户信息 |
| PUT | /:id | 更新用户信息 |

### 好友 API (`/api/friends`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | / | 获取好友列表 |
| POST | /request | 发送好友申请 |
| GET | /requests | 获取好友申请列表 |
| PUT | /request/:id | 处理好友申请 |
| DELETE | /:id | 删除好友 |
| PUT | /:id/remark | 设置好友备注 |

### 好友分组 API (`/api/friends/groups`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | / | 获取分组列表 |
| POST | / | 创建分组 |
| PUT | /:id | 修改分组名 |
| DELETE | /:id | 删除分组 |
| PUT | /:id/move | 移动好友到分组 |

### 群组 API (`/api/groups`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | / | 获取我的群组列表 |
| POST | / | 创建群组 |
| GET | /:id | 获取群组详情 |
| PUT | /:id | 更新群组信息 |
| DELETE | /:id | 解散群组 |
| POST | /:id/members | 邀请成员 |
| DELETE | /:id/members/:memberId | 移除成员 |
| PUT | /:id/members/:memberId/role | 设置成员角色 |
| POST | /:id/quit | 退出群组 |

### 消息 API (`/api/conversations`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | / | 获取会话列表 |
| GET | /:id/messages | 获取消息记录 |
| POST | /:id/read | 标记已读 |

### 文件 API (`/api/files`)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /upload | 上传文件 |
| GET | /:id | 下载文件 |

### 管理 API (`/api/admin`)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /stats | 获取系统统计 |
| GET | /users | 获取用户列表 |
| POST | /users | 创建用户 |
| PUT | /users/:id | 更新用户 |
| DELETE | /users/:id | 删除用户 |
| PUT | /users/:id/password | 重置用户密码 |
| GET | /groups | 获取群组列表 |
| DELETE | /groups/:id | 解散群组 |

## WebSocket 事件

### 客户端发送

| 事件 | 数据 | 描述 |
|------|------|------|
| message:send | `{ conversationId, conversationType, msgType, content, fileId, mentionIds }` | 发送消息 |
| typing:start | `{ conversationId, conversationType }` | 开始输入 |
| typing:stop | `{ conversationId, conversationType }` | 停止输入 |
| message:read | `{ conversationId, lastMessageId }` | 标记已读 |
| group:join | `groupId` | 加入群组房间 |
| group:leave | `groupId` | 离开群组房间 |

### 服务端推送

| 事件 | 数据 | 描述 |
|------|------|------|
| message:new | `Message` | 新消息 |
| message:sent | `{ tempId, messageId, createdAt }` | 消息发送成功 |
| message:error | `{ tempId, error }` | 消息发送失败 |
| message:offline | `Message` | 离线消息 |
| typing:start | `{ conversationId, userId }` | 对方开始输入 |
| typing:stop | `{ conversationId, userId }` | 对方停止输入 |
| message:read | `{ conversationId, userId, lastMessageId }` | 消息已读 |
| session:kicked | `{ reason }` | 会话被踢出 |

## 数据模型

### User (用户)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  nickname     String
  avatar       String?
  signature    String?
  status       String   @default("offline")
  lastSeenAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Friendship (好友关系)

```prisma
model Friendship {
  id         String   @id @default(uuid())
  userId     String
  friendId   String
  status     String   @default("pending") // pending, accepted, rejected
  remark     String?
  groupId    String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@unique([userId, friendId])
}
```

### Group (群组)

```prisma
model Group {
  id           String   @id @default(uuid())
  name         String
  avatar       String?
  announcement String?
  ownerId      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### GroupMember (群成员)

```prisma
model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      String   @default("member") // owner, admin, member
  nickname  String?
  joinedAt  DateTime @default(now())
  
  @@unique([groupId, userId])
}
```

### Message (消息)

```prisma
model Message {
  id               String    @id @default(uuid())
  conversationId   String
  conversationType String    // private, group
  senderId         String
  content          String?
  msgType          String    @default("text") // text, image, file
  fileId           String?
  mentionIds       String?   // JSON array
  recalledAt       DateTime?
  createdAt        DateTime  @default(now())
}
```

## 服务管理

使用 `chat.sh` 脚本管理服务：

```bash
# 启动服务
./chat.sh start

# 停止服务
./chat.sh stop

# 重启服务
./chat.sh restart

# 查看状态
./chat.sh status
```

## 开发规范

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 代码规范

- 使用 TypeScript
- 使用 ESLint + Prettier
- 组件使用函数式组件 + Hooks
- 样式使用 CSS Modules 或内联样式

### 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `bugfix/*`: 修复分支

## 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 服务是否运行：
```bash
sudo systemctl status postgresql
```

### 2. Redis 连接失败

检查 Redis 服务是否运行：
```bash
sudo systemctl status redis
```

### 3. 前端无法连接后端

检查 CORS 配置是否正确，确保前端地址在 `CORS_ORIGINS` 中。

### 4. WebSocket 连接失败

确保 Socket.IO 客户端版本与服务端版本兼容。

## 性能优化建议

1. **数据库**: 添加适当的索引，使用连接池
2. **Redis**: 使用 Pipeline 批量操作
3. **前端**: 使用 React.memo、useMemo、useCallback 优化渲染
4. **文件存储**: 大文件使用分片上传，考虑使用对象存储

## 扩展功能规划

- [ ] 消息撤回
- [ ] 语音/视频通话
- [ ] 消息加密
- [ ] 多端同步
- [ ] 离线推送
- [ ] 消息搜索
- [ ] 群组权限管理
- [ ] 管理后台完善

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系开发团队。