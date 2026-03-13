# 数据库迁移指南：SQLite → PostgreSQL

## 为什么迁移？

- **并发性能**：PostgreSQL 支持更高的并发连接
- **生产就绪**：更适合生产环境
- **功能丰富**：支持更多 SQL 特性
- **可扩展性**：更容易扩展和优化

## 迁移步骤

### 1. 安装 PostgreSQL (Ubuntu/Debian)

```bash
cd /home/y/projects/internal-chat/server
npm run db:setup-pg
```

或手动安装：

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE internal_chat;"
sudo -u postgres psql -d internal_chat -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 2. 更新环境变量

`.env` 文件已更新为：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/internal_chat?schema=public"
```

### 3. 运行数据库迁移

```bash
cd /home/y/projects/internal-chat/server

# 生成 Prisma Client
npm run db:generate

# 运行迁移
npm run db:migrate:pg
```

### 4. 迁移现有数据（可选）

如果有 SQLite 数据需要迁移：

```bash
# 指定 SQLite 数据库路径
npm run db:migrate-data -- ./dev.db
```

### 5. 重启服务

```bash
npm run dev
```

## Docker 部署

使用 Docker Compose 一键部署（包含 PostgreSQL）：

```bash
cd /home/y/projects/internal-chat/server

# 创建环境变量文件
cp .env.example .env

# 编辑 JWT_SECRET
nano .env

# 启动服务
docker-compose up -d
```

## 验证迁移

```bash
# 连接数据库
psql -U postgres -d internal_chat

# 查看表
\dt

# 查看用户数
SELECT COUNT(*) FROM users;
```

## 常见问题

### 连接失败

检查 PostgreSQL 服务状态：
```bash
sudo systemctl status postgresql
```

### 权限问题

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### 端口冲突

检查 5432 端口：
```bash
ss -tlnp | grep 5432
```

## 连接信息

| 参数 | 值 |
|------|-----|
| 主机 | localhost |
| 端口 | 5432 |
| 数据库 | internal_chat |
| 用户 | postgres |
| 密码 | postgres |

**连接字符串：**
```
postgresql://postgres:postgres@localhost:5432/internal_chat?schema=public
```