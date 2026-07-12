import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  function createService() {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_NAME') return 'WOPP';
        if (key === 'WEB_APP_URL') return 'https://app.example.com';
        return undefined;
      }),
    } as unknown as ConfigService;

    return new EmailTemplateService(configService);
  }

  it('renders welcome email with text and html', () => {
    const service = createService();
    const email = service.welcomeEmail('Jane Doe');

    expect(email.subject).toContain('WOPP');
    expect(email.body).toContain('Jane Doe');
    expect(email.html).toContain('Jane Doe');
  });

  it('renders admin notification html safely', () => {
    const service = createService();
    const email = service.adminNotificationEmail('Alert', 'Line 1\nLine 2');

    expect(email.body).toContain('Line 1');
    expect(email.html).toContain('Line 1<br />Line 2');
  });

  it('renders subscription confirmation with expiry date', () => {
    const service = createService();
    const email = service.subscriptionConfirmationEmail({
      fullName: 'Jane Doe',
      planName: 'Premium',
      amountLabel: 'NGN 500.00',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      providerLabel: 'Google Play',
    });

    expect(email.body).toContain('Premium');
    expect(email.body).toContain('2026-08-01');
    expect(email.html).toContain('Google Play');
  });

  it('renders email verification template with verify link and expiry notice', () => {
    const service = createService();
    const email = service.emailVerificationEmail(
      'Jane Doe',
      'https://app.example.com/verify-email?token=abc',
      60,
    );

    expect(email.subject).toBe('Verify your WOPP account');
    expect(email.body).toContain('Jane Doe');
    expect(email.body).toContain('expires in 60 minutes');
    expect(email.html).toContain('Verify your account');
    expect(email.html).toContain('verify-email?token=abc');
  });

  it('builds email verification url from WEB_APP_URL', () => {
    const service = createService();
    expect(service.buildEmailVerificationUrl('raw-token')).toBe(
      'https://app.example.com/verify-email?token=raw-token',
    );
  });
});
