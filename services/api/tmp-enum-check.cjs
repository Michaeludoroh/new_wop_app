const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  const rows = await p.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'TransactionType' ORDER BY enumsortorder`);
  console.log(rows);
  await p.$disconnect();
})();
