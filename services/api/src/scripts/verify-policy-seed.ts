import { PrismaClient, PolicyType } from '@prisma/client';

const prisma = new PrismaClient();

const required = [
  PolicyType.TERMS_OF_USE,
  PolicyType.PRIVACY_POLICY,
  PolicyType.COMMUNITY_GUIDELINES,
  PolicyType.CONTENT_SHARING_RULES,
];

async function main() {
  const active = await prisma.policy.findMany({
    where: { published: true, deletedAt: null },
    select: { type: true },
  });
  const present = new Set(active.map((item) => item.type));
  const missing = required.filter((type) => !present.has(type));

  if (missing.length > 0) {
    console.error('[verify-policy-seed] FAIL missing published policy types:', missing.join(', '));
    process.exit(1);
  }

  console.log('[verify-policy-seed] PASS all four published policy types are present.');
}

main()
  .catch((error) => {
    console.error('[verify-policy-seed] FAIL', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
