import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import multipart from '@fastify/multipart';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { prisma } from './models/index.js';
import { redis } from './services/redis.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/user/routes.js';
import { friendRoutes } from './modules/friend/routes.js';
import { groupRoutes } from './modules/group/routes.js';
import { messageRoutes } from './modules/message/routes.js';
import { fileRoutes } from './modules/file/routes.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocket } from './socket/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 Fastify 实例
const fastify = Fastify({
  logger: {
    level: config.logLevel,
  },
});

// 注册插件
await fastify.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});

// 注册 multipart 插件（支持文件上传）
await fastify.register(multipart, {
  limits: {
    fileSize: 524288000, // 500MB
    fields: 10,
    files: 5,
  },
});

// 静态文件服务（上传的文件）
await fastify.register(staticPlugin, {
  root: config.fileStoragePath,
  prefix: '/uploads/',
});

// 健康检查
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// 注册路由
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(userRoutes, { prefix: '/api/users' });
await fastify.register(friendRoutes, { prefix: '/api/friends' });
await fastify.register(groupRoutes, { prefix: '/api/groups' });
await fastify.register(messageRoutes, { prefix: '/api/conversations' });
await fastify.register(fileRoutes, { prefix: '/api/files' });

// 错误处理
fastify.setErrorHandler(errorHandler);

// 启动服务器
const start = async () => {
  try {
    // 测试数据库连接
    await prisma.$connect();
    fastify.log.info('Database connected');

    // 测试 Redis 连接
    await redis.ping();
    fastify.log.info('Redis connected');

    // 启动 HTTP 服务器
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`Server running on http://${config.host}:${config.port}`);

    // 启动 Socket.IO
    const httpServer = fastify.server as HttpServer;
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
    });
    setupSocket(io);
    fastify.log.info('Socket.IO server started');

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  await fastify.close();
  process.exit(0);
});

start();

export { fastify };