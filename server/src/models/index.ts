import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

// 防止热重载时创建多个 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (config.isDev) globalForPrisma.prisma = prisma;