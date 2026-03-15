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
if npx prisma migrate deploy; then
  echo "Migrations applied successfully"
else
  echo "Migration failed, trying db push..."
  npx prisma db push --accept-data-loss
fi

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
exec node dist/app.js