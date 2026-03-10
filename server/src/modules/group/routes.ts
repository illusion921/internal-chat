import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../models/index.js';
import { authMiddleware } from '../../middleware/auth.js';
import { AppError, ErrorCodes } from '../../middleware/errorHandler.js';

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  memberIds: z.array(z.string().uuid()).max(199).optional(), // 群主 + 199成员
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatar: z.string().max(255).optional(),
  announcement: z.string().max(500).optional(),
});

const inviteMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1),
});

export async function groupRoutes(fastify: FastifyInstance) {
  // 获取我的群组列表
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user!.userId;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true,
            announcement: true,
            createdAt: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return reply.send({
      code: 0,
      data: memberships.map((m) => ({
        ...m.group,
        memberCount: m.group._count.members,
        myRole: m.role,
      })),
    });
  });

  // 创建群组
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    const body = createGroupSchema.parse(request.body);
    const { name, memberIds = [] } = body;
    const userId = request.user!.userId;

    // 检查群人数上限
    if (memberIds.length >= 200) {
      throw new AppError(ErrorCodes.GROUP_FULL.message, ErrorCodes.GROUP_FULL.code, 400);
    }

    // 创建群组和群主
    const group = await prisma.group.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: [
            { userId, role: 'owner' },
            ...memberIds.map((id) => ({ userId: id, role: 'member' as const })),
          ],
        },
      },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    return reply.send({
      code: 0,
      data: {
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
      },
      message: '群组创建成功',
    });
  });

  // 获取群组详情
  fastify.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, nickname: true, avatar: true },
        },
        members: {
          select: {
            userId: true,
            role: true,
            nickname: true,
            user: {
              select: { id: true, nickname: true, avatar: true, status: true },
            },
            joinedAt: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      throw new AppError(ErrorCodes.GROUP_NOT_FOUND.message, ErrorCodes.GROUP_NOT_FOUND.code, 404);
    }

    // 检查是否是群成员
    const isMember = group.members.some((m) => m.userId === userId);

    return reply.send({
      code: 0,
      data: {
        ...group,
        isMember,
        memberCount: group.members.length,
      },
    });
  });

  // 更新群组信息
  fastify.put('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateGroupSchema.parse(request.body);
    const userId = request.user!.userId;

    // 检查权限
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new AppError(ErrorCodes.NO_PERMISSION.message, ErrorCodes.NO_PERMISSION.code, 403);
    }

    const group = await prisma.group.update({
      where: { id },
      data: body,
    });

    return reply.send({
      code: 0,
      data: group,
      message: '更新成功',
    });
  });

  // 解散群组
  fastify.delete('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      throw new AppError(ErrorCodes.GROUP_NOT_FOUND.message, ErrorCodes.GROUP_NOT_FOUND.code, 404);
    }

    if (group.ownerId !== userId) {
      throw new AppError(ErrorCodes.NO_PERMISSION.message, ErrorCodes.NO_PERMISSION.code, 403);
    }

    await prisma.group.delete({
      where: { id },
    });

    return reply.send({
      code: 0,
      message: '群组已解散',
    });
  });

  // 邀请成员
  fastify.post('/:id/members', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = inviteMembersSchema.parse(request.body);
    const { memberIds } = body;
    const userId = request.user!.userId;

    // 检查群是否存在
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!group) {
      throw new AppError(ErrorCodes.GROUP_NOT_FOUND.message, ErrorCodes.GROUP_NOT_FOUND.code, 404);
    }

    // 检查是否是群成员
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership) {
      throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 403);
    }

    // 检查群人数上限
    if (group._count.members + memberIds.length > 200) {
      throw new AppError(ErrorCodes.GROUP_FULL.message, ErrorCodes.GROUP_FULL.code, 400);
    }

    // 过滤已存在的成员
    const existingMembers = await prisma.groupMember.findMany({
      where: { groupId: id, userId: { in: memberIds } },
      select: { userId: true },
    });

    const existingIds = existingMembers.map((m) => m.userId);
    const newMemberIds = memberIds.filter((id) => !existingIds.includes(id));

    if (newMemberIds.length === 0) {
      throw new AppError(ErrorCodes.ALREADY_GROUP_MEMBER.message, ErrorCodes.ALREADY_GROUP_MEMBER.code, 400);
    }

    // 添加成员
    await prisma.groupMember.createMany({
      data: newMemberIds.map((userId) => ({
        groupId: id,
        userId,
        role: 'member',
      })),
    });

    return reply.send({
      code: 0,
      message: `已邀请 ${newMemberIds.length} 人加入群组`,
    });
  });

  // 移除成员
  fastify.delete('/:id/members/:memberId', { preHandler: authMiddleware }, async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const userId = request.user!.userId;

    // 检查操作者权限
    const operatorMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!operatorMembership || operatorMembership.role === 'member') {
      throw new AppError(ErrorCodes.NO_PERMISSION.message, ErrorCodes.NO_PERMISSION.code, 403);
    }

    // 检查目标成员
    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: memberId } },
    });

    if (!targetMembership) {
      throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 404);
    }

    // 不能移除群主
    if (targetMembership.role === 'owner') {
      throw new AppError(ErrorCodes.CANNOT_REMOVE_OWNER.message, ErrorCodes.CANNOT_REMOVE_OWNER.code, 400);
    }

    // 管理员不能移除其他管理员
    if (operatorMembership.role === 'admin' && targetMembership.role === 'admin') {
      throw new AppError(ErrorCodes.NO_PERMISSION.message, ErrorCodes.NO_PERMISSION.code, 403);
    }

    // 移除成员
    await prisma.groupMember.delete({
      where: { id: targetMembership.id },
    });

    return reply.send({
      code: 0,
      message: '已移除成员',
    });
  });

  // 设置/取消管理员
  fastify.put('/:id/members/:memberId/role', { preHandler: authMiddleware }, async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const { role } = request.body as { role: 'admin' | 'member' };
    const userId = request.user!.userId;

    // 检查是否是群主
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      throw new AppError(ErrorCodes.GROUP_NOT_FOUND.message, ErrorCodes.GROUP_NOT_FOUND.code, 404);
    }

    if (group.ownerId !== userId) {
      throw new AppError(ErrorCodes.NO_PERMISSION.message, ErrorCodes.NO_PERMISSION.code, 403);
    }

    // 检查目标成员
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: memberId } },
    });

    if (!membership) {
      throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 404);
    }

    if (membership.role === 'owner') {
      throw new AppError('不能修改群主角色', 30002, 400);
    }

    // 更新角色
    await prisma.groupMember.update({
      where: { id: membership.id },
      data: { role },
    });

    return reply.send({
      code: 0,
      message: role === 'admin' ? '已设为管理员' : '已取消管理员',
    });
  });

  // 退出群组
  fastify.post('/:id/quit', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership) {
      throw new AppError(ErrorCodes.NOT_GROUP_MEMBER.message, ErrorCodes.NOT_GROUP_MEMBER.code, 404);
    }

    // 群主不能退出，只能解散
    if (membership.role === 'owner') {
      throw new AppError('群主不能退出群组，请转让群主或解散群组', 30002, 400);
    }

    await prisma.groupMember.delete({
      where: { id: membership.id },
    });

    return reply.send({
      code: 0,
      message: '已退出群组',
    });
  });
}