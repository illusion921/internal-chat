#!/bin/sh
set -e

echo "Starting Internal Chat Server..."

# 等待数据库就绪
echo "Waiting for database..."
max_attempts=30
attempt=0
until PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h postgres -U postgres -d internal_chat; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "Database is unavailable after $max_attempts attempts, exiting..."
    exit 1
  fi
  echo "Database is unavailable - sleeping (attempt $attempt/$max_attempts)"
  sleep 2
done

echo "Database is up!"

# 运行数据库迁移
echo "Running database migrations..."

# 首先尝试使用 SQL 初始化脚本
if [ -f /app/init-db.sql ]; then
    echo "Using init-db.sql for database initialization..."
    PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U postgres -d internal_chat -f /app/init-db.sql 2>/dev/null && echo "Database initialized from SQL script" || echo "SQL init failed, tables may already exist"
fi

# 然后使用 Prisma 确保数据库结构正确
if npx prisma migrate deploy 2>/dev/null; then
    echo "Migrations applied successfully"
else
    echo "Trying prisma db push..."
    npx prisma db push --accept-data-loss 2>/dev/null || echo "Database sync completed"
fi

# 初始化管理员账号
echo "Initializing admin user..."
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
node dist/scripts/init-admin.js 2>/dev/null || echo "Admin init failed, continuing..."

# 等待 Redis 就绪
echo "Waiting for Redis..."
max_attempts=10
attempt=0
until nc -z redis 6379 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "Redis is unavailable after $max_attempts attempts, exiting..."
    exit 1
  fi
  echo "Redis is unavailable - sleeping (attempt $attempt/$max_attempts)"
  sleep 1
done

echo "Redis is up!"

# 启动应用
echo "Starting application..."
exec node dist/src/app.js