import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';
import { redisService } from '../../services/redis.js';

const getMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

// 生成会话ID
function generateConversationId(type: string, id1: string, id2: string): string {
  if (type === 'private') {
    // 私聊：两个用户ID排序后拼接
    const sorted = [id1, id2].sort();
    return `private_${sorted[0]}_${sorted[1]}`;
  }
  // 群聊：群组ID
  return `group_${id1}`;
}

export async function messageRoutes(fastify: FastifyInstance) {
  // 获取会话列表
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    // 获取私聊会话（从好友关系中）
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, status: true },
        },
        friend: {
          select: { id: true, nickname: true, avatar: true, status: true },
        },
      },
    });

    // 获取群聊会话
    const groups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // 整理会话列表 - 使用 Map 去重
    const conversationMap = new Map<string, any>();
    
    friends.forEach((f) => {
      const friend = f.userId === userId ? f.friend : f.user;
      const conversationId = generateConversationId('private', userId, friend.id);
      
      // 避免重复添加
      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          id: conversationId,
          type: 'private',
          target: friend,
          remark: f.remark,
        });
      }
    });
    
    groups.forEach((g) => {
      const conversationId = generateConversationId('group', g.group.id, '');
      conversationMap.set(conversationId, {
        id: conversationId,
        type: 'group',
        target: g.group,
      });
    });

    const conversations = Array.from(conversationMap.values());

    return reply.send({
      code: 0,
      data: conversations,
    });
  });

  // 获取历史消息
  fastify.get('/:id/messages', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = getMessagesSchema.parse(request.query);
    const { page, pageSize } = query;
    const userId = request.user!.userId;

    // 解析会话类型
    const [type, ...rest] = id.split('_');
    
    if (type === 'private') {
      // 私聊：检查是否是好友
      const [, targetId1, targetId2] = rest;
      const friendId = targetId1 === userId ? targetId2 : targetId1;
      
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
          status: 'accepted',
        },
      });

      if (!friendship) {
        throw new AppError('无权访问此会话', 30002, 403);
      }
    } else if (type === 'group') {
      // 群聊：检查是否是群成员
      const groupId = rest.join('_');
      
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId, userId } },
      });

      if (!membership) {
        throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 403);
      }
    }

    // 获取消息
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      include: {
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
        file: {
          select: { id: true, filename: true, filesize: true, mimeType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 获取未读数
    const unreadCount = await redisService.getUnread(userId, id);

    return reply.send({
      code: 0,
      data: {
        list: messages.reverse(),
        page,
        pageSize,
        unreadCount,
      },
    });
  });

  // 标记已读
  fastify.post('/:id/read', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await redisService.clearUnread(userId, id);

    return reply.send({
      code: 0,
      message: '已标记为已读',
    });
  });

  // 获取未读消息数
  fastify.get('/:id/unread-count', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const count = await redisService.getUnread(userId, id);

    return reply.send({
      code: 0,
      data: { count },
    });
  });
}