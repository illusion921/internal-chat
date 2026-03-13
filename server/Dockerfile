# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 PostgreSQL 客户端工具（用于健康检查等）
RUN apk add --no-cache postgresql-client

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:20-alpine

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    openssl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# 复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 创建数据目录
RUN mkdir -p /app/uploads

# 环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 初始化数据库并启动
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]