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
  console.log('Password: admin123');
  console.log('⚠️  Please change the password after first login!');

  // 创建测试用户
  const testUsers = [
    { username: 'user1', nickname: '张三' },
    { username: 'user2', nickname: '李四' },
    { username: 'user3', nickname: '王五' },
  ];

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
    console.log('Created test user:', created.username, '(password: 123456)');
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });