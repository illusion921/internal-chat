import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

// 检查是否是管理员
async function checkAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  
  // 简单判断：username 为 admin 的用户是管理员
  // 生产环境应该有独立的角色系统
  if (user?.username !== 'admin') {
    throw new AppError('需要管理员权限', 40301, 403);
  }
  
  return true;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // 获取系统统计
  fastify.get('/stats', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    await checkAdmin(userId);

    const [userCount, groupCount, messageCount, fileCount, onlineCount] = await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.message.count(),
      prisma.file.count(),
      prisma.user.count({ where: { status: 'online' } }),
    ]);

    return reply.send({
      code: 0,
      data: {
        userCount,
        groupCount,
        messageCount,
        fileCount,
        onlineCount,
      },
    });
  });

  // 创建用户
  fastify.post('/users', { preHandler: authMiddleware }, async (request, reply) => {
    const adminId = request.user!.userId;
    await checkAdmin(adminId);

    const body = z.object({
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
      password: z.string().min(6).max(50),
      nickname: z.string().min(1).max(50).optional(),
    }).parse(request.body);

    // 检查用户名是否已存在
    const existing = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (existing) {
      throw new AppError('用户名已存在', 40001, 400);
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(body.password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash,
        nickname: body.nickname || body.username,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        createdAt: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
      message: '创建成功',
    });
  });

  // 获取用户列表
  fastify.get('/users', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    await checkAdmin(userId);

    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      keyword: z.string().optional(),
    }).parse(request.query);

    const { page, pageSize, keyword } = query;

    const where = keyword ? {
      OR: [
        { username: { contains: keyword } },
        { nickname: { contains: keyword } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          status: true,
          createdAt: true,
          lastSeenAt: true,
          _count: {
            select: {
              sentMessages: true,
              groupMemberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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

  // 更新用户
  fastify.put('/users/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const adminId = request.user!.userId;
    await checkAdmin(adminId);

    const { id } = request.params as { id: string };
    const body = z.object({
      nickname: z.string().min(1).max(50).optional(),
      status: z.enum(['online', 'offline']).optional(),
    }).parse(request.body);

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        username: true,
        nickname: true,
        status: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
      message: '更新成功',
    });
  });

  // 删除用户
  fastify.delete('/users/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const adminId = request.user!.userId;
    await checkAdmin(adminId);

    const { id } = request.params as { id: string };

    // 不能删除自己
    if (id === adminId) {
      throw new AppError('不能删除自己', 40001, 400);
    }

    await prisma.user.delete({
      where: { id },
    });

    return reply.send({
      code: 0,
      message: '删除成功',
    });
  });

  // 获取群组列表
  fastify.get('/groups', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    await checkAdmin(userId);

    const query = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      keyword: z.string().optional(),
    }).parse(request.query);

    const { page, pageSize, keyword } = query;

    const where = keyword ? {
      name: { contains: keyword },
    } : {};

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          announcement: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              nickname: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.group.count({ where }),
    ]);

    return reply.send({
      code: 0,
      data: {
        list: groups,
        total,
        page,
        pageSize,
      },
    });
  });

  // 删除群组
  fastify.delete('/groups/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    await checkAdmin(userId);

    const { id } = request.params as { id: string };

    await prisma.group.delete({
      where: { id },
    });

    return reply.send({
      code: 0,
      message: '删除成功',
    });
  });

  // 获取群组成员
  fastify.get('/groups/:id/members', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    await checkAdmin(userId);

    const { id } = request.params as { id: string };

    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      select: {
        role: true,
        nickname: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return reply.send({
      code: 0,
      data: members,
    });
  });

  // 移除群成员
  fastify.delete('/groups/:groupId/members/:userId', { preHandler: authMiddleware }, async (request, reply) => {
    const adminId = request.user!.userId;
    await checkAdmin(adminId);

    const { groupId, userId } = request.params as { groupId: string; userId: string };

    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    return reply.send({
      code: 0,
      message: '移除成功',
    });
  });
}