import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { StringValue } from 'ms';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  // 服务器
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/internal_chat',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as StringValue,
  jwtRefreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as StringValue,

  // 文件存储
  fileStoragePath: path.resolve(process.env.FILE_STORAGE_PATH || './uploads'),
  fileMaxSize: parseInt(process.env.FILE_MAX_SIZE || '524288000', 10), // 500MB
  fileExpireDays: parseInt(process.env.FILE_EXPIRE_DAYS || '7', 10),

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://192.168.1.39:5173',
    'http://192.168.1.39:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ],

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',
};