import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { redisService } from '../services/redis.js';

export interface JwtPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// 扩展 FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    sessionId?: string;
  }
}

// 生成 token 哈希
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    // 优先从 Authorization header 获取 token
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // 如果 header 没有，尝试从 query 参数获取
    if (!token) {
      const query = request.query as { token?: string };
      token = query.token;
    }
    
    if (!token) {
      return reply.status(401).send({
        code: 10003,
        message: 'Token缺失，请重新登录',
      });
    }

    // 验证 JWT
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // 验证会话是否有效
    const tokenHash = hashToken(token);
    const session = await redisService.getSessionByToken(tokenHash);
    
    if (!session) {
      return reply.status(401).send({
        code: 10004, // 特定错误码表示会话被踢出
        message: '会话已失效，请重新登录',
        kicked: true,
      });
    }
    
    // 更新会话活动时间
    await redisService.updateSessionActivity(session.sessionId);
    
    request.user = decoded;
    request.sessionId = session.sessionId;
    
    done();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({
        code: 10003,
        message: 'Token已过期，请重新登录',
      });
    }
    
    return reply.status(401).send({
      code: 10003,
      message: 'Token无效，请重新登录',
    });
  }
}

// 可选认证（不强制要求登录）
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      // 验证会话
      const tokenHash = hashToken(token);
      const session = await redisService.getSessionByToken(tokenHash);
      
      if (session) {
        request.user = decoded;
        request.sessionId = session.sessionId;
      }
    }
    
    done();
  } catch {
    // 忽略错误，继续执行
    done();
  }
}