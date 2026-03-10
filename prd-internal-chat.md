# 内网聊天系统 PRD

> 产品需求文档 | 版本 1.0 | 2026-03-09

---

## 一、产品概述

### 1.1 产品定位

企业级内网即时通讯系统，支持完全离线环境部署，面向200-500人规模企业内部使用。

### 1.2 核心价值

- **安全可控**：完全内网部署，数据不出内网
- **稳定可靠**：离线消息保障，历史可追溯
- **功能完整**：单聊、群聊、文件传输一应俱全

### 1.3 目标用户

| 角色 | 占比 | 核心诉求 |
|------|------|----------|
| 普通员工 | 85% | 日常沟通、文件收发、历史查询 |
| 群管理员 | 10% | 群成员管理、消息公告 |
| 超级管理员 | 5% | 账号管理、系统配置、审计日志 |

---

## 二、功能清单

### 2.1 功能模块总览

```
内网聊天系统
├── 用户模块
│   ├── 账号注册/登录
│   ├── 个人信息管理
│   ├── 在线状态
│   └── 密码修改
├── 好友模块
│   ├── 好友申请/通过/拒绝
│   ├── 好友列表管理
│   ├── 好友备注
│   └── 好友分组（可选v2）
├── 消息模块
│   ├── 单聊消息
│   ├── 群聊消息
│   ├── 消息类型（文本/图片/文件）
│   ├── 历史消息查询
│   └── 离线消息推送
├── 群组模块
│   ├── 创建群组
│   ├── 群成员管理
│   ├── 群信息设置
│   └── 退出/解散群组
├── 文件模块
│   ├── 文件上传/下载
│   ├── 图片预览
│   ├── 文件过期清理（3天）
│   └── 文件大小限制
└── 管理后台（v2）
    ├── 用户管理
    ├── 群组管理
    └── 系统日志
```

### 2.2 MVP功能（v1.0）

| 模块 | 功能 | 优先级 | 备注 |
|------|------|--------|------|
| 用户 | 注册/登录 | P0 | 账号密码，管理员预创建 |
| 用户 | 个人信息 | P1 | 头像、昵称、签名 |
| 好友 | 申请好友 | P0 | 搜索用户 → 发送申请 |
| 好友 | 好友列表 | P0 | 展示在线/离线状态 |
| 消息 | 单聊 | P0 | 文本、图片、文件 |
| 消息 | 群聊 | P0 | 同上 |
| 消息 | 历史记录 | P0 | 按会话查询，分页加载 |
| 消息 | 离线消息 | P0 | 上线后自动推送 |
| 群组 | 创建群组 | P0 | 最多200人/群 |
| 群组 | 群成员管理 | P0 | 邀请、移除、设置管理员 |
| 文件 | 文件传输 | P0 | 上传下载，3天过期 |

### 2.3 迭代功能（v2.0+）

- 好友分组
- 消息撤回
- @提醒
- 消息已读回执
- 群公告
- 管理后台
- 消息搜索
- 表情包

---

## 三、用户故事

### 3.1 用户管理

```
US-001: 用户登录
作为一名 员工
我想要 使用账号密码登录系统
以便于 开始与同事沟通

验收标准：
- 输入正确的用户名密码后进入主界面
- 密码错误时提示"用户名或密码错误"
- 支持记住登录状态（7天）
- 连续5次错误锁定账号15分钟
```

```
US-002: 修改个人信息
作为一名 员工
我想要 修改我的头像、昵称和签名
以便于 让同事更容易认出我

验收标准：
- 头像支持jpg/png，最大2MB
- 昵称1-20字符，不能为空
- 签名最多50字符
- 修改后实时生效
```

### 3.2 好友管理

```
US-003: 添加好友
作为一名 员工
我想要 搜索并添加其他员工作为好友
以便于 开始私聊

验收标准：
- 支持按用户名/昵称模糊搜索
- 发送申请时可附带验证消息（选填）
- 对方收到好友申请通知
- 对方可选择同意/拒绝
- 同意后双方互为好友
```

```
US-004: 查看好友列表
作为一名 员工
我想要 查看我的好友列表及在线状态
以便于 知道谁可以联系

验收标准：
- 列表按在线/离线分组展示
- 在线用户显示绿点标识
- 支持按昵称搜索好友
- 点击好友可发起私聊
```

### 3.3 消息功能

```
US-005: 发送单聊消息
作为一名 员工
我想要 给好友发送文本/图片/文件消息
以便于 进行工作沟通

验收标准：
- 文本消息最多5000字符
- 图片支持jpg/png/gif，最大10MB
- 文件最大50MB
- 发送后立即显示在聊天窗口
- 显示发送时间
- 显示消息发送状态（发送中/已发送/失败）
```

```
US-006: 接收离线消息
作为一名 员工
我想要 上线后收到离线期间的消息
以便于 不遗漏重要信息

验收标准：
- 离线消息在登录后自动推送
- 按会话分组显示未读数量
- 离线消息保存30天
- 可标记已读
```

### 3.4 群组功能

```
US-007: 创建群组
作为一名 员工
我想要 创建群组并邀请好友加入
以便于 进行多人讨论

验收标准：
- 群名称1-30字符
- 群人数上限200人
- 创建者自动成为群主
- 可设置群头像和群公告
```

```
US-008: 群成员管理
作为一名 群主/管理员
我想要 邀请/移除群成员，设置管理员
以便于 管理群组

验收标准：
- 群主可邀请好友入群
- 群主可移除任何成员
- 管理员可移除普通成员
- 群主可设置/取消管理员
- 被移除成员收到通知
```

### 3.5 文件功能

```
US-009: 发送文件
作为一名 员工
我想要 发送文件给好友/群组
以便于 共享工作文档

验收标准：
- 单文件最大50MB
- 支持所有格式
- 显示上传进度
- 文件3天后自动过期删除
- 过期前可下载
```

---

## 四、交互流程

### 4.1 用户登录流程

```
┌─────────────┐
│  打开登录页  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  输入账号密码 │────▶│  点击登录    │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   验证成功   │          │   验证失败   │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              ▼                        ▼
       ┌─────────────┐          ┌─────────────┐
       │  进入主界面   │          │  显示错误提示 │
       └─────────────┘          │  清空密码框   │
                                └─────────────┘
```

### 4.2 添加好友流程

```
┌─────────────┐
│  点击添加好友 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  输入搜索关键词│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  显示搜索结果 │────▶│  选择用户    │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  填写验证消息 │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  发送申请    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  等待对方处理 │          │  对方已同意   │
       └─────────────┘          └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ 成为好友     │
                                 └─────────────┘
```

### 4.3 发送消息流程

```
┌─────────────┐
│  打开聊天窗口 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  加载历史消息 │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  输入消息 / 选择图片 / 选择文件   │
└──────────────┬──────────────────┘
               │
               ▼
        ┌─────────────┐
        │  点击发送    │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ WebSocket推送 │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌────────┐         ┌────────────┐
│ 显示成功 │         │ 对方在线收到 │
│ 本地缓存 │         │ 对方离线存库 │
└────────┘         └────────────┘
```

---

## 五、数据模型

### 5.1 ER图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │ friendships  │       │   groups     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │───────│ user_id      │       │ id           │
│ username     │       │ friend_id    │───────│ name         │
│ password_hash│       │ status       │       │ avatar       │
│ nickname     │       │ remark       │       │ owner_id     │───────┐
│ avatar       │       │ created_at   │       │ created_at   │       │
│ signature    │       └──────────────┘       └──────────────┘       │
│ status       │                                                     │
│ last_seen_at │       ┌──────────────┐       ┌──────────────┐       │
│ created_at   │       │group_members │       │   messages   │       │
└──────────────┘       ├──────────────┤       ├──────────────┤       │
                       │ group_id     │───────│ id           │       │
                       │ user_id      │───────│ conversation │       │
                       │ role         │       │ sender_id    │───────┘
                       │ joined_at    │       │ content      │
                       └──────────────┘       │ msg_type      │
                                              │ file_id       │───┐
                                              │ created_at   │   │
                                              └──────────────┘   │
                                                                 │
                       ┌──────────────┐                         │
                       │    files     │                         │
                       ├──────────────┤                         │
                       │ id           │◀────────────────────────┘
                       │ filename     │
                       │ filepath     │
                       │ filesize     │
                       │ uploader_id  │
                       │ expires_at   │
                       │ created_at   │
                       └──────────────┘
```

### 5.2 表结构详细设计

#### users 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 用户唯一标识 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登录用户名 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希（bcrypt） |
| nickname | VARCHAR(50) | NOT NULL | 显示昵称 |
| avatar | VARCHAR(255) | | 头像URL |
| signature | VARCHAR(100) | | 个人签名 |
| status | ENUM | DEFAULT 'offline' | online/offline |
| last_seen_at | TIMESTAMP | | 最后在线时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | | 更新时间 |

#### friendships 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 关系ID |
| user_id | UUID | FK, NOT NULL | 用户ID |
| friend_id | UUID | FK, NOT NULL | 好友ID |
| status | ENUM | DEFAULT 'pending' | pending/accepted/rejected |
| remark | VARCHAR(50) | | 好友备注 |
| created_at | TIMESTAMP | DEFAULT NOW() | 申请时间 |
| updated_at | TIMESTAMP | | 更新时间 |

**索引**: UNIQUE(user_id, friend_id)

#### groups 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 群组ID |
| name | VARCHAR(50) | NOT NULL | 群名称 |
| avatar | VARCHAR(255) | | 群头像 |
| announcement | TEXT | | 群公告 |
| owner_id | UUID | FK, NOT NULL | 群主ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | | 更新时间 |

#### group_members 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 成员ID |
| group_id | UUID | FK, NOT NULL | 群组ID |
| user_id | UUID | FK, NOT NULL | 用户ID |
| role | ENUM | DEFAULT 'member' | owner/admin/member |
| nickname | VARCHAR(50) | | 群内昵称 |
| joined_at | TIMESTAMP | DEFAULT NOW() | 加入时间 |

**索引**: UNIQUE(group_id, user_id)

#### messages 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 消息ID |
| conversation_id | UUID | NOT NULL | 会话ID |
| conversation_type | ENUM | NOT NULL | private/group |
| sender_id | UUID | FK, NOT NULL | 发送者ID |
| content | TEXT | | 消息内容 |
| msg_type | ENUM | DEFAULT 'text' | text/image/file |
| file_id | UUID | FK | 文件ID（type=file/image时） |
| created_at | TIMESTAMP | DEFAULT NOW() | 发送时间 |

**索引**: (conversation_id, created_at DESC)

#### files 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 文件ID |
| filename | VARCHAR(255) | NOT NULL | 原始文件名 |
| filepath | VARCHAR(500) | NOT NULL | 存储路径（本地文件系统） |
| filesize | INTEGER | NOT NULL | 文件大小（字节） |
| mime_type | VARCHAR(100) | | MIME类型 |
| uploader_id | UUID | FK, NOT NULL | 上传者ID |
| expires_at | TIMESTAMP | NOT NULL | 过期时间（3天后） |
| created_at | TIMESTAMP | DEFAULT NOW() | 上传时间 |

> **存储方案**：本地文件系统，路径格式 `/data/files/{year}/{month}/{day}/{uuid}.{ext}`

---

## 六、接口设计

### 6.1 RESTful API

#### 认证相关

```
POST   /api/auth/login          # 登录
POST   /api/auth/logout         # 登出
POST   /api/auth/refresh        # 刷新token
POST   /api/auth/password       # 修改密码
```

> **注意**：用户账号由管理员预创建，不提供自主注册接口。

#### 用户相关

```
GET    /api/users/search        # 搜索用户
GET    /api/users/:id           # 获取用户信息
PUT    /api/users/profile       # 更新个人信息
POST   /api/users/avatar        # 上传头像
```

#### 好友相关

```
GET    /api/friends             # 好友列表
POST   /api/friends/request     # 发送好友申请
PUT    /api/friends/request/:id # 处理好友申请（同意/拒绝）
DELETE /api/friends/:id         # 删除好友
PUT    /api/friends/:id/remark  # 设置好友备注
GET    /api/friends/requests    # 好友申请列表（收到的）
```

#### 群组相关

```
GET    /api/groups              # 我的群组列表
POST   /api/groups              # 创建群组
GET    /api/groups/:id          # 群组详情
PUT    /api/groups/:id          # 更新群组信息
DELETE /api/groups/:id          # 解散群组
POST   /api/groups/:id/members  # 邀请成员
DELETE /api/groups/:id/members/:userId  # 移除成员
PUT    /api/groups/:id/members/:userId/role  # 设置管理员
POST   /api/groups/:id/quit     # 退出群组
```

#### 消息相关

```
GET    /api/conversations                    # 会话列表
GET    /api/conversations/:id/messages       # 历史消息（分页）
POST   /api/conversations/:id/read           # 标记已读
GET    /api/conversations/:id/unread-count  # 未读消息数
```

#### 文件相关

```
POST   /api/files/upload        # 上传文件
GET    /api/files/:id/download  # 下载文件
GET    /api/files/:id           # 文件信息
```

### 6.2 WebSocket 事件

#### 客户端 → 服务端

```javascript
// 连接认证
socket.emit('authenticate', { token: 'xxx' })

// 发送消息
socket.emit('message:send', {
  conversationId: 'xxx',
  conversationType: 'private', // 或 'group'
  msgType: 'text',             // text/image/file
  content: '你好',
  fileId: null                  // 可选
})

// 输入状态（可选v2）
socket.emit('typing:start', { conversationId: 'xxx' })
socket.emit('typing:stop', { conversationId: 'xxx' })

// 已读回执
socket.emit('message:read', { conversationId: 'xxx', lastMessageId: 'xxx' })
```

#### 服务端 → 客户端

```javascript
// 新消息通知
socket.on('message:new', (message) => {
  // message: { id, conversationId, senderId, content, msgType, createdAt }
})

// 消息发送状态
socket.on('message:sent', (data) => {
  // data: { tempId, messageId, createdAt }
})

// 好友申请通知
socket.on('friend:request', (data) => {
  // data: { id, fromUserId, fromNickname, message }
})

// 系统通知
socket.on('system:notification', (data) => {
  // data: { type, message }
})
```

---

## 七、非功能性需求

### 7.1 性能要求

| 指标 | 要求 | 说明 |
|------|------|------|
| 消息延迟 | < 500ms | 从发送到接收 |
| 在线用户 | 支持500人同时在线 | |
| 消息吞吐 | 1000条/秒 | |
| 文件上传 | 支持50MB | |
| 页面加载 | < 3秒 | 首屏 |

### 7.2 安全要求

| 项目 | 方案 |
|------|------|
| 传输加密 | WSS (TLS 1.3) |
| 密码存储 | bcrypt (cost=12) |
| 会话管理 | JWT + Refresh Token |
| 文件访问 | 签名URL，有效期1小时 |
| 敏感操作 | 需二次确认（删除好友、解散群） |
| SQL注入 | 使用ORM参数化查询 |
| XSS | 前端输出转义 |
| 账号创建 | 管理员预创建，无自主注册 |

### 7.3 可用性要求

| 项目 | 要求 |
|------|------|
| 系统可用性 | 99.5%（工作日 9:00-21:00） |
| 数据备份 | 每日增量备份，每周全量备份 |
| 故障恢复 | < 30分钟 |

### 7.4 兼容性

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |
| 分辨率 | 最小1366x768 |
| Ubuntu客户端 | Ubuntu 20.04+ |

---

## 八、技术架构

### 8.1 整体架构图

```
┌────────────────────────────────────────────────────────────┐
│                        前端层                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               React + TypeScript                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │  聊天页面 │ │  联系人  │ │  设置页面 │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  Ant Design  │  Zustand  │  Socket.io-client       │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                              │
                              │ WSS / HTTPS
                              ▼
┌────────────────────────────────────────────────────────────┐
│                        后端层                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Fastify + TypeScript                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │ Auth模块  │ │  API路由 │ │ WS处理   │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │ 用户服务  │ │ 消息服务  │ │ 文件服务  │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘            │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │      Redis        │ │      MinIO       │
│  ┌────────────┐  │ │  ┌────────────┐   │ │  ┌────────────┐  │
│  │ 用户数据    │  │ │  │ 会话缓存   │   │ │  │ 文件存储   │  │
│  │ 消息数据    │  │ │  │ 离线队列   │   │ │  │ 图片存储   │  │
│  │ 关系数据    │  │ │  │ 在线状态   │   │ │  │ 头像存储   │  │
│  └────────────┘  │ │  └────────────┘   │ │  └────────────┘  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 8.2 目录结构

```
internal-chat/
├── web/                          # 前端项目
│   ├── src/
│   │   ├── components/           # 通用组件
│   │   │   ├── ChatWindow/
│   │   │   ├── ContactList/
│   │   │   ├── MessageItem/
│   │   │   └── ...
│   │   ├── pages/                # 页面
│   │   │   ├── Login/
│   │   │   ├── Main/
│   │   │   └── Settings/
│   │   ├── stores/               # Zustand状态
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── contactStore.ts
│   │   ├── services/             # API服务
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   ├── types/                # 类型定义
│   │   └── utils/                # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── server/                       # 后端项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── friend/
│   │   │   ├── group/
│   │   │   ├── message/
│   │   │   └── file/
│   │   ├── middleware/           # 中间件
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── socket/               # WebSocket处理
│   │   │   ├── handlers/
│   │   │   └── index.ts
│   │   ├── models/               # 数据模型
│   │   ├── services/             # 业务逻辑
│   │   ├── utils/                # 工具函数
│   │   ├── config/               # 配置
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docker/                       # Docker配置
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── ...
│
├── docs/                         # 文档
│   ├── api.md
│   └── deploy.md
│
└── README.md
```

---

## 九、部署方案

### 9.1 服务器配置（推荐）

| 组件 | 配置 | 数量 | 说明 |
|------|------|------|------|
| 应用服务器 | 4C8G | 1 | Node.js应用 |
| 数据库服务器 | 4C16G | 1 | PostgreSQL |
| 缓存服务器 | 2C4G | 1 | Redis |
| 文件服务器 | 4C8G + 500G存储 | 1 | MinIO |

**最小化部署**：可合并到一台8C16G服务器

### 9.2 Docker Compose 示例

```yaml
version: '3.8'

services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/chat
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - redis
      - minio

  web:
    build: ./web
    ports:
      - "80:80"
    depends_on:
      - app

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: chat
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: admin123
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 十、开发计划

### 10.1 里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| Phase 1 - 基础架构 | 1周 | 项目骨架、数据库、认证 |
| Phase 2 - 核心功能 | 2周 | 单聊、好友、消息 |
| Phase 3 - 群组功能 | 1.5周 | 群组、群成员管理 |
| Phase 4 - 文件功能 | 1周 | 文件上传下载、过期清理 |
| Phase 5 - 测试优化 | 1周 | Bug修复、性能优化 |
| Phase 6 - Ubuntu客户端 | 2周 | Electron打包、原生优化 |

### 10.2 风险项

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| WebSocket断线重连 | 用户体验 | 心跳检测 + 自动重连 + 消息补发 |
| 文件存储空间 | 服务稳定性 | 定时清理 + 容量监控告警 |
| 数据库性能 | 系统响应 | 消息表分页优化 + 索引优化 |

---

## 十一、附录

### 11.1 消息类型定义

```typescript
interface Message {
  id: string;
  conversationId: string;
  conversationType: 'private' | 'group';
  senderId: string;
  sender?: User;              // 冗余字段，前端展示用
  content: string;
  msgType: 'text' | 'image' | 'file';
  file?: File;                // 冗余字段
  createdAt: Date;
}

interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  signature: string;
  status: 'online' | 'offline';
}

interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  friend?: User;
  status: 'pending' | 'accepted' | 'rejected';
  remark: string;
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  avatar: string;
  announcement: string;
  ownerId: string;
  owner?: User;
  memberCount: number;
  createdAt: Date;
}

interface GroupMember {
  groupId: string;
  userId: string;
  user?: User;
  role: 'owner' | 'admin' | 'member';
  nickname: string;
  joinedAt: Date;
}
```

### 11.2 错误码定义

| 错误码 | 说明 |
|--------|------|
| 10001 | 用户名或密码错误 |
| 10002 | 账号已被锁定 |
| 10003 | Token已过期 |
| 20001 | 用户不存在 |
| 20002 | 好友关系已存在 |
| 20003 | 好友申请不存在 |
| 30001 | 群组不存在 |
| 30002 | 无权限操作 |
| 30003 | 群人数已达上限 |
| 40001 | 文件大小超限 |
| 40002 | 文件已过期 |
| 50001 | 服务器内部错误 |

---

**文档版本**: v1.0  
**最后更新**: 2026-03-09  
**维护者**: 产品团队