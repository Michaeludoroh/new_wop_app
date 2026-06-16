"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const SEED_PASSWORD = 'Password123!';
const seedUsers = [
    {
        email: 'superadmin@wop.local',
        fullName: 'Seeded Super Admin',
        role: client_1.Role.SUPER_ADMIN,
    },
    {
        email: 'admin@wop.local',
        fullName: 'Seeded Admin',
        role: client_1.Role.ADMIN,
    },
    {
        email: 'moderator@wop.local',
        fullName: 'Seeded Moderator',
        role: client_1.Role.MODERATOR,
    },
    {
        email: 'user@wop.local',
        fullName: 'Seeded User',
        role: client_1.Role.USER,
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
            interval: 'MONTHLY',
            isActive: true,
        },
        create: {
            code: 'BASIC_MONTHLY',
            name: 'Basic Monthly',
            description: 'Seeded basic monthly plan',
            amount: '9.99',
            currency: 'USD',
            interval: 'MONTHLY',
            isActive: true,
        },
    });
    console.log('Seed complete: users and baseline subscription plan upserted.');
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
//# sourceMappingURL=seed.js.map