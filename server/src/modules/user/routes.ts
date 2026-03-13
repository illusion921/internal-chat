import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';

const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  signature: z.string().max(100).optional(),
});

const searchSchema = z.object({
  keyword: z.string().min(1).max(50),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function userRoutes(fastify: FastifyInstance) {
  // 搜索用户
  fastify.get('/search', { preHandler: authMiddleware }, async (request, reply) => {
    const query = searchSchema.parse(request.query);
    const { keyword, page, pageSize } = query;
    const userId = request.user!.userId;

    // SQLite 不支持 mode: insensitive，使用 toLowerCase 处理
    const lowerKeyword = keyword.toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: keyword } },
          { nickname: { contains: keyword } },
        ],
        NOT: { id: userId },
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
        status: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 客户端过滤实现不区分大小写
    const filteredUsers = users.filter(u => 
      u.username.toLowerCase().includes(lowerKeyword) ||
      u.nickname.toLowerCase().includes(lowerKeyword)
    );

    return reply.send({
      code: 0,
      data: {
        list: filteredUsers,
        total: filteredUsers.length,
        page,
        pageSize,
      },
    });
  });

  // 获取用户信息
  fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND.message, ErrorCodes.USER_NOT_FOUND.code, 404);
    }

    return reply.send({
      code: 0,
      data: user,
    });
  });

  // 更新个人信息
  fastify.put('/profile', { preHandler: authMiddleware }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const userId = request.user!.userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
      message: '更新成功',
    });
  });

  // 上传头像
  fastify.post('/avatar', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;
    
    // 使用 parts() 遍历所有部分，避免 file() 的重复调用问题
    let fileData: {
      mimetype?: string;
      file: Buffer;
    } | null = null;
    
    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          fileData = {
            mimetype: part.mimetype,
            file: buffer,
          };
          break; // 只处理第一个文件
        }
      }

      if (!fileData || !fileData.file) {
        return reply.send({
          code: 40001,
          message: '请选择头像文件',
        });
      }

      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileData.mimetype || '')) {
        return reply.send({
          code: 40001,
          message: '只支持 jpg、png、gif、webp 格式',
        });
      }

      // 检查文件大小 (2MB)
      if (fileData.file.length > 2 * 1024 * 1024) {
        return reply.send({
          code: 40001,
          message: '头像大小不能超过 2MB',
        });
      }

      // 保存文件到本地
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const uploadDir = path.resolve('./uploads/avatars');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // 根据文件类型确定扩展名
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
      };
      const ext = extMap[fileData.mimetype || 'image/jpeg'];
      
      const filename = `${userId}_${Date.now()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      
      await fs.writeFile(filepath, fileData.file);
      
      const avatarUrl = `/uploads/avatars/${filename}`;

      await prisma.user.update({
        where: { id: userId },
        data: { avatar: avatarUrl },
      });

      return reply.send({
        code: 0,
        data: { avatar: avatarUrl },
        message: '头像上传成功',
      });
    } catch (error) {
      request.log.error({ error }, 'Avatar upload error');
      return reply.send({
        code: 50001,
        message: '头像上传失败',
      });
    }
  });

  // 获取当前用户信息
  fastify.get('/me/profile', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        signature: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return reply.send({
      code: 0,
      data: user,
    });
  });
}