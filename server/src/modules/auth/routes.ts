import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { config } from '../../config/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';

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

    return reply.send({
      code: 0,
      message: '密码修改成功',
    });
  });

  // 登出
  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    // JWT 无状态，客户端删除 token 即可
    // 如需服务端失效，可维护 token 黑名单（Redis）
    return reply.send({
      code: 0,
      message: '登出成功',
    });
  });
}