import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../models/index.js';
import { config } from '../config/index.js';
import { redisService } from '../services/redis.js';

interface UserSocket {
  userId: string;
  socketId: string;
}

// 存储用户连接
const userSockets = new Map<string, Set<string>>();

export function setupSocket(io: SocketIOServer) {
  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; username: string };
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected via socket ${socket.id}`);

    // 存储连接
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // 设置用户在线
    await redisService.setUserOnline(userId, socket.id);

    // 更新数据库状态
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'online', lastSeenAt: new Date() },
    });

    // 推送离线消息
    const offlineMessages = await redisService.getAndClearOfflineMessages(userId);
    for (const message of offlineMessages) {
      socket.emit('message:offline', message);
    }

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    // 处理消息发送
    socket.on('message:send', async (data) => {
      try {
        await handleMessageSend(io, socket, data);
      } catch (error) {
        console.error('Error handling message:send', error);
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 处理输入状态
    socket.on('typing:start', (data) => {
      const { conversationId, conversationType } = data;
      
      if (conversationType === 'private') {
        // 私聊：通知对方
        const parts = conversationId.split('_');
        const targetUserId = parts[1] === userId ? parts[2] : parts[1];
        socket.to(`user:${targetUserId}`).emit('typing:start', {
          conversationId,
          userId,
        });
      } else if (conversationType === 'group') {
        // 群聊：通知群成员
        socket.to(conversationId).emit('typing:start', {
          conversationId,
          userId,
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { conversationId, conversationType } = data;
      
      if (conversationType === 'private') {
        const parts = conversationId.split('_');
        const targetUserId = parts[1] === userId ? parts[2] : parts[1];
        socket.to(`user:${targetUserId}`).emit('typing:stop', {
          conversationId,
          userId,
        });
      } else if (conversationType === 'group') {
        socket.to(conversationId).emit('typing:stop', {
          conversationId,
          userId,
        });
      }
    });

    // 处理已读回执
    socket.on('message:read', async (data) => {
      const { conversationId, lastMessageId } = data;
      await redisService.clearUnread(userId, conversationId);
      
      // 通知对方已读
      const parts = conversationId.split('_');
      if (parts[0] === 'private') {
        const targetUserId = parts[1] === userId ? parts[2] : parts[1];
        socket.to(`user:${targetUserId}`).emit('message:read', {
          conversationId,
          userId,
          lastMessageId,
        });
      }
    });

    // 加入群组房间
    socket.on('group:join', async (groupId: string) => {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      
      if (membership) {
        socket.join(`group:${groupId}`);
      }
    });

    // 离开群组房间
    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    // 断开连接
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected from socket ${socket.id}`);

      // 移除连接
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          
          // 设置用户离线
          await redisService.setUserOffline(userId);
          
          // 更新数据库状态
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'offline', lastSeenAt: new Date() },
          });
        }
      }
    });
  });
}

// 处理消息发送
async function handleMessageSend(io: SocketIOServer, socket: Socket, data: any) {
  const userId = socket.data.userId;
  const { conversationId, conversationType, msgType, content, fileId } = data;

  // 保存消息到数据库
  const message = await prisma.message.create({
    data: {
      conversationId,
      conversationType,
      senderId: userId,
      content,
      msgType,
      fileId,
    },
    include: {
      sender: {
        select: { id: true, nickname: true, avatar: true },
      },
      file: {
        select: { id: true, filename: true, filesize: true, mimeType: true },
      },
    },
  });

  // 发送成功回执
  socket.emit('message:sent', {
    tempId: data.tempId,
    messageId: message.id,
    createdAt: message.createdAt,
  });

  if (conversationType === 'private') {
    // 私聊：发送给对方
    const parts = conversationId.split('_');
    const targetUserId = parts[1] === userId ? parts[2] : parts[1];

    // 检查对方是否在线
    const isOnline = await redisService.isUserOnline(targetUserId);

    if (isOnline) {
      // 在线：直接推送
      io.to(`user:${targetUserId}`).emit('message:new', message);
    } else {
      // 离线：存储到离线消息队列
      await redisService.addOfflineMessage(targetUserId, message);
    }

    // 增加未读数
    await redisService.incrUnread(targetUserId, conversationId);

  } else if (conversationType === 'group') {
    // 群聊：发送给所有群成员
    const groupId = conversationId.replace('group_', '');

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    // 推送给所有在线成员
    for (const member of members) {
      if (member.userId !== userId) {
        io.to(`user:${member.userId}`).emit('message:new', message);
        await redisService.incrUnread(member.userId, conversationId);
      }
    }
  }
}