const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = [
    { email: 'superadmin@wop.local', role: 'SUPER_ADMIN', fullName: 'Super Admin' },
    { email: 'admin@wop.local', role: 'ADMIN', fullName: 'Admin User' },
    { email: 'moderator@wop.local', role: 'MODERATOR', fullName: 'Moderator User' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role: user.role,
        fullName: user.fullName,
        passwordHash,
        deletedAt: null,
      },
      create: {
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        passwordHash,
      },
    });
  }

  console.log('role users ensured');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
