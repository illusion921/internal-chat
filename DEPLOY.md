# Internal Chat 部署文档

## 快速部署（推荐）

### 一键部署脚本

```bash
# 下载并执行部署脚本
curl -fsSL https://raw.githubusercontent.com/illusion921/internal-chat/master/deploy.sh | bash

# 或者指定服务器 IP
curl -fsSL https://raw.githubusercontent.com/illusion921/internal-chat/master/deploy.sh | bash -s -- 192.168.1.100
```

### 手动部署

```bash
# 1. 克隆代码
git clone https://github.com/illusion921/internal-chat.git
cd internal-chat

# 2. 创建环境变量文件
cat > .env << 'EOF'
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
SERVER_IP=你的服务器IP
EOF

# 3. 构建并启动
docker compose up -d --build

# 4. 创建管理员账号
docker exec internal-chat-server node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('admin123', 10));
" | xargs -I {} docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "
INSERT INTO users (id, username, password_hash, nickname, status, created_at, updated_at) 
VALUES (gen_random_uuid(), 'admin', '{}', '管理员', 'online', NOW(), NOW());
"
```

## 访问系统

- 地址: `http://服务器IP`
- 默认账号: `admin`
- 默认密码: `admin123`

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看后端日志
docker logs internal-chat-server -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 完全清理（包括数据）
docker compose down -v
```

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | 前端静态文件 + API 代理 |
| 3001 | Node.js | 后端 API（仅容器内部） |
| 5432 | PostgreSQL | 数据库（仅容器内部） |
| 6379 | Redis | 缓存（仅容器内部） |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| POSTGRES_PASSWORD | PostgreSQL 密码 | postgres |
| JWT_SECRET | JWT 签名密钥 | 随机生成 |
| SERVER_IP | 服务器 IP 地址 | 自动检测 |

## 数据持久化

数据存储在 Docker volumes 中：

- `postgres-data`: 数据库数据
- `redis-data`: Redis 数据
- `uploads-data`: 上传文件

## 故障排除

### 后端无法启动

```bash
# 查看后端日志
docker logs internal-chat-server --tail 100

# 常见问题：
# 1. 数据库连接失败 - 等待数据库启动
# 2. Redis 连接失败 - 检查 Redis 容器状态
```

### 数据库表不存在

```bash
# 手动推送数据库结构
docker exec internal-chat-server npx prisma db push
```

### 登录失败

```bash
# 检查用户是否存在
docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "SELECT * FROM users;"

# 重置管理员密码
HASH=$(docker exec internal-chat-server node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('new_password', 10));")
docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "UPDATE users SET password_hash = '$HASH' WHERE username = 'admin';"
```

## 生产环境建议

1. **修改默认密码**: 首次登录后立即修改管理员密码
2. **配置 HTTPS**: 使用 nginx 反向代理配置 SSL 证书
3. **定期备份**: 备份 PostgreSQL 数据和上传文件
4. **监控日志**: 定期检查服务日志

## 备份与恢复

```bash
# 备份数据库
docker exec internal-chat-postgres pg_dump -U postgres internal_chat > backup.sql

# 恢复数据库
docker exec -i internal-chat-postgres psql -U postgres internal_chat < backup.sql

# 备份上传文件
docker cp internal-chat-server:/app/uploads ./uploads_backup
```

## 更新系统

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 如有数据库变更
docker exec internal-chat-server npx prisma db push
```