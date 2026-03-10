import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';

// 自定义错误类
export class AppError extends Error {
  code: number;
  statusCode: number;

  constructor(message: string, code: number, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

// 错误码定义
export const ErrorCodes = {
  // 认证错误 10xxx
  INVALID_CREDENTIALS: { code: 10001, message: '用户名或密码错误' },
  ACCOUNT_LOCKED: { code: 10002, message: '账号已被锁定，请稍后再试' },
  TOKEN_EXPIRED: { code: 10003, message: 'Token已过期，请重新登录' },
  TOKEN_INVALID: { code: 10003, message: 'Token无效，请重新登录' },
  
  // 用户错误 20xxx
  USER_NOT_FOUND: { code: 20001, message: '用户不存在' },
  FRIEND_EXISTS: { code: 20002, message: '好友关系已存在' },
  FRIEND_REQUEST_NOT_FOUND: { code: 20003, message: '好友申请不存在' },
  CANNOT_ADD_SELF: { code: 20004, message: '不能添加自己为好友' },
  
  // 群组错误 30xxx
  GROUP_NOT_FOUND: { code: 30001, message: '群组不存在' },
  NO_PERMISSION: { code: 30002, message: '无权限操作' },
  GROUP_FULL: { code: 30003, message: '群人数已达上限' },
  NOT_GROUP_MEMBER: { code: 30004, message: '你不是该群成员' },
  ALREADY_GROUP_MEMBER: { code: 30005, message: '已是群成员' },
  CANNOT_REMOVE_OWNER: { code: 30006, message: '不能移除群主' },
  
  // 文件错误 40xxx
  FILE_TOO_LARGE: { code: 40001, message: '文件大小超出限制' },
  FILE_EXPIRED: { code: 40002, message: '文件已过期' },
  FILE_NOT_FOUND: { code: 40003, message: '文件不存在' },
  
  // 服务器错误 50xxx
  INTERNAL_ERROR: { code: 50001, message: '服务器内部错误' },
};

// 错误处理中间件
export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // 自定义应用错误
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      code: error.code,
      message: error.message,
    });
  }

  // Prisma 错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突
    if (error.code === 'P2002') {
      return reply.status(400).send({
        code: 40000,
        message: '数据已存在',
      });
    }
    
    // 外键约束失败
    if (error.code === 'P2003') {
      return reply.status(400).send({
        code: 40000,
        message: '关联数据不存在',
      });
    }
  }

  // Fastify 验证错误
  if ('validation' in error) {
    return reply.status(400).send({
      code: 40000,
      message: '参数验证失败',
      details: error.validation,
    });
  }

  // 其他错误
  return reply.status(500).send({
    code: 50001,
    message: '服务器内部错误',
  });
}