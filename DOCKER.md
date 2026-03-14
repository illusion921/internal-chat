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
# 编辑 .env 文件，修改密码和密钥
```

### 3. 启动服务
```bash
docker-compose up -d
```

### 4. 查看日志
```bash
docker-compose logs -f
```

### 5. 停止服务
```bash
docker-compose down
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 前端 | 80 | Nginx 托管的静态文件 |
| API 后端 | 3001 | Node.js API 服务 |
| PostgreSQL | 5432 | 数据库（仅内部访问） |
| Redis | 6379 | 缓存服务（仅内部访问） |

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
- `uploads-data` - 上传文件

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 备份数据

```bash
# 备份 PostgreSQL
docker exec internal-chat-postgres pg_dump -U postgres internal_chat > backup.sql

# 备份上传文件
docker cp internal-chat-server:/app/uploads ./uploads-backup
```

## 故障排查

### 查看容器状态
```bash
docker-compose ps
```

### 查看服务日志
```bash
docker-compose logs -f server
docker-compose logs -f web
```

### 进入容器调试
```bash
docker exec -it internal-chat-server sh
docker exec -it internal-chat-postgres psql -U postgres -d internal_chat
```

## 生产环境建议

1. **修改默认密码** - 务必修改 `.env` 中的密码
2. **配置 HTTPS** - 使用 Nginx 或 Traefik 配置 SSL
3. **限制端口暴露** - 只暴露必要端口（80/443）
4. **定期备份** - 设置定时备份任务
5. **监控告警** - 配置服务监控