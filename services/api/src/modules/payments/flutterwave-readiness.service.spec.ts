import { ConfigService } from '@nestjs/config';
import { FlutterwaveReadinessService } from './flutterwave-readiness.service';

function createService(env: Record<string, string | undefined>) {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  return new FlutterwaveReadinessService(configService);
}

describe('FlutterwaveReadinessService', () => {
  it('reports not configured when Flutterwave env is missing', async () => {
    const service = createService({});
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('NOT_CONFIGURED');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.connectionTest).toBe('skipped');
    expect(snapshot.capabilities.checkout).toBe(false);
  });

  it('reports not ready when webhook secret is missing', async () => {
    const service = createService({
      FLUTTERWAVE_SECRET_KEY: 'FLWSECK_TEST-key',
      PAYMENT_REDIRECT_BASE_URL: 'http://localhost:4000/api/v1',
    });
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('FLUTTERWAVE');
    expect(snapshot.configured).toBe(false);
    expect(snapshot.missingVariables).toContain('FLUTTERWAVE_WEBHOOK_SECRET');
    expect(snapshot.webhookReady).toBe(false);
  });
});
