import { ConfigService } from '@nestjs/config';
import { EmailReadinessService } from './email-readiness.service';

function createService(env: Record<string, string | undefined>) {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  return new EmailReadinessService(configService);
}

describe('EmailReadinessService', () => {
  it('reports mock provider when SMTP is not configured', async () => {
    const service = createService({});
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('MOCK_SMTP');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.connectionTest).toBe('skipped');
    expect(snapshot.missingVariables).toContain('SMTP_HOST');
  });

  it('reports not ready when SMTP is partially configured', async () => {
    const service = createService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
    });
    await service.refreshConnectionTest();
    const snapshot = service.getSnapshot();

    expect(snapshot.provider).toBe('SMTP');
    expect(snapshot.configured).toBe(false);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.missingVariables).toEqual(['SMTP_USER', 'SMTP_PASS']);
  });
});
