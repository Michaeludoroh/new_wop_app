import { ConfigService } from '@nestjs/config';
import { EmailReadinessService } from './email-readiness.service';

function createService(env: Record<string, string | undefined>) {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  const emailProvider = {
    providerName: env.EMAIL_PROVIDER === 'mock' ? 'mock' : 'brevo',
    displayName: env.EMAIL_PROVIDER === 'mock' ? 'Mock' : 'Brevo',
    verifyConnection: jest.fn().mockResolvedValue(undefined),
  };

  return new EmailReadinessService(configService, emailProvider as never);
}

describe('EmailReadinessService', () => {
  it('reports mock provider when email is not configured for delivery', async () => {
    const service = createService({});
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('mock');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.connectionTest).toBe('skipped');
  });

  it('reports brevo ready when configured and connection test passes', async () => {
    const service = createService({
      EMAIL_PROVIDER: 'brevo',
      SMTP_USERNAME: 'user@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'noreply@example.com',
      SMTP_FROM_NAME: 'WOPP',
    });
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('brevo');
    expect(snapshot.providerLabel).toBe('Brevo');
    expect(snapshot.configured).toBe(true);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.connectionMessage).toBe('Brevo Connected');
    expect(snapshot.requireTls).toBe(true);
    expect(snapshot.pooled).toBe(true);
  });

  it('reports not ready when brevo is partially configured', async () => {
    const service = createService({
      EMAIL_PROVIDER: 'brevo',
    });
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('brevo');
    expect(snapshot.configured).toBe(false);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.missingVariables).toEqual([
      'SMTP_USERNAME',
      'SMTP_PASSWORD',
      'SMTP_FROM_EMAIL',
    ]);
  });
});
