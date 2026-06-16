const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'phase2k.user@wop.local';

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, fullName: true },
  });

  if (existing) {
    console.log(
      JSON.stringify(
        { status: 'exists', user: existing, observedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: '$2b$10$phase2kseedplaceholderhash0123456789abcd',
      fullName: 'Phase2K Seed User',
      role: Role.USER,
    },
    select: { id: true, email: true, role: true, fullName: true },
  });

  console.log(
    JSON.stringify(
      { status: 'created', user: created, observedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('seed_phase2k_user_error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
