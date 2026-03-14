#!/bin/sh
set -e

echo "Starting Internal Chat Server..."

# 等待数据库就绪
echo "Waiting for database..."
until PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h postgres -U postgres -d internal_chat; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is up!"

# 运行数据库迁移
echo "Running database migrations..."
npx prisma migrate deploy

# 启动应用
echo "Starting application..."
exec node dist/app.js