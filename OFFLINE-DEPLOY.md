# Internal Chat 离线部署指南

## 概述

本文档说明如何在内网环境（无法访问互联网）部署 Internal Chat 系统。

## 部署流程

### 第一步：在有网络的机器上打包

```bash
# 1. 克隆代码
git clone https://github.com/illusion921/internal-chat.git
cd internal-chat

# 2. 执行打包脚本
chmod +x pack.sh
./pack.sh

# 3. 打包完成后，会生成 offline-package 目录
#    包含以下文件：
#    - images.tar          Docker 镜像（约 500MB）
#    - docker-compose.yml  服务编排配置
#    - install.sh          安装脚本
#    - .env.example        环境变量模板
#    - DEPLOY.md           部署文档
```

### 第二步：传输到内网服务器

将 `offline-package` 整个目录复制到内网服务器，方式包括：

- U盘拷贝
- 内网文件共享
- SCP 传输（如果内网有跳板机）

### 第三步：在内网服务器上安装

```bash
# 1. 进入部署目录
cd offline-package

# 2. 执行安装脚本
chmod +x install.sh
./install.sh

# 按提示输入：
# - 服务器 IP 地址
# - 数据库密码（可选，默认随机生成）
# - JWT 密钥（可选，默认随机生成）

# 3. 安装完成后访问
# http://服务器IP
# 账号: admin
# 密码: admin123
```

## 手动安装（如果自动脚本失败）

```bash
# 1. 加载镜像
docker load -i images.tar

# 2. 创建配置文件
cat > .env << EOF
POSTGRES_PASSWORD=your_password
JWT_SECRET=your_secret
SERVER_IP=192.168.1.100
EOF

# 3. 启动服务
docker compose up -d

# 4. 等待服务启动（约 30 秒）
sleep 30

# 5. 创建管理员账号
docker exec internal-chat-server node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('admin123', 10));
" | xargs -I {} docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "
INSERT INTO users (id, username, password_hash, nickname, status, created_at, updated_at) 
VALUES (gen_random_uuid(), 'admin', '{}', '管理员', 'online', NOW(), NOW());
"
```

## 系统要求

- 操作系统: Linux (推荐 Ubuntu 20.04+ / CentOS 7+)
- 内存: 最低 2GB，推荐 4GB+
- 磁盘: 最低 10GB 可用空间
- 软件: Docker 20.10+ 和 Docker Compose

### 安装 Docker（如果内网服务器未安装）

如果内网服务器可以访问外网：
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

如果完全离线，需要单独下载 Docker 离线安装包。

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看所有日志
docker compose logs -f

# 只看后端日志
docker logs internal-chat-server -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 启动服务
docker compose up -d
```

## 故障排除

### 服务启动失败

```bash
# 查看详细错误
docker compose logs

# 常见问题：
# 1. 端口被占用 - 检查 80 端口是否被占用
# 2. 内存不足 - 检查系统内存
```

### 数据库连接失败

```bash
# 检查数据库状态
docker compose ps postgres

# 查看数据库日志
docker logs internal-chat-postgres
```

### 登录失败

```bash
# 检查用户是否存在
docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "SELECT * FROM users;"

# 手动创建管理员
docker exec internal-chat-server node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('newpassword', 10));
" | xargs -I {} docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "
INSERT INTO users (id, username, password_hash, nickname, status, created_at, updated_at) 
VALUES (gen_random_uuid(), 'admin', '{}', '管理员', 'online', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET password_hash = '{}';
"
```

## 数据备份与恢复

```bash
# 备份数据库
docker exec internal-chat-postgres pg_dump -U postgres internal_chat > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i internal-chat-postgres psql -U postgres internal_chat < backup_20260315.sql

# 备份上传的文件
docker cp internal-chat-server:/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

## 更新系统

需要重新在有网络的机器上打包，然后传输到内网服务器：

```bash
# 1. 在内网服务器上停止旧服务
docker compose down

# 2. 加载新镜像
docker load -i images.tar

# 3. 启动新服务
docker compose up -d

# 4. 如有数据库变更
docker exec internal-chat-server npx prisma db push
```

## 安全建议

1. **修改默认密码**: 登录后立即修改管理员密码
2. **定期备份**: 定期备份数据库和上传文件
3. **网络隔离**: 如果可能，将服务部署在内网专用网段
4. **日志监控**: 定期检查服务日志，发现异常及时处理