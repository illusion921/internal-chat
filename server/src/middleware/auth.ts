import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

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
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 10003,
        message: 'Token缺失，请重新登录',
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    request.user = decoded;
    
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
      request.user = decoded;
    }
    
    done();
  } catch {
    // 忽略错误，继续执行
    done();
  }
}