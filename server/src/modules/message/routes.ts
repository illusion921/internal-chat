import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';
import { redisService } from '../../services/redis.js';
import { getSocketIO } from '../../socket/index.js';

const getMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const searchSchema = z.object({
  keyword: z.string().min(1).max(50),
  conversationId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// 生成会话ID
function generateConversationId(type: string, id1: string, id2: string): string {
  if (type === 'private') {
    const sorted = [id1, id2].sort();
    return `private_${sorted[0]}_${sorted[1]}`;
  }
  return `group_${id1}`;
}

export async function messageRoutes(fastify: FastifyInstance) {
  // 获取会话列表
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

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

    const groups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    const conversationMap = new Map<string, any>();
    
    friends.forEach((f) => {
      const friend = f.userId === userId ? f.friend : f.user;
      const conversationId = generateConversationId('private', userId, friend.id);
      
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

  // 搜索消息 - 必须在 /:id/messages 之前注册
  fastify.get('/search', { preHandler: authMiddleware }, async (request, reply) => {
    const query = searchSchema.parse(request.query);
    const { keyword, conversationId, page, pageSize } = query;
    const userId = request.user!.userId;

    // 构建查询条件
    const where: any = {
      content: {
        contains: keyword,
        mode: 'insensitive',
      },
      recalledAt: null, // 排除已撤回的消息
    };

    // 如果指定了会话ID，验证权限
    if (conversationId) {
      const [type, ...rest] = conversationId.split('_');
      
      if (type === 'private') {
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
          throw new AppError('无权搜索此会话', 30002, 403);
        }
      } else if (type === 'group') {
        const groupId = rest.join('_');
        const membership = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });

        if (!membership) {
          throw new AppError('无权搜索此会话', 30002, 403);
        }
      }

      where.conversationId = conversationId;
    } else {
      // 搜索所有会话，需要获取用户参与的所有会话ID
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId, status: 'accepted' },
            { friendId: userId, status: 'accepted' },
          ],
        },
        select: { userId: true, friendId: true },
      });

      const groupMemberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });

      const conversationIds = [
        ...friendships.map((f) => {
          const friendId = f.userId === userId ? f.friendId : f.userId;
          return generateConversationId('private', userId, friendId);
        }),
        ...groupMemberships.map((g) => `group_${g.groupId}`),
      ];

      where.conversationId = { in: conversationIds };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.message.count({ where });

    return reply.send({
      code: 0,
      data: {
        list: messages,
        total,
        page,
        pageSize,
        keyword,
      },
    });
  });

  // 获取历史消息
  fastify.get('/:id/messages', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = getMessagesSchema.parse(request.query);
    const { page, pageSize } = query;
    const userId = request.user!.userId;

    const [type, ...rest] = id.split('_');
    
    if (type === 'private') {
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
      const groupId = rest.join('_');
      
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: groupId, userId } },
      });

      if (!membership) {
        throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 403);
      }
    }

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

  // 撤回消息
  fastify.post('/messages/:id/recall', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new AppError('消息不存在', 40401, 404);
    }

    // 只能撤回自己发送的消息
    if (message.senderId !== userId) {
      throw new AppError('只能撤回自己发送的消息', 30002, 403);
    }

    // 检查是否已撤回
    if (message.recalledAt) {
      throw new AppError('消息已撤回', 40001, 400);
    }

    // 检查是否超过2分钟
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (message.createdAt < twoMinutesAgo) {
      throw new AppError('消息发送超过2分钟，无法撤回', 40002, 400);
    }

    // 更新消息为已撤回
    const updated = await prisma.message.update({
      where: { id },
      data: { recalledAt: new Date() },
    });

    // 通过 WebSocket 通知相关用户
    const io = getSocketIO();
    
    if (message.conversationType === 'private') {
      const parts = message.conversationId.split('_');
      const targetUserId = parts[1] === userId ? parts[2] : parts[1];
      io.to(`user:${targetUserId}`).emit('message:recall', {
        messageId: id,
        conversationId: message.conversationId,
        recalledAt: updated.recalledAt,
      });
    } else if (message.conversationType === 'group') {
      const groupId = message.conversationId.replace('group_', '');
      io.to(`group:${groupId}`).emit('message:recall', {
        messageId: id,
        conversationId: message.conversationId,
        recalledAt: updated.recalledAt,
      });
    }

    return reply.send({
      code: 0,
      message: '消息已撤回',
    });
  });

  // 搜索消息
  fastify.get('/search', { preHandler: authMiddleware }, async (request, reply) => {
    const query = searchSchema.parse(request.query);
    const { keyword, conversationId, page, pageSize } = query;
    const userId = request.user!.userId;

    // 构建查询条件
    const where: any = {
      content: {
        contains: keyword,
        mode: 'insensitive',
      },
      recalledAt: null, // 排除已撤回的消息
    };

    // 如果指定了会话ID，验证权限
    if (conversationId) {
      const [type, ...rest] = conversationId.split('_');
      
      if (type === 'private') {
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
          throw new AppError('无权搜索此会话', 30002, 403);
        }
      } else if (type === 'group') {
        const groupId = rest.join('_');
        const membership = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });

        if (!membership) {
          throw new AppError('无权搜索此会话', 30002, 403);
        }
      }

      where.conversationId = conversationId;
    } else {
      // 搜索所有会话，需要获取用户参与的所有会话ID
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId, status: 'accepted' },
            { friendId: userId, status: 'accepted' },
          ],
        },
        select: { userId: true, friendId: true },
      });

      const groupMemberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });

      const conversationIds = [
        ...friendships.map((f) => {
          const friendId = f.userId === userId ? f.friendId : f.userId;
          return generateConversationId('private', userId, friendId);
        }),
        ...groupMemberships.map((g) => `group_${g.groupId}`),
      ];

      where.conversationId = { in: conversationIds };
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.message.count({ where });

    return reply.send({
      code: 0,
      data: {
        list: messages,
        total,
        page,
        pageSize,
        keyword,
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