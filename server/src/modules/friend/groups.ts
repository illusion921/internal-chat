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

    // 获取所有好友分组
    const groups = await prisma.friendGroup.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    // 获取所有好友关系（双向）
    const allFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, signature: true, status: true },
        },
        friend: {
          select: { id: true, nickname: true, avatar: true, signature: true, status: true },
        },
      },
    });

    // 使用 Map 按好友 ID 去重，优先使用有 groupId 的记录
    const friendMap = new Map<string, any>();

    allFriendships.forEach((f) => {
      // 确定好友信息
      const isUserOwner = f.userId === userId;
      const friendInfo = isUserOwner ? f.friend : f.user;
      const friendId = friendInfo.id;
      const groupId = isUserOwner ? f.groupId : null;

      // 如果好友已经在 Map 中，优先保留有 groupId 的记录
      if (friendMap.has(friendId)) {
        const existing = friendMap.get(friendId);
        // 如果新记录有分组且旧记录没有分组，则更新
        if (groupId && !existing.groupId) {
          friendMap.set(friendId, {
            id: f.id,
            friendId,
            groupId,
            nickname: friendInfo.nickname,
            avatar: friendInfo.avatar,
            signature: friendInfo.signature,
            status: friendInfo.status,
            remark: f.remark,
          });
        }
      } else {
        friendMap.set(friendId, {
          id: f.id,
          friendId,
          groupId,
          nickname: friendInfo.nickname,
          avatar: friendInfo.avatar,
          signature: friendInfo.signature,
          status: friendInfo.status,
          remark: f.remark,
        });
      }
    });

    // 按分组归类好友
    const groupedFriends = new Map<string, any[]>();
    const ungroupedFriends: any[] = [];

    friendMap.forEach((friend) => {
      const { groupId, ...friendData } = friend;
      
      if (groupId) {
        if (!groupedFriends.has(groupId)) {
          groupedFriends.set(groupId, []);
        }
        groupedFriends.get(groupId)!.push(friendData);
      } else {
        ungroupedFriends.push(friendData);
      }
    });

    return reply.send({
      code: 0,
      data: {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          order: g.order,
          friends: groupedFriends.get(g.id) || [],
        })),
        ungrouped: ungroupedFriends,
      },
    });
  });

  // 创建分组
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    const body = createGroupSchema.parse(request.body);
    const { name } = body;
    const userId = request.user!.userId;

    // 检查是否已存在同名分组
    const existing = await prisma.friendGroup.findFirst({
      where: { userId, name },
    });

    if (existing) {
      return reply.send({
        code: 40001,
        message: '分组名称已存在',
      });
    }

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

    // 验证好友关系（双向检查）
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        status: 'accepted',
        OR: [
          { userId },
          { friendId: userId },
        ],
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

    // 确定好友ID
    const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;

    // 检查当前用户是否有对应的 friendship 记录
    const myFriendship = await prisma.friendship.findFirst({
      where: {
        userId,
        friendId,
        status: 'accepted',
      },
    });

    if (myFriendship) {
      // 更新现有记录
      await prisma.friendship.update({
        where: { id: myFriendship.id },
        data: { groupId },
      });
    } else {
      // 创建一条新的记录用于分组管理
      await prisma.friendship.create({
        data: {
          userId,
          friendId,
          status: 'accepted',
          groupId,
        },
      });
    }

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