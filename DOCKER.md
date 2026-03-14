# Docker 部署指南

## 快速启动

### 1. 克隆项目
```bash
git clone https://github.com/illusion921/internal-chat.git
cd internal-chat
```

### 2. 创建环境变量文件
```bash
cp .env.example .env
# 编辑 .env 文件，修改以下配置：
# - POSTGRES_PASSWORD: PostgreSQL 密码
# - JWT_SECRET: JWT 签名密钥
# - SERVER_IP: 服务器 IP 地址
```

### 3. 构建并启动
```bash
# 使用 docker compose (推荐)
docker compose up -d --build

# 或使用 docker-compose (旧版本)
docker-compose up -d --build
```

### 4. 查看状态
```bash
docker compose ps
docker compose logs -f
```

### 5. 停止服务
```bash
docker compose down
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 前端 | 80 | Nginx 托管的静态文件 |
| API 后端 | 3001 | Node.js API 服务 |
| PostgreSQL | 5432 | 数据库（仅内部访问） |
| Redis | 6379 | 缓存服务（仅内部访问） |

## 访问地址

- **前端**: http://localhost 或 http://YOUR_SERVER_IP
- **API**: http://localhost:3001

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| POSTGRES_PASSWORD | postgres | PostgreSQL 密码 |
| JWT_SECRET | internal-chat-secret-change-me | JWT 签名密钥 |
| SERVER_IP | localhost | 服务器 IP（用于 CORS） |

## 数据持久化

Docker 会创建以下卷用于数据持久化：
- `postgres-data` - PostgreSQL 数据
- `redis-data` - Redis 数据  
- `uploads-data` - 上传文件（头像、文件等）

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

## 备份数据

```bash
# 备份 PostgreSQL
docker exec internal-chat-postgres pg_dump -U postgres internal_chat > backup_$(date +%Y%m%d).sql

# 备份上传文件
docker cp internal-chat-server:/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

## 恢复数据

```bash
# 恢复 PostgreSQL
cat backup.sql | docker exec -i internal-chat-postgres psql -U postgres internal_chat

# 恢复上传文件
docker cp ./uploads_backup internal-chat-server:/app/uploads
```

## 故障排查

### 查看容器状态
```bash
docker compose ps
```

### 查看服务日志
```bash
# 所有服务日志
docker compose logs -f

# 后端日志
docker compose logs -f server

# 前端日志
docker compose logs -f web

# 数据库日志
docker compose logs -f postgres
```

### 进入容器调试
```bash
# 进入后端容器
docker exec -it internal-chat-server sh

# 进入数据库
docker exec -it internal-chat-postgres psql -U postgres -d internal_chat

# 进入 Redis
docker exec -it internal-chat-redis redis-cli
```

### 常见问题

**1. 端口被占用**
```bash
# 检查端口占用
ss -tlnp | grep -E "(80|3001)"
# 停止冲突的服务
docker compose down
```

**2. 数据库连接失败**
```bash
# 检查数据库状态
docker compose logs postgres
# 重启数据库
docker compose restart postgres
```

**3. 图片/文件丢失**
```bash
# 检查上传目录
docker exec internal-chat-server ls -la /app/uploads
```

## 生产环境建议

1. **修改默认密码** - 务必修改 `.env` 中的所有密码和密钥
2. **配置 HTTPS** - 使用 Nginx 反向代理或 Traefik 配置 SSL
3. **限制端口暴露** - 只暴露必要端口（80/443）
4. **定期备份** - 设置定时备份任务
5. **监控告警** - 配置服务监控和告警
6. **资源限制** - 在 docker-compose.yml 中添加资源限制

## 资源限制示例

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```