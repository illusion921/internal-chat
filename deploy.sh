#!/bin/bash
# Internal Chat 一键部署脚本
# 使用方法: ./deploy.sh [服务器IP]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 默认配置
SERVER_IP=${1:-""}
ADMIN_USER="admin"
ADMIN_PASS="admin123"
POSTGRES_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Internal Chat 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否有 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}建议使用 root 用户执行此脚本${NC}"
        echo "当前用户: $(whoami)"
        read -p "是否继续? (y/n): " choice
        if [ "$choice" != "y" ]; then
            exit 1
        fi
    fi
}

# 检查并安装 Docker
install_docker() {
    echo -e "\n${YELLOW}[1/6] 检查 Docker...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker 已安装: $(docker --version)${NC}"
    else
        echo -e "${YELLOW}正在安装 Docker...${NC}"
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        echo -e "${GREEN}Docker 安装完成${NC}"
    fi
    
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}Docker Compose 已安装: $(docker-compose --version)${NC}"
    elif docker compose version &> /dev/null; then
        echo -e "${GREEN}Docker Compose (插件) 已安装${NC}"
    else
        echo -e "${YELLOW}正在安装 Docker Compose...${NC}"
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}Docker Compose 安装完成${NC}"
    fi
}

# 获取服务器 IP
get_server_ip() {
    if [ -z "$SERVER_IP" ]; then
        echo -e "\n${YELLOW}[2/6] 获取服务器 IP...${NC}"
        # 尝试获取公网 IP
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
        
        read -p "检测到服务器 IP: $SERVER_IP，是否正确? (y/n): " choice
        if [ "$choice" != "y" ]; then
            read -p "请输入服务器 IP: " SERVER_IP
        fi
    fi
    echo -e "${GREEN}服务器 IP: $SERVER_IP${NC}"
}

# 克隆代码
clone_code() {
    echo -e "\n${YELLOW}[3/6] 获取代码...${NC}"
    
    if [ -d "internal-chat" ]; then
        echo -e "${YELLOW}目录已存在，更新代码...${NC}"
        cd internal-chat
        git pull
    else
        echo -e "${YELLOW}克隆代码仓库...${NC}"
        git clone https://github.com/illusion921/internal-chat.git
        cd internal-chat
    fi
    echo -e "${GREEN}代码准备完成${NC}"
}

# 生成配置文件
generate_config() {
    echo -e "\n${YELLOW}[4/6] 生成配置文件...${NC}"
    
    cat > .env << EOF
# 数据库密码
POSTGRES_PASSWORD=${POSTGRES_PASS}

# JWT 密钥
JWT_SECRET=${JWT_SECRET}

# 服务器 IP
SERVER_IP=${SERVER_IP}
EOF
    
    echo -e "${GREEN}配置文件已生成: .env${NC}"
    echo -e "  - 数据库密码: ${POSTGRES_PASS}"
    echo -e "  - JWT 密钥: ${JWT_SECRET}"
}

# 构建并启动服务
start_services() {
    echo -e "\n${YELLOW}[5/6] 构建并启动服务...${NC}"
    
    # 停止旧容器
    docker compose down 2>/dev/null || true
    
    # 构建并启动
    docker compose up -d --build
    
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10
    
    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}服务启动成功${NC}"
    else
        echo -e "${RED}服务启动失败，请检查日志:${NC}"
        docker compose logs
        exit 1
    fi
}

# 创建管理员账号
create_admin() {
    echo -e "\n${YELLOW}[6/6] 创建管理员账号...${NC}"
    
    # 等待数据库就绪
    sleep 5
    
    # 检查是否已存在管理员
    EXISTING=$(docker exec internal-chat-postgres psql -U postgres -d internal_chat -t -c "SELECT COUNT(*) FROM users WHERE username='$ADMIN_USER';" 2>/dev/null | tr -d ' ')
    
    if [ "$EXISTING" = "0" ]; then
        # 生成密码哈希
        PASSWORD_HASH=$(docker exec internal-chat-server node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASS', 10));" 2>/dev/null)
        
        # 创建管理员
        docker exec internal-chat-postgres psql -U postgres -d internal_chat -c "
            INSERT INTO users (id, username, password_hash, nickname, status, created_at, updated_at) 
            VALUES (gen_random_uuid(), '$ADMIN_USER', '$PASSWORD_HASH', '管理员', 'online', NOW(), NOW());
        " 2>/dev/null
        
        echo -e "${GREEN}管理员账号创建成功${NC}"
    else
        echo -e "${YELLOW}管理员账号已存在${NC}"
    fi
}

# 打印部署信息
print_info() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署完成!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址: ${GREEN}http://${SERVER_IP}${NC}"
    echo -e "管理员账号: ${GREEN}${ADMIN_USER}${NC}"
    echo -e "管理员密码: ${GREEN}${ADMIN_PASS}${NC}"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "  查看状态: docker compose ps"
    echo "  查看日志: docker compose logs -f"
    echo "  重启服务: docker compose restart"
    echo "  停止服务: docker compose down"
    echo ""
    echo -e "${YELLOW}配置文件: $(pwd)/.env${NC}"
    echo -e "${YELLOW}请妥善保管数据库密码和 JWT 密钥!${NC}"
    echo ""
}

# 主流程
main() {
    check_root
    install_docker
    get_server_ip
    clone_code
    generate_config
    start_services
    create_admin
    print_info
}

main