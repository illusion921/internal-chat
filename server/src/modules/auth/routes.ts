import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { config } from '../../config/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';
import { redisService } from '../../services/redis.js';

// 验证 schema
const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6).max(50),
});

// 登录失败计数器（内存存储，生产环境应使用 Redis）
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

// 最大并发会话数
const MAX_SESSIONS = 5;

// 是否允许多 IP 登录（false = 只允许同一 IP 的多设备登录）
const ALLOW_MULTI_IP = false;

// 生成 token 哈希
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// 解析 User-Agent
function parseUserAgent(userAgent: string): string {
  if (!userAgent) return '未知设备';
  
  // 简单解析
  if (userAgent.includes('Electron')) {
    const match = userAgent.match(/Electron\/([\d.]+)/);
    return `桌面客户端 ${match ? match[1] : ''}`.trim();
  }
  if (userAgent.includes('Chrome')) {
    return 'Chrome 浏览器';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox 浏览器';
  }
  if (userAgent.includes('Safari')) {
    return 'Safari 浏览器';
  }
  if (userAgent.includes('Edge')) {
    return 'Edge 浏览器';
  }
  
  return 'Web 浏览器';
}

export async function authRoutes(fastify: FastifyInstance) {
  // 登录
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { username, password } = body;

    // 检查账号锁定
    const attempt = loginAttempts.get(username);
    if (attempt && attempt.lockUntil > Date.now()) {
      const waitSeconds = Math.ceil((attempt.lockUntil - Date.now()) / 1000);
      throw new AppError(`账号已锁定，请 ${waitSeconds} 秒后再试`, 10002, 429);
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // 记录失败次数
      const current = loginAttempts.get(username) || { count: 0, lockUntil: 0 };
      current.count += 1;
      
      if (current.count >= 5) {
        current.lockUntil = Date.now() + 15 * 60 * 1000; // 锁定15分钟
        current.count = 0;
      }
      
      loginAttempts.set(username, current);
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS.message, ErrorCodes.INVALID_CREDENTIALS.code, 401);
    }

    // 登录成功，清除失败记录
    loginAttempts.delete(username);

    // 获取设备和IP信息
    const userAgent = request.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);
    const ipAddress = request.ip || 'unknown';

    // 检查是否允许多IP登录
    if (!ALLOW_MULTI_IP) {
      // 获取现有会话，踢出不同IP的设备
      const existingSessions = await redisService.getUserSessions(user.id);
      for (const session of existingSessions) {
        if (session.ipAddress !== ipAddress) {
          await redisService.deleteSession(session.sessionId);
        }
      }
    }

    // 生成 token
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username, type: 'refresh' },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );

    // 创建会话
    const tokenHash = hashToken(accessToken);
    await redisService.createSession(
      user.id, 
      tokenHash, 
      deviceInfo, 
      ipAddress,
      MAX_SESSIONS
    );

    // 更新最后在线时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    return reply.send({
      code: 0,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          signature: user.signature,
        },
      },
    });
  });

  // 刷新 token
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };

    if (!refreshToken) {
      throw new AppError('Refresh token 缺失', 10003, 401);
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; username: string };
      
      if ((decoded as any).type !== 'refresh') {
        throw new AppError('无效的 refresh token', 10003, 401);
      }

      const accessToken = jwt.sign(
        { userId: decoded.userId, username: decoded.username },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // 为新 token 创建会话
      const userAgent = request.headers['user-agent'] || '';
      const deviceInfo = parseUserAgent(userAgent);
      const ipAddress = request.ip || 'unknown';
      const tokenHash = hashToken(accessToken);
      
      await redisService.createSession(
        decoded.userId, 
        tokenHash, 
        deviceInfo, 
        ipAddress,
        MAX_SESSIONS
      );

      return reply.send({
        code: 0,
        data: { accessToken },
      });
    } catch {
      throw new AppError('Refresh token 无效或已过期', 10003, 401);
    }
  });

  // 修改密码
  fastify.post('/password', { preHandler: authMiddleware }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    const { oldPassword, newPassword } = body;
    const userId = request.user!.userId;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND.message, ErrorCodes.USER_NOT_FOUND.code, 404);
    }

    // 验证旧密码
    if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
      throw new AppError('原密码错误', 10001, 400);
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // 清除所有会话，强制重新登录
    await redisService.deleteAllUserSessions(userId);

    return reply.send({
      code: 0,
      message: '密码修改成功，请重新登录',
    });
  });

  // 登出
  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenHash = hashToken(token);
      await redisService.deleteSessionByToken(tokenHash);
    }
    
    return reply.send({
      code: 0,
      message: '登出成功',
    });
  });

  // 获取登录设备列表
  fastify.get('/sessions', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    const sessions = await redisService.getUserSessions(userId);
    
    return reply.send({
      code: 0,
      data: sessions,
    });
  });

  // 踢出指定会话
  fastify.delete('/sessions/:sessionId', { preHandler: authMiddleware }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const userId = request.user!.userId;
    
    // 验证会话属于当前用户
    const session = await redisService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError('会话不存在', 40401, 404);
    }
    
    await redisService.deleteSession(sessionId);
    
    return reply.send({
      code: 0,
      message: '已踢出该设备',
    });
  });

  // 踢出所有其他会话
  fastify.post('/sessions/kick-others', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    const authHeader = request.headers.authorization;
    
    let currentSessionId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenHash = hashToken(token);
      const currentSession = await redisService.getSessionByToken(tokenHash);
      currentSessionId = currentSession?.sessionId || null;
    }
    
    const sessions = await redisService.getUserSessions(userId);
    
    for (const session of sessions) {
      if (session.sessionId !== currentSessionId) {
        await redisService.deleteSession(session.sessionId);
      }
    }
    
    return reply.send({
      code: 0,
      message: '已踢出所有其他设备',
    });
  });
}