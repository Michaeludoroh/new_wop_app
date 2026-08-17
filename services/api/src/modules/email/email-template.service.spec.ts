import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  function createService(
    env: Record<string, string | undefined> = {
      APP_NAME: 'WOPP',
      WEB_APP_URL: 'https://admin.woppandmopp.com',
      USER_WEB_APP_URL: 'https://woppandmopp.com',
    },
  ) {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    return new EmailTemplateService(configService);
  }

  it('renders welcome email with public user links, not the admin host', () => {
    const service = createService();
    const email = service.welcomeEmail('Jane Doe');

    expect(email.subject).toContain('WOPP');
    expect(email.body).toContain('Jane Doe');
    expect(email.body).toContain('https://woppandmopp.com');
    expect(email.html).toContain('href="https://woppandmopp.com"');
    expect(email.body).not.toContain('admin.woppandmopp.com');
    expect(email.html).not.toContain('admin.woppandmopp.com');
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
    expect(email.body).toContain('https://woppandmopp.com');
    expect(email.html).toContain('href="https://woppandmopp.com"');
    expect(email.body).not.toContain('admin.woppandmopp.com');
    expect(email.html).not.toContain('admin.woppandmopp.com');
  });

  it('renders email verification template with public verify link and expiry notice', () => {
    const service = createService({
      APP_NAME: 'WOPP',
      WEB_APP_URL: 'https://admin.woppandmopp.com',
      USER_WEB_APP_URL: 'https://woppandmopp.com',
      EMAIL_LOGO_URL: 'https://woppandmopp.com/logo.png',
    });
    const email = service.emailVerificationEmail(
      'Jane Doe',
      'https://woppandmopp.com/verify-email?token=abc',
      60,
    );

    expect(email.subject).toBe('Verify your WOPP account');
    expect(email.body).toContain('Jane Doe');
    expect(email.body).toContain('expires in 60 minutes');
    expect(email.body).toContain('https://woppandmopp.com/verify-email?token=abc');
    expect(email.html).toContain('Verify your account');
    expect(email.html).toContain('https://woppandmopp.com/verify-email?token=abc');
    expect(email.body).not.toContain('admin.woppandmopp.com');
    expect(email.html).not.toContain('admin.woppandmopp.com');
  });

  it('builds email verification url from USER_WEB_APP_URL for normal users', () => {
    const service = createService();
    const verifyUrl = service.buildEmailVerificationUrl('raw-token');

    expect(verifyUrl).toBe('https://woppandmopp.com/verify-email?token=raw-token');
    expect(verifyUrl).not.toContain('admin.woppandmopp.com');
  });

  it('uses the same public verification url for resend as for the original send', () => {
    const service = createService();
    const first = service.buildEmailVerificationUrl('resend-token');
    const resent = service.buildEmailVerificationUrl('resend-token');

    expect(first).toBe(resent);
    expect(first).toBe('https://woppandmopp.com/verify-email?token=resend-token');
    expect(first).not.toContain('admin.woppandmopp.com');
  });

  it('keeps admin-only logo fallback on WEB_APP_URL while user verify links stay public', () => {
    const service = createService();
    const verifyUrl = service.buildEmailVerificationUrl('logo-token');
    const email = service.emailVerificationEmail('Jane Doe', verifyUrl, 60);

    expect(verifyUrl).toBe('https://woppandmopp.com/verify-email?token=logo-token');
    expect(email.html).toContain('https://admin.woppandmopp.com/logo.png');
    expect(email.body).toContain('https://woppandmopp.com/verify-email?token=logo-token');
    expect(email.body).not.toContain('admin.woppandmopp.com');
  });

  it('builds normal-user password reset url on the public site, not the admin host', () => {
    const service = createService();
    const resetUrl = service.buildPasswordResetUrl('reset-token');

    expect(resetUrl).toBe('https://woppandmopp.com/reset-password?token=reset-token');
    expect(resetUrl).not.toContain('admin.woppandmopp.com');

    const email = service.passwordResetEmail(
      'Jane Doe',
      resetUrl,
      'reset-token',
    );
    expect(email.body).toContain('https://woppandmopp.com/reset-password?token=reset-token');
    expect(email.body).not.toContain('admin.woppandmopp.com');
    expect(email.html).not.toContain('admin.woppandmopp.com');
    expect(email.html).toContain('Reset your password');
  });
});
