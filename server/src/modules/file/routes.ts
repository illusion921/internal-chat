import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';
import { config } from '../../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const uploadSchema = z.object({
  type: z.enum(['file', 'image']).optional(),
});

export async function fileRoutes(fastify: FastifyInstance) {
  // 上传文件 - 使用自定义认证（在 onRequest 中进行）
  fastify.post('/upload', {
    onRequest: async (request, reply) => {
      // 在请求体解析前进行认证
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          code: 10003,
          message: 'Token缺失，请重新登录',
        });
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; username: string; iat: number; exp: number };
        request.user = decoded;
      } catch {
        return reply.status(401).send({
          code: 10003,
          message: 'Token无效或已过期',
        });
      }
    }
  }, async (request, reply) => {
    const userId = request.user!.userId;
    
    // 获取文件
    const file = await request.file();
    
    if (!file) {
      throw new AppError('请选择文件', 40001, 400);
    }

    // 读取文件内容
    const buffer = await file.toBuffer();

    // 检查文件大小
    if (buffer.length > config.fileMaxSize) {
      throw new AppError(`文件大小超出限制（最大 ${config.fileMaxSize / 1024 / 1024}MB）`, 40001, 400);
    }

    // 生成文件路径
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const ext = file.filename ? path.extname(file.filename) : '';
    const fileId = uuidv4();
    const filename = `${fileId}${ext}`;
    const relativePath = `${datePath}/${filename}`;
    const absolutePath = path.join(config.fileStoragePath, relativePath);

    // 确保目录存在
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // 保存文件
    await fs.writeFile(absolutePath, buffer);

    // 计算过期时间
    const expiresAt = new Date(Date.now() + config.fileExpireDays * 24 * 60 * 60 * 1000);

    // 保存到数据库
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        filename: file.filename || filename,
        filepath: relativePath,
        filesize: buffer.length,
        mimeType: file.mimetype,
        uploaderId: userId,
        expiresAt,
      },
    });

    return reply.send({
      code: 0,
      data: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        filesize: fileRecord.filesize,
        mimeType: fileRecord.mimeType,
        url: `/uploads/${relativePath}`,
        expiresAt: fileRecord.expiresAt,
      },
      message: '上传成功',
    });
  });

  // 获取文件信息 (放在下载路由之前)
  fastify.get('/info/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        filesize: true,
        mimeType: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!file) {
      throw new AppError(ErrorCodes.FILE_NOT_FOUND.message, ErrorCodes.FILE_NOT_FOUND.code, 404);
    }

    return reply.send({
      code: 0,
      data: {
        ...file,
        url: `/api/files/download/${file.id}`,
        isExpired: file.expiresAt < new Date(),
      },
    });
  });

  // 下载文件 (使用 /download/:id 路径避免路由冲突)
  fastify.get('/download/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new AppError(ErrorCodes.FILE_NOT_FOUND.message, ErrorCodes.FILE_NOT_FOUND.code, 404);
    }

    // 检查是否过期
    if (file.expiresAt < new Date()) {
      throw new AppError(ErrorCodes.FILE_EXPIRED.message, ErrorCodes.FILE_EXPIRED.code, 410);
    }

    const absolutePath = path.join(config.fileStoragePath, file.filepath);

    // 检查文件是否存在
    try {
      await fs.access(absolutePath);
    } catch {
      throw new AppError(ErrorCodes.FILE_NOT_FOUND.message, ErrorCodes.FILE_NOT_FOUND.code, 404);
    }

    // 读取文件并发送
    const fileBuffer = await fs.readFile(absolutePath);
    
    reply.header('Content-Type', file.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    reply.header('Content-Length', fileBuffer.length);
    
    return reply.send(fileBuffer);
  });

  // 获取文件信息 (保留原路由兼容)
  fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        filesize: true,
        mimeType: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!file) {
      throw new AppError(ErrorCodes.FILE_NOT_FOUND.message, ErrorCodes.FILE_NOT_FOUND.code, 404);
    }

    return reply.send({
      code: 0,
      data: {
        ...file,
        url: `/api/files/download/${file.id}`,
        isExpired: file.expiresAt < new Date(),
      },
    });
  });
}