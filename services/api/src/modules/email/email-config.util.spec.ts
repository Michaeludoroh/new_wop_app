import {
  buildNodemailerTransportOptions,
  formatFromAddress,
  maskSmtpUser,
  normalizeEmailProviderId,
  resolveEmailConfig,
  resolveEmailProviderId,
  resolveFromEmail,
  resolveFromName,
  resolveSmtpPassword,
  resolveSmtpUsername,
  validateEmailConfigForStartup,
} from './email-config.util';
import { classifyEmailDeliveryError } from './email-error.util';
import {
  createEmailProviderRegistry,
  resolveActiveEmailProvider,
} from './email-provider.factory';

describe('email-config.util', () => {
  it('defaults to mock when EMAIL_PROVIDER and SMTP_HOST are unset', () => {
    expect(resolveEmailProviderId({})).toBe('mock');
    expect(resolveEmailConfig({}).provider).toBe('mock');
    expect(resolveEmailConfig({}).configured).toBe(true);
  });

  it('selects brevo provider with default host', () => {
    const config = resolveEmailConfig({
      EMAIL_PROVIDER: 'brevo',
      SMTP_USERNAME: 'user@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'noreply@example.com',
      SMTP_FROM_NAME: 'WOPP',
    });

    expect(config.provider).toBe('brevo');
    expect(config.host).toBe('smtp-relay.brevo.com');
    expect(config.port).toBe(587);
    expect(config.requireTls).toBe(true);
    expect(config.from).toBe('"WOPP" <noreply@example.com>');
    expect(config.configured).toBe(true);
  });

  it('supports legacy SMTP_USER, SMTP_PASS, and SMTP_FROM aliases', () => {
    const config = resolveEmailConfig({
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'api@example.com',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'Legacy Name <legacy@example.com>',
    });

    expect(config.username).toBe('api@example.com');
    expect(config.hasPassword).toBe(true);
    expect(config.fromEmail).toBe('legacy@example.com');
    expect(config.fromName).toBe('Legacy Name');
  });

  it('reports missing variables for non-mock providers', () => {
    const config = resolveEmailConfig({
      EMAIL_PROVIDER: 'aws',
      SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
    });

    expect(config.configured).toBe(false);
    expect(config.missingVariables).toEqual([
      'SMTP_USERNAME',
      'SMTP_PASSWORD',
      'SMTP_FROM_EMAIL',
    ]);
  });

  it('builds nodemailer transport with pooling and STARTTLS on port 587', () => {
    const transport = buildNodemailerTransportOptions({
      EMAIL_PROVIDER: 'brevo',
      SMTP_USERNAME: 'user@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'noreply@example.com',
    });

    expect(transport?.pool).toBe(true);
    expect(transport?.requireTLS).toBe(true);
    expect(transport?.host).toBe('smtp-relay.brevo.com');
  });

  it('validates production-like startup configuration', () => {
    expect(() =>
      validateEmailConfigForStartup({}, { productionLike: true }),
    ).toThrow(/must not be "mock"/);

    expect(() =>
      validateEmailConfigForStartup(
        {
          EMAIL_PROVIDER: 'brevo',
          SMTP_USERNAME: 'user@example.com',
          SMTP_PASSWORD: 'secret',
          SMTP_FROM_EMAIL: 'noreply@example.com',
        },
        { productionLike: true },
      ),
    ).not.toThrow();
  });

  it('normalizes provider aliases', () => {
    expect(normalizeEmailProviderId('ses')).toBe('aws');
    expect(normalizeEmailProviderId('amazon_ses')).toBe('aws');
  });

  it('masks smtp username for diagnostics', () => {
    expect(maskSmtpUser('api@example.com')).toBe('ap***@example.com');
  });

  it('resolves from name and email helpers', () => {
    expect(resolveFromEmail({ SMTP_FROM_EMAIL: 'noreply@example.com' })).toBe(
      'noreply@example.com',
    );
    expect(resolveFromName({ SMTP_FROM_NAME: 'WOPP' })).toBe('WOPP');
    expect(formatFromAddress('WOPP', 'noreply@example.com')).toBe(
      '"WOPP" <noreply@example.com>',
    );
    expect(resolveSmtpUsername({ SMTP_USERNAME: 'user@example.com' })).toBe(
      'user@example.com',
    );
    expect(resolveSmtpPassword({ SMTP_PASSWORD: 'secret' })).toBe('secret');
  });
});

describe('email-provider.factory', () => {
  it('resolves active provider from registry', () => {
    const mock = { providerName: 'mock', displayName: 'Mock', send: jest.fn() };
    const brevo = { providerName: 'brevo', displayName: 'Brevo', send: jest.fn() };
    const aws = { providerName: 'aws', displayName: 'AWS SES', send: jest.fn() };
    const sendgrid = { providerName: 'sendgrid', displayName: 'SendGrid', send: jest.fn() };
    const mailgun = { providerName: 'mailgun', displayName: 'Mailgun', send: jest.fn() };
    const postmark = { providerName: 'postmark', displayName: 'Postmark', send: jest.fn() };
    const smtp = { providerName: 'smtp', displayName: 'SMTP', send: jest.fn() };

    const registry = createEmailProviderRegistry({
      mock: mock as never,
      brevo: brevo as never,
      aws: aws as never,
      sendgrid: sendgrid as never,
      mailgun: mailgun as never,
      postmark: postmark as never,
      smtp: smtp as never,
    });

    expect(resolveActiveEmailProvider({ EMAIL_PROVIDER: 'brevo' }, registry)).toBe(brevo);
    expect(resolveActiveEmailProvider({}, registry)).toBe(mock);
  });
});

describe('email-error.util', () => {
  it('classifies authentication failures', () => {
    const result = classifyEmailDeliveryError(new Error('Invalid login: 535 Authentication failed'));
    expect(result.category).toBe('AUTH_FAILURE');
    expect(result.retryable).toBe(false);
  });

  it('classifies unauthorized IP as smtp unavailable', () => {
    const result = classifyEmailDeliveryError(new Error('525 5.7.1 Unauthorized IP address'));
    expect(result.category).toBe('SMTP_UNAVAILABLE');
    expect(result.retryable).toBe(true);
  });
});
