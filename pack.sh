#!/bin/bash
# Internal Chat 离线部署包打包脚本
# 在有网络的机器上运行此脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Internal Chat 离线部署包打包工具${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装 Docker"
    exit 1
fi

# 项目目录
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${PROJECT_DIR}/offline-package"

echo -e "\n${YELLOW}[1/5] 清理旧的打包文件...${NC}"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo -e "\n${YELLOW}[2/5] 构建镜像...${NC}"
cd "$PROJECT_DIR"
docker compose build

echo -e "\n${YELLOW}[3/5] 导出 Docker 镜像...${NC}"
echo "正在导出镜像（可能需要几分钟）..."
docker save -o "${OUTPUT_DIR}/images.tar" \
    internal-chat-server:latest \
    internal-chat-web:latest \
    postgres:16-alpine \
    redis:7-alpine

echo -e "\n${YELLOW}[4/5] 复制配置文件...${NC}"
cp docker-compose.yml "${OUTPUT_DIR}/"
cp deploy.sh "${OUTPUT_DIR}/"
cp DEPLOY.md "${OUTPUT_DIR}/"

# 创建环境变量模板
cat > "${OUTPUT_DIR}/.env.example" << 'EOF'
# 数据库密码（请修改）
POSTGRES_PASSWORD=change_this_password

# JWT 密钥（请修改）
JWT_SECRET=change_this_secret

# 服务器 IP（部署时填写）
SERVER_IP=192.168.1.100
EOF

# 创建离线部署脚本
cat > "${OUTPUT_DIR}/install.sh" << 'INSTALL_EOF'
#!/bin/bash
# Internal Chat 离线安装脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ADMIN_USER="admin"
ADMIN_PASS="admin123"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Internal Chat 离线安装${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户执行此脚本${NC}"
    exit 1
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker 未安装，请先安装 Docker${NC}"
    echo "安装命令: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 获取服务器 IP
read -p "请输入服务器 IP 地址: " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}服务器 IP 不能为空${NC}"
    exit 1
fi

# 获取数据库密码
read -p "请输入数据库密码 (直接回车使用随机密码): " POSTGRES_PASS
if [ -z "$POSTGRES_PASS" ]; then
    POSTGRES_PASS=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
fi

# 获取 JWT 密钥
read -p "请输入 JWT 密钥 (直接回车使用随机密钥): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
fi

echo -e "\n${YELLOW}[1/4] 加载 Docker 镜像...${NC}"
docker load -i images.tar

echo -e "\n${YELLOW}[2/4] 创建配置文件...${NC}"
cat > .env << EOF
POSTGRES_PASSWORD=${POSTGRES_PASS}
JWT_SECRET=${JWT_SECRET}
SERVER_IP=${SERVER_IP}
EOF

echo -e "\n${YELLOW}[3/4] 启动服务...${NC}"
docker compose up -d

echo -e "${YELLOW}等待服务启动...${NC}"
sleep 15

# 检查服务状态
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}服务启动成功${NC}"
else
    echo -e "${RED}服务启动失败${NC}"
    docker compose logs
    exit 1
fi

echo -e "\n${YELLOW}[4/4] 创建管理员账号...${NC}"
sleep 5

# 生成密码哈希
PASSWORD_HASH=$(docker exec internal-chat-server node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASS}', 10));" 2>/dev/null)

# 创建管理员
docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "
    INSERT INTO users (id, username, password_hash, nickname, status, created_at, updated_at) 
    VALUES (gen_random_uuid(), '${ADMIN_USER}', '${PASSWORD_HASH}', '管理员', 'online', NOW(), NOW())
    ON CONFLICT (username) DO NOTHING;
" 2>/dev/null || echo "用户可能已存在"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址: ${GREEN}http://${SERVER_IP}${NC}"
echo -e "管理员账号: ${GREEN}${ADMIN_USER}${NC}"
echo -e "管理员密码: ${GREEN}${ADMIN_PASS}${NC}"
echo ""
echo -e "${YELLOW}数据库密码: ${POSTGRES_PASS}${NC}"
echo -e "${YELLOW}JWT 密钥: ${JWT_SECRET}${NC}"
echo ""
echo "常用命令:"
echo "  查看状态: docker compose ps"
echo "  查看日志: docker compose logs -f"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
INSTALL_EOF

chmod +x "${OUTPUT_DIR}/install.sh"

echo -e "\n${YELLOW}[5/5] 打包完成...${NC}"

# 计算文件大小
IMAGES_SIZE=$(du -h "${OUTPUT_DIR}/images.tar" | cut -f1)
TOTAL_SIZE=$(du -sh "${OUTPUT_DIR}" | cut -f1)

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  打包完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "输出目录: ${GREEN}${OUTPUT_DIR}${NC}"
echo ""
echo "包含文件:"
echo "  - images.tar       (${IMAGES_SIZE}) Docker 镜像"
echo "  - docker-compose.yml    Docker 编排文件"
echo "  - install.sh            安装脚本"
echo "  - .env.example          环境变量模板"
echo "  - DEPLOY.md             部署文档"
echo ""
echo -e "总大小: ${GREEN}${TOTAL_SIZE}${NC}"
echo ""
echo -e "${YELLOW}部署方法:${NC}"
echo "1. 将 ${OUTPUT_DIR} 目录复制到内网服务器"
echo "2. 执行: cd offline-package && ./install.sh"
echo ""