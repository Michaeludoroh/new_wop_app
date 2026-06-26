import { PaymentProvider } from '@prisma/client';
import { FlutterwaveProviderAdapter } from './flutterwave.provider';

function createAdapter(env: Record<string, string | undefined>) {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  };

  return new FlutterwaveProviderAdapter(configService as never);
}

describe('FlutterwaveProviderAdapter verifySignature', () => {
  it('rejects webhooks when webhook secret is not configured', async () => {
    const adapter = createAdapter({});
    const result = await adapter.verifySignature({
      provider: PaymentProvider.FLUTTERWAVE,
      eventId: 'evt_1',
      eventType: 'charge.completed',
      signature: 'secret',
      payload: {},
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('webhook secret is not configured');
  });

  it('rejects invalid webhook signatures', async () => {
    const adapter = createAdapter({ FLUTTERWAVE_WEBHOOK_SECRET: 'expected-secret' });
    const result = await adapter.verifySignature({
      provider: PaymentProvider.FLUTTERWAVE,
      eventId: 'evt_1',
      eventType: 'charge.completed',
      signature: 'wrong-secret',
      payload: {},
    });

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Invalid Flutterwave webhook signature');
  });

  it('accepts matching verif-hash signatures', async () => {
    const adapter = createAdapter({ FLUTTERWAVE_WEBHOOK_SECRET: 'expected-secret' });
    const result = await adapter.verifySignature({
      provider: PaymentProvider.FLUTTERWAVE,
      eventId: 'evt_1',
      eventType: 'charge.completed',
      signature: 'expected-secret',
      payload: {},
    });

    expect(result.isValid).toBe(true);
  });
});
