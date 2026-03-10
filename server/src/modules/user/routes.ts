import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';

const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  signature: z.string().max(100).optional(),
});

const searchSchema = z.object({
  keyword: z.string().min(1).max(50),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function userRoutes(fastify: FastifyInstance) {
  // 搜索用户
  fastify.get('/search', { preHandler: authMiddleware }, async (request, reply) => {
    const query = searchSchema.parse(request.query);
    const { keyword, page, pageSize } = query;
    const userId = request.user!.userId;

    const where = {
      OR: [
        { username: { contains: keyword } },
        { nickname: { contains: keyword } },
      ],
      NOT: { id: userId }, // 排除自己
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          signature: true,
          status: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      code: 0,
      data: {
        list: users,
        total,
        page,
        pageSize,
      },
    });
  });

  // 获取用户信息
  fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND.message, ErrorCodes.USER_NOT_FOUND.code, 404);
    }

    return reply.send({
      code: 0,
      data: user,
    });
  });

  // 更新个人信息
  fastify.put('/profile', { preHandler: authMiddleware }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const userId = request.user!.userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
      message: '更新成功',
    });
  });

  // 上传头像
  fastify.post('/avatar', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    const data = await request.file();

    if (!data) {
      throw new AppError('请选择头像文件', 40001, 400);
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(data.mimetype || '')) {
      throw new AppError('只支持 jpg、png、gif 格式', 40001, 400);
    }

    // 检查文件大小 (2MB)
    const buffer = await data.toBuffer();
    if (buffer.length > 2 * 1024 * 1024) {
      throw new AppError('头像大小不能超过 2MB', 40001, 400);
    }

    // TODO: 保存文件到本地，返回 URL
    // 这里简化处理，实际应该保存到文件系统
    const avatarUrl = `/uploads/avatars/${userId}_${Date.now()}.jpg`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return reply.send({
      code: 0,
      data: { avatar: avatarUrl },
      message: '头像上传成功',
    });
  });

  // 获取当前用户信息
  fastify.get('/me/profile', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
    });
  });
}