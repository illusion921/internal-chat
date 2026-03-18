import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';

const addFriendSchema = z.object({
  friendId: z.string().uuid(),
  message: z.string().max(100).optional(),
});

const handleRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

const setRemarkSchema = z.object({
  remark: z.string().max(50),
});

export async function friendRoutes(fastify: FastifyInstance) {
  // 获取好友列表
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const friendships = await prisma.friendship.findMany({
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

    // 整理好友数据 - 使用 Map 去重
    const friendMap = new Map<string, any>();
    
    friendships.forEach((f) => {
      const isRequester = f.userId === userId;
      const friend = isRequester ? f.friend : f.user;
      
      // 按 friendId 去重
      if (!friendMap.has(friend.id)) {
        friendMap.set(friend.id, {
          id: f.id,
          friendId: friend.id,
          nickname: friend.nickname,
          avatar: friend.avatar,
          signature: friend.signature,
          status: friend.status,
          remark: isRequester ? f.remark : null,
        });
      }
    });

    const friends = Array.from(friendMap.values());

    return reply.send({
      code: 0,
      data: friends,
    });
  });

  // 发送好友申请
  fastify.post('/request', { preHandler: authMiddleware }, async (request, reply) => {
    const body = addFriendSchema.parse(request.body);
    const { friendId, message } = body;
    const userId = request.user!.userId;

    // 不能添加自己
    if (userId === friendId) {
      throw new AppError(ErrorCodes.CANNOT_ADD_SELF.message, ErrorCodes.CANNOT_ADD_SELF.code, 400);
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId },
    });

    if (!targetUser) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND.message, ErrorCodes.USER_NOT_FOUND.code, 404);
    }

    // 检查是否已有好友关系或申请
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new AppError('已经是好友了', 20002, 400);
      }
      if (existing.status === 'pending') {
        throw new AppError('已发送过申请，请等待对方处理', 20002, 400);
      }
    }

    // 创建申请
    await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'pending',
        remark: message,
      },
    });

    // TODO: 通过 Socket 通知对方

    return reply.send({
      code: 0,
      message: '好友申请已发送',
    });
  });

  // 获取收到的好友申请列表
  fastify.get('/requests', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const requests = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'pending',
      },
      include: {
        user: {
          select: { id: true, username: true, nickname: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      code: 0,
      data: requests.map((r) => ({
        id: r.id,
        from: r.user,
        message: r.remark,
        createdAt: r.createdAt,
      })),
    });
  });

  // 处理好友申请
  fastify.put('/request/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = handleRequestSchema.parse(request.body);
    const { action } = body;
    const userId = request.user!.userId;

    // 查找申请
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        friendId: userId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new AppError(ErrorCodes.FRIEND_REQUEST_NOT_FOUND.message, ErrorCodes.FRIEND_REQUEST_NOT_FOUND.code, 404);
    }

    // 更新状态
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    await prisma.friendship.update({
      where: { id },
      data: { status: newStatus },
    });

    // TODO: 通过 Socket 通知申请者

    return reply.send({
      code: 0,
      message: action === 'accept' ? '已添加好友' : '已拒绝申请',
    });
  });

  // 删除好友
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    // 查找好友关系
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

    // 确定好友ID
    const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;

    // 删除双向好友关系
    await prisma.friendship.deleteMany({
      where: {
        status: 'accepted',
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return reply.send({
      code: 0,
      message: '已删除好友',
    });
  });

  // 设置好友备注
  fastify.put('/:id/remark', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = setRemarkSchema.parse(request.body);
    const { remark } = body;
    const userId = request.user!.userId;

    // 查找好友关系
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

    // 更新备注
    await prisma.friendship.update({
      where: { id },
      data: { remark },
    });

    return reply.send({
      code: 0,
      message: '备注已更新',
    });
  });
}