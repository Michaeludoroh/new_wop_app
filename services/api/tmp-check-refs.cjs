const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  const refs = ['fw-ref-001', 'st-ref-001', 'ps-ref-001'];

  const existing = await p.paymentTransaction.findMany({
    where: { providerReference: { in: refs } },
    select: { id: true, provider: true, providerReference: true, status: true, userSubscriptionId: true },
  });

  console.log(JSON.stringify(existing, null, 2));
  await p.$disconnect();
})();
