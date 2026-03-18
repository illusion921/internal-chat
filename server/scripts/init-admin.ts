/**
 * 初始化管理员账号脚本
 * 用于 Docker 部署时自动创建管理员账号
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  console.log('Checking admin user...');

  // 检查管理员是否已存在
  const existingAdmin = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME },
  });

  if (existingAdmin) {
    console.log(`Admin user "${ADMIN_USERNAME}" already exists`);
    return;
  }

  // 创建管理员账号
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      passwordHash,
      nickname: '管理员',
      status: 'offline',
    },
  });

  console.log(`Admin user "${ADMIN_USERNAME}" created successfully`);
  console.log(`User ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('Failed to create admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });