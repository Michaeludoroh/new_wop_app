import {
  buildNodemailerTransportOptions,
  maskSmtpUser,
  resolveSmtpConfig,
  resolveSmtpProviderMode,
} from './smtp-config.util';

describe('smtp-config.util compatibility layer', () => {
  it('uses MOCK_SMTP when provider is mock', () => {
    expect(resolveSmtpProviderMode({})).toBe('MOCK_SMTP');
    expect(resolveSmtpConfig({}).configured).toBe(true);
  });

  it('uses SMTP when brevo provider is configured', () => {
    const config = resolveSmtpConfig({
      EMAIL_PROVIDER: 'brevo',
      SMTP_USERNAME: 'api@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'noreply@example.com',
    });

    expect(resolveSmtpProviderMode({ EMAIL_PROVIDER: 'brevo' })).toBe('SMTP');
    expect(config.host).toBe('smtp-relay.brevo.com');
    expect(config.requireTls).toBe(true);
    expect(config.configured).toBe(true);

    const transport = buildNodemailerTransportOptions({
      EMAIL_PROVIDER: 'brevo',
      SMTP_USERNAME: 'api@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'noreply@example.com',
    });

    expect(transport?.pool).toBe(true);
    expect(transport?.requireTLS).toBe(true);
  });

  it('masks smtp user for diagnostics', () => {
    expect(maskSmtpUser('api@example.com')).toBe('ap***@example.com');
    expect(maskSmtpUser(null)).toBeNull();
  });
});
