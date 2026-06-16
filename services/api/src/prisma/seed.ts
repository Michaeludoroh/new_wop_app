import { PrismaClient, Role, PolicyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';

const seedUsers = [
  {
    email: 'superadmin@wop.local',
    fullName: 'Seeded Super Admin',
    role: Role.SUPER_ADMIN,
  },
  {
    email: 'admin@wop.local',
    fullName: 'Seeded Admin',
    role: Role.ADMIN,
  },
  {
    email: 'moderator@wop.local',
    fullName: 'Seeded Moderator',
    role: Role.MODERATOR,
  },
  {
    email: 'user@wop.local',
    fullName: 'Seeded User',
    role: Role.USER,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        passwordHash,
        deletedAt: null,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        passwordHash,
      },
    });
  }

  await prisma.subscriptionPlan.upsert({
    where: { code: 'BASIC_MONTHLY' },
    update: {
      name: 'Basic Monthly',
      description: 'Seeded basic monthly plan',
      amount: '9.99',
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
    },
    create: {
      code: 'BASIC_MONTHLY',
      name: 'Basic Monthly',
      description: 'Seeded basic monthly plan',
      amount: '9.99',
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
    },
  });

  const policySeeds = [
    {
      type: PolicyType.TERMS_OF_USE,
      title: 'Terms of Use',
      slug: 'terms-of-use-v1',
      content:
        '<p>By using this platform you agree to participate respectfully and follow ministry guidelines.</p>',
    },
    {
      type: PolicyType.PRIVACY_POLICY,
      title: 'Privacy Policy',
      slug: 'privacy-policy-v1',
      content:
        '<p>We collect account and usage data to provide ministry services and protect your information.</p>',
    },
    {
      type: PolicyType.COMMUNITY_GUIDELINES,
      title: 'Community Guidelines',
      slug: 'community-guidelines-v1',
      content:
        '<p>Treat others with respect, avoid harassment, and share content that edifies the community.</p>',
    },
    {
      type: PolicyType.CONTENT_SHARING_RULES,
      title: 'Content Sharing Rules',
      slug: 'content-sharing-rules-v1',
      content:
        '<p>Do not redistribute premium content without authorization. Credit ministry materials appropriately.</p>',
    },
  ];

  for (const policy of policySeeds) {
    await prisma.policy.upsert({
      where: { slug: policy.slug },
      update: {
        title: policy.title,
        content: policy.content,
        type: policy.type,
        version: 1,
        published: true,
        effectiveDate: new Date(),
        deletedAt: null,
      },
      create: {
        type: policy.type,
        title: policy.title,
        slug: policy.slug,
        content: policy.content,
        version: 1,
        published: true,
        effectiveDate: new Date(),
      },
    });
  }

  console.log('Seed complete: users, subscription plan, and published policies upserted.');
  console.log(`Seeded password for all seeded users: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
