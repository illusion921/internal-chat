#!/bin/bash

# PostgreSQL 安装和配置脚本 (Ubuntu/Debian)

set -e

echo "=== 安装 PostgreSQL ==="

# 安装 PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
echo "=== 创建数据库和用户 ==="
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres' SUPERUSER;" 2>/dev/null || echo "用户已存在"
sudo -u postgres psql -c "CREATE DATABASE internal_chat OWNER postgres;" 2>/dev/null || echo "数据库已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE internal_chat TO postgres;"

# 启用 UUID 扩展
sudo -u postgres psql -d internal_chat -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo "=== PostgreSQL 配置完成 ==="
echo "数据库: internal_chat"
echo "用户: postgres"
echo "密码: postgres"
echo "连接字符串: postgresql://postgres:postgres@localhost:5432/internal_chat?schema=public"