import { Redis } from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err);
});

// Redis Keys
export const RedisKeys = {
  // 用户在线状态
  userOnline: (userId: string) => `user:online:${userId}`,
  
  // 用户 Socket ID
  userSocket: (userId: string) => `user:socket:${userId}`,
  
  // 离线消息队列
  offlineMessages: (userId: string) => `offline:messages:${userId}`,
  
  // 会话未读数
  conversationUnread: (userId: string, conversationId: string) => 
    `unread:${userId}:${conversationId}`,
  
  // 好友申请未读数
  friendRequestUnread: (userId: string) => `friend:request:unread:${userId}`,
  
  // 用户会话列表 (存储所有活跃会话ID)
  userSessions: (userId: string) => `user:sessions:${userId}`,
  
  // 会话详情 (存储token和设备信息)
  sessionDetail: (sessionId: string) => `session:detail:${sessionId}`,
  
  // token 到 sessionId 的映射
  tokenSession: (tokenHash: string) => `token:session:${tokenHash}`,
};

// 会话信息
export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: number;
  lastActivityAt: number;
}

// Redis 操作封装
export const redisService = {
  // 设置用户在线
  async setUserOnline(userId: string, socketId: string) {
    const pipeline = redis.pipeline();
    pipeline.set(RedisKeys.userOnline(userId), '1', 'EX', 3600); // 1小时过期
    pipeline.set(RedisKeys.userSocket(userId), socketId, 'EX', 3600);
    await pipeline.exec();
  },

  // 设置用户离线
  async setUserOffline(userId: string) {
    await redis.del(RedisKeys.userOnline(userId), RedisKeys.userSocket(userId));
  },

  // 检查用户是否在线
  async isUserOnline(userId: string): Promise<boolean> {
    const result = await redis.exists(RedisKeys.userOnline(userId));
    return result === 1;
  },

  // 获取用户 Socket ID
  async getUserSocketId(userId: string): Promise<string | null> {
    return redis.get(RedisKeys.userSocket(userId));
  },

  // 添加离线消息
  async addOfflineMessage(userId: string, message: any) {
    await redis.rpush(RedisKeys.offlineMessages(userId), JSON.stringify(message));
  },

  // 获取并清除离线消息
  async getAndClearOfflineMessages(userId: string): Promise<any[]> {
    const messages = await redis.lrange(RedisKeys.offlineMessages(userId), 0, -1);
    await redis.del(RedisKeys.offlineMessages(userId));
    return messages.map((m: string) => JSON.parse(m));
  },

  // 增加未读数
  async incrUnread(userId: string, conversationId: string) {
    await redis.incr(RedisKeys.conversationUnread(userId, conversationId));
  },

  // 获取未读数
  async getUnread(userId: string, conversationId: string): Promise<number> {
    const count = await redis.get(RedisKeys.conversationUnread(userId, conversationId));
    return parseInt(count || '0', 10);
  },

  // 清除未读数
  async clearUnread(userId: string, conversationId: string) {
    await redis.del(RedisKeys.conversationUnread(userId, conversationId));
  },

  // ========== 会话管理 ==========

  // 创建会话
  async createSession(
    userId: string, 
    tokenHash: string, 
    deviceInfo: string,
    ipAddress: string,
    maxSessions: number = 5
  ): Promise<string> {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      createdAt: now,
      lastActivityAt: now,
    };

    const pipeline = redis.pipeline();
    
    // 存储会话详情，7天过期
    pipeline.set(RedisKeys.sessionDetail(sessionId), JSON.stringify(sessionInfo), 'EX', 7 * 24 * 3600);
    
    // token 到 sessionId 的映射
    pipeline.set(RedisKeys.tokenSession(tokenHash), sessionId, 'EX', 7 * 24 * 3600);
    
    // 添加到用户会话列表
    pipeline.sadd(RedisKeys.userSessions(userId), sessionId);
    pipeline.expire(RedisKeys.userSessions(userId), 7 * 24 * 3600);
    
    await pipeline.exec();
    
    // 检查会话数量，如果超过限制，删除最旧的
    await this.limitSessions(userId, maxSessions);
    
    return sessionId;
  },

  // 限制会话数量
  async limitSessions(userId: string, maxSessions: number) {
    const sessionIds = await redis.smembers(RedisKeys.userSessions(userId));
    
    if (sessionIds.length > maxSessions) {
      // 获取所有会话详情
      const sessions: { sessionId: string; createdAt: number }[] = [];
      
      for (const sid of sessionIds) {
        const detail = await redis.get(RedisKeys.sessionDetail(sid));
        if (detail) {
          const info = JSON.parse(detail) as SessionInfo;
          sessions.push({ sessionId: sid, createdAt: info.createdAt });
        }
      }
      
      // 按创建时间排序，删除最旧的
      sessions.sort((a, b) => a.createdAt - b.createdAt);
      
      const toRemove = sessions.slice(0, sessions.length - maxSessions);
      
      for (const s of toRemove) {
        await this.deleteSession(s.sessionId);
      }
    }
  },

  // 获取会话信息
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const detail = await redis.get(RedisKeys.sessionDetail(sessionId));
    return detail ? JSON.parse(detail) : null;
  },

  // 通过 token 获取会话
  async getSessionByToken(tokenHash: string): Promise<SessionInfo | null> {
    const sessionId = await redis.get(RedisKeys.tokenSession(tokenHash));
    if (!sessionId) return null;
    return this.getSession(sessionId);
  },

  // 更新会话活动时间
  async updateSessionActivity(sessionId: string) {
    const detail = await redis.get(RedisKeys.sessionDetail(sessionId));
    if (detail) {
      const info = JSON.parse(detail) as SessionInfo;
      info.lastActivityAt = Date.now();
      await redis.set(RedisKeys.sessionDetail(sessionId), JSON.stringify(info), 'EX', 7 * 24 * 3600);
    }
  },

  // 删除会话
  async deleteSession(sessionId: string) {
    const detail = await redis.get(RedisKeys.sessionDetail(sessionId));
    if (detail) {
      const info = JSON.parse(detail) as SessionInfo;
      const pipeline = redis.pipeline();
      pipeline.del(RedisKeys.sessionDetail(sessionId));
      pipeline.srem(RedisKeys.userSessions(info.userId), sessionId);
      await pipeline.exec();
      
      // 返回用户ID，用于通知客户端
      return info.userId;
    }
    return null;
  },

  // 通过 token 删除会话
  async deleteSessionByToken(tokenHash: string) {
    const sessionId = await redis.get(RedisKeys.tokenSession(tokenHash));
    if (sessionId) {
      await this.deleteSession(sessionId);
      await redis.del(RedisKeys.tokenSession(tokenHash));
    }
  },

  // 获取用户所有会话
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessionIds = await redis.smembers(RedisKeys.userSessions(userId));
    const sessions: SessionInfo[] = [];
    
    for (const sid of sessionIds) {
      const detail = await redis.get(RedisKeys.sessionDetail(sid));
      if (detail) {
        sessions.push(JSON.parse(detail));
      }
    }
    
    return sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  },

  // 删除用户所有会话
  async deleteAllUserSessions(userId: string) {
    const sessionIds = await redis.smembers(RedisKeys.userSessions(userId));
    const pipeline = redis.pipeline();
    
    for (const sid of sessionIds) {
      pipeline.del(RedisKeys.sessionDetail(sid));
    }
    
    pipeline.del(RedisKeys.userSessions(userId));
    await pipeline.exec();
  },
};