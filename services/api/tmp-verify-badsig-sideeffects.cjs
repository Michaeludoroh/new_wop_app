const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();

  const event = await p.paymentWebhookEvent.findFirst({
    where: { externalEventId: 'evt-fw-badsig-001' },
    select: {
      id: true,
      externalEventId: true,
      processingStatus: true,
      signatureValid: true,
      paymentTransactionId: true,
      receivedAt: true
    }
  });

  const tx = await p.paymentTransaction.findUnique({
    where: { providerReference: 'fw-ref-001' },
    select: { id: true, status: true, retryCount: true, updatedAt: true, userSubscriptionId: true }
  });

  const sub = tx?.userSubscriptionId
    ? await p.userSubscription.findUnique({
        where: { id: tx.userSubscriptionId },
        select: { id: true, status: true, retryCount: true, cancelledAt: true, updatedAt: true }
      })
    : null;

  console.log(JSON.stringify({ badSigEvent: event, txAfterBadSig: tx, subAfterBadSig: sub }, null, 2));
  await p.$disconnect();
})();
