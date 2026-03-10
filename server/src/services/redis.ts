import Redis from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
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
};

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
    return messages.map(m => JSON.parse(m));
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
};