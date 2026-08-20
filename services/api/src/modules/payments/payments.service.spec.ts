import { GoneException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

function createService(overrides?: {
  transactions?: Record<string, unknown>[];
  transaction?: Record<string, unknown> | null;
  webhookEvents?: Record<string, unknown>[];
}) {
  const prisma = {
    paymentTransaction: {
      findMany: jest.fn().mockResolvedValue(overrides?.transactions ?? []),
      findUnique: jest.fn().mockResolvedValue(overrides?.transaction ?? null),
    },
    paymentWebhookEvent: {
      findMany: jest.fn().mockResolvedValue(overrides?.webhookEvents ?? []),
    },
  };

  const service = new PaymentsService(prisma as never);
  return { service, prisma };
}

describe('PaymentsService card checkout removal', () => {
  it('rejects subscription checkout without creating a card session', async () => {
    const { service } = createService();

    await expect(service.initiateSubscriptionCheckout('user_1', { planCode: 'PREMIUM' })).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('rejects eBook card checkout', async () => {
    const { service } = createService();

    await expect(service.initiateEbookCheckout('user_1', { ebookId: 'ebook_1' })).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('rejects checkout completion and inbound card webhooks', async () => {
    const { service } = createService();

    await expect(service.completeCheckout('wop_ref_1')).rejects.toBeInstanceOf(GoneException);
    expect(() => service.createWebhookDto('flutterwave', 'hash', {})).toThrow(GoneException);
    await expect(
      service.processWebhook({
        provider: 'FLUTTERWAVE' as never,
        eventId: 'evt_1',
        eventType: 'charge.completed',
        signature: 'hash',
        payload: {},
      }),
    ).rejects.toBeInstanceOf(GoneException);
  });
});

describe('PaymentsService history and status', () => {
  it('returns persisted payment history', async () => {
    const { service, prisma } = createService({
      transactions: [{ id: 'tx_1', providerReference: 'wop_ref_1', status: PaymentStatus.SUCCESS }],
    });

    await expect(service.getHistory('user_1', 'USER', {})).resolves.toMatchObject({
      data: [{ id: 'tx_1' }],
    });
    expect(prisma.paymentTransaction.findMany).toHaveBeenCalled();
  });

  it('returns payment status for the owning user', async () => {
    const { service } = createService({
      transaction: {
        id: 'tx_1',
        userId: 'user_1',
        providerReference: 'wop_ref_1',
        status: PaymentStatus.SUCCESS,
      },
    });

    await expect(service.getStatus('user_1', 'USER', 'wop_ref_1')).resolves.toMatchObject({
      data: { id: 'tx_1' },
    });
  });

  it('rejects missing payment status lookups', async () => {
    const { service } = createService({ transaction: null });

    await expect(service.getStatus('user_1', 'USER', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
