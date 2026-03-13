import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 创建管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      nickname: '系统管理员',
      status: 'offline',
    },
  });

  console.log('Created admin user:', admin.username);

  // 创建测试用户
  const testUsers = [
    { username: 'user1', nickname: '张三' },
    { username: 'user2', nickname: '李四' },
    { username: 'user3', nickname: '王五' },
  ];

  const createdUsers = [admin];
  
  for (const user of testUsers) {
    const password = await bcrypt.hash('123456', 10);
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        passwordHash: password,
        nickname: user.nickname,
        status: 'offline',
      },
    });
    createdUsers.push(created);
    console.log('Created test user:', created.username);
  }

  // 创建好友关系（admin 与其他用户互为好友）
  console.log('Creating friendships...');
  for (let i = 1; i < createdUsers.length; i++) {
    await prisma.friendship.upsert({
      where: {
        userId_friendId: {
          userId: admin.id,
          friendId: createdUsers[i].id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        friendId: createdUsers[i].id,
        status: 'accepted',
      },
    });

    // 双向好友关系
    await prisma.friendship.upsert({
      where: {
        userId_friendId: {
          userId: createdUsers[i].id,
          friendId: admin.id,
        },
      },
      update: {},
      create: {
        userId: createdUsers[i].id,
        friendId: admin.id,
        status: 'accepted',
      },
    });
    console.log(`Created friendship: admin <-> ${createdUsers[i].nickname}`);
  }

  // 创建测试群组
  console.log('Creating groups...');
  const group = await prisma.group.upsert({
    where: { id: 'test-group-001' },
    update: {},
    create: {
      id: 'test-group-001',
      name: '测试群组',
      ownerId: admin.id,
    },
  });

  // 添加群成员
  for (const user of createdUsers) {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId: user.id,
        role: user.id === admin.id ? 'owner' : 'member',
      },
    });
  }
  console.log('Created group:', group.name, `(${createdUsers.length} members)`);

  console.log('\n=== Seeding completed! ===');
  console.log('\nTest accounts:');
  console.log('  admin / admin123');
  console.log('  user1 / 123456');
  console.log('  user2 / 123456');
  console.log('  user3 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });