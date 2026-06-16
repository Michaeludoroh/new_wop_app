const fs = require('fs');
const path = require('path');
const { PrismaClient, PaymentProvider, PaymentStatus, SubscriptionStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function loadJson(fileName) {
  const p = path.join(__dirname, '..', fileName);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function upsertLifecycleSeed() {
  const user = await prisma.user.upsert({
    where: { email: 'lifecycle-test@example.com' },
    update: {},
    create: {
      email: 'lifecycle-test@example.com',
      fullName: 'Lifecycle Test User',
      passwordHash: '$2b$12$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu',
      role: 'USER',
    },
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { code: 'LIFECYCLE_MONTHLY' },
    update: {},
    create: {
      code: 'LIFECYCLE_MONTHLY',
      name: 'Lifecycle Monthly',
      amount: '29.99',
      currency: 'USD',
      billingInterval: 'MONTHLY',
      trialPeriodDays: 0,
      isActive: true,
      recurringEnabled: true,
    },
  });

  const sub = await prisma.userSubscription.upsert({
    where: { id: 'lifecycle-subscription-fixed-id' },
    update: {
      status: SubscriptionStatus.ACTIVE,
      retryCount: 0,
      maxRetryCount: 3,
      nextRetryAt: null,
      cancelledAt: null,
      cancellationReason: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: 'lifecycle-subscription-fixed-id',
      userId: user.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      retryCount: 0,
      maxRetryCount: 3,
      metadata: { source: 'payment-lifecycle-matrix' },
    },
  });

  const txRefs = [
    { provider: PaymentProvider.FLUTTERWAVE, ref: 'fw-lifecycle-ref-001' },
    { provider: PaymentProvider.STRIPE, ref: 'st-lifecycle-ref-001' },
    { provider: PaymentProvider.PAYSTACK, ref: 'ps-lifecycle-ref-001' },
  ];

  for (const item of txRefs) {
    await prisma.paymentTransaction.upsert({
      where: { providerReference: item.ref },
      update: {
        status: PaymentStatus.PENDING,
        retryable: true,
        retryCount: 0,
        nextRetryAt: null,
        failureCode: null,
        failureMessage: null,
        failedAt: null,
        paidAt: null,
        metadata: { source: 'payment-lifecycle-matrix', provider: item.provider },
      },
      create: {
        userId: user.id,
        userSubscriptionId: sub.id,
        provider: item.provider,
        providerReference: item.ref,
        transactionType: 'SUBSCRIPTION_RENEWAL',
        amount: '29.99',
        currency: 'USD',
        status: PaymentStatus.PENDING,
        retryable: true,
        retryCount: 0,
        metadata: { source: 'payment-lifecycle-matrix', provider: item.provider },
      },
    });
  }

  return { user, plan, sub };
}

async function main() {
  const seed = await upsertLifecycleSeed();

  const events = [
    { file: 'tmp-webhook-fw-valid.json', providerReference: 'fw-lifecycle-ref-001', eventId: 'evt-fw-life-success-001', eventType: 'charge.completed' },
    { file: 'tmp-webhook-fw.json', providerReference: 'fw-lifecycle-ref-001', eventId: 'evt-fw-life-fail-001', eventType: 'charge.failed' },
    { file: 'tmp-webhook-stripe-valid.json', providerReference: 'st-lifecycle-ref-001', eventId: 'evt-st-life-success-001', eventType: 'payment_intent.succeeded' },
    { file: 'tmp-webhook-stripe.json', providerReference: 'st-lifecycle-ref-001', eventId: 'evt-st-life-fail-001', eventType: 'payment_intent.payment_failed' },
    { file: 'tmp-webhook-paystack-valid.json', providerReference: 'ps-lifecycle-ref-001', eventId: 'evt-ps-life-success-001', eventType: 'charge.success' },
    { file: 'tmp-webhook-paystack.json', providerReference: 'ps-lifecycle-ref-001', eventId: 'evt-ps-life-fail-001', eventType: 'charge.failed' },
  ];

  const prepared = events.map((e) => {
    const payload = loadJson(e.file);
    payload.providerReference = e.providerReference;
    payload.eventId = e.eventId;
    payload.eventType = e.eventType;
    return payload;
  });

  console.log(
    JSON.stringify(
      {
        message: 'Lifecycle seed prepared. Use these payloads against POST /api/v1/payments/webhook with admin auth.',
        seed: {
          userId: seed.user.id,
          subscriptionId: seed.sub.id,
          providers: ['FLUTTERWAVE', 'STRIPE', 'PAYSTACK'],
        },
        webhookPayloads: prepared,
        dbAssertions: {
          transactionsByReference: ['fw-lifecycle-ref-001', 'st-lifecycle-ref-001', 'ps-lifecycle-ref-001'],
          subscriptionId: seed.sub.id,
          requiredChecks: [
            'status transitions deterministic',
            'failureCode/failureMessage persisted on failed events',
            'retryCount + nextRetryAt updates on retryable failure',
            'no duplicate webhook side effects for same external event',
            'no duplicate transactions/subscriptions created',
            'subscription transitions ACTIVE <-> PAST_DUE consistent',
          ],
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
