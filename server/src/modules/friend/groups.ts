import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const createGroupSchema = z.object({
  name: z.string().min(1).max(20),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(20),
});

const moveFriendSchema = z.object({
  groupId: z.string().uuid().nullable(),
});

export async function friendGroupRoutes(fastify: FastifyInstance) {
  // 获取分组列表
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const groups = await prisma.friendGroup.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
      include: {
        friendships: {
          where: { status: 'accepted' },
          include: {
            friend: {
              select: { id: true, nickname: true, avatar: true, signature: true, status: true },
            },
          },
        },
      },
    });

    // 获取未分组的好友
    const ungroupedFriends = await prisma.friendship.findMany({
      where: {
        userId,
        status: 'accepted',
        groupId: null,
      },
      include: {
        friend: {
          select: { id: true, nickname: true, avatar: true, signature: true, status: true },
        },
      },
    });

    return reply.send({
      code: 0,
      data: {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          order: g.order,
          friends: g.friendships.map((f) => ({
            id: f.id,
            friendId: f.friend.id,
            nickname: f.friend.nickname,
            avatar: f.friend.avatar,
            signature: f.friend.signature,
            status: f.friend.status,
            remark: f.remark,
          })),
        })),
        ungrouped: ungroupedFriends.map((f) => ({
          id: f.id,
          friendId: f.friend.id,
          nickname: f.friend.nickname,
          avatar: f.friend.avatar,
          signature: f.friend.signature,
          status: f.friend.status,
          remark: f.remark,
        })),
      },
    });
  });

  // 创建分组
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    const body = createGroupSchema.parse(request.body);
    const { name } = body;
    const userId = request.user!.userId;

    // 获取当前最大顺序
    const maxOrder = await prisma.friendGroup.aggregate({
      where: { userId },
      _max: { order: true },
    });

    const group = await prisma.friendGroup.create({
      data: {
        userId,
        name,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return reply.send({
      code: 0,
      data: group,
      message: '分组创建成功',
    });
  });

  // 修改分组名
  fastify.put('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateGroupSchema.parse(request.body);
    const { name } = body;
    const userId = request.user!.userId;

    const group = await prisma.friendGroup.findUnique({
      where: { id },
    });

    if (!group || group.userId !== userId) {
      throw new AppError('分组不存在', 40401, 404);
    }

    const updated = await prisma.friendGroup.update({
      where: { id },
      data: { name },
    });

    return reply.send({
      code: 0,
      data: updated,
      message: '分组名已更新',
    });
  });

  // 删除分组
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const group = await prisma.friendGroup.findUnique({
      where: { id },
    });

    if (!group || group.userId !== userId) {
      throw new AppError('分组不存在', 40401, 404);
    }

    // 将分组内的好友移动到未分组
    await prisma.friendship.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });

    // 删除分组
    await prisma.friendGroup.delete({
      where: { id },
    });

    return reply.send({
      code: 0,
      message: '分组已删除',
    });
  });

  // 移动好友到分组
  fastify.put('/:id/move', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }; // friendship id
    const body = moveFriendSchema.parse(request.body);
    const { groupId } = body;
    const userId = request.user!.userId;

    // 验证好友关系
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        userId,
        status: 'accepted',
      },
    });

    if (!friendship) {
      throw new AppError('好友关系不存在', 20003, 404);
    }

    // 如果指定了分组，验证分组存在
    if (groupId) {
      const group = await prisma.friendGroup.findUnique({
        where: { id: groupId },
      });

      if (!group || group.userId !== userId) {
        throw new AppError('分组不存在', 40401, 404);
      }
    }

    // 更新分组
    await prisma.friendship.update({
      where: { id },
      data: { groupId },
    });

    return reply.send({
      code: 0,
      message: '已移动到指定分组',
    });
  });

  // 调整分组顺序
  fastify.put('/reorder', { preHandler: authMiddleware }, async (request, reply) => {
    const { orders } = request.body as { orders: { id: string; order: number }[] };
    const userId = request.user!.userId;

    for (const item of orders) {
      const group = await prisma.friendGroup.findUnique({
        where: { id: item.id },
      });

      if (group && group.userId === userId) {
        await prisma.friendGroup.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }
    }

    return reply.send({
      code: 0,
      message: '顺序已更新',
    });
  });
}