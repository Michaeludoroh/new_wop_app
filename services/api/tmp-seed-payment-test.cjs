const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();

  const user = await p.user.findUnique({ where: { email: 'superadmin@wop.local' } });
  const plan = await p.subscriptionPlan.findFirst({ where: { isActive: true } });
  if (!user || !plan) throw new Error('Missing user or plan');

  const sub = await p.userSubscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: 'TRIALING',
      startedAt: new Date(),
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const base = {
    userId: user.id,
    userSubscriptionId: sub.id,
    transactionType: 'SUBSCRIPTION_INITIAL',
    status: 'PENDING',
    amount: 1000,
    currency: 'USD',
  };

  await p.paymentTransaction.create({ data: { ...base, provider: 'FLUTTERWAVE', providerReference: 'fw-ref-001' } });
  await p.paymentTransaction.create({ data: { ...base, provider: 'STRIPE', providerReference: 'st-ref-001' } });
  await p.paymentTransaction.create({ data: { ...base, provider: 'PAYSTACK', providerReference: 'ps-ref-001' } });

  console.log(JSON.stringify({ seeded: true, subscriptionId: sub.id }));
  await p.$disconnect();
})();
