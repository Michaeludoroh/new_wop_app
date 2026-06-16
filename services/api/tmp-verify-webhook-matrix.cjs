const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.paymentWebhookEvent.findMany({
    where: {
      externalEventId: {
        in: [
          'evt-fw-ok-001',
          'evt-fw-badsig-001',
          'evt-stripe-ok-001',
          'evt-stripe-badsig-001',
          'evt-paystack-ok-001',
          'evt-paystack-badsig-001',
        ],
      },
    },
    select: {
      provider: true,
      externalEventId: true,
      processingStatus: true,
      paymentTransactionId: true,
      createdAt: true,
    },
    orderBy: [{ provider: 'asc' }, { externalEventId: 'asc' }],
  });

  const txs = await prisma.paymentTransaction.findMany({
    where: {
      providerReference: { in: ['fw-ref-001', 'st-ref-001', 'ps-ref-001'] },
    },
    select: {
      provider: true,
      providerReference: true,
      status: true,
      retryCount: true,
      failureCode: true,
      failureMessage: true,
      userSubscriptionId: true,
      updatedAt: true,
    },
    orderBy: { provider: 'asc' },
  });

  const subIds = [...new Set(txs.map((t) => t.userSubscriptionId).filter(Boolean))];
  const subs = await prisma.userSubscription.findMany({
    where: { id: { in: subIds } },
    select: {
      id: true,
      status: true,
      retryCount: true,
      cancelledAt: true,
      updatedAt: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(JSON.stringify({ events, txs, subs }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
