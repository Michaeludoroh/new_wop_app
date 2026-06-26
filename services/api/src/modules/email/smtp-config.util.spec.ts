import {
  maskSmtpUser,
  resolveSmtpConfig,
  resolveSmtpProviderMode,
} from './smtp-config.util';

describe('smtp-config.util', () => {
  it('uses MOCK_SMTP when SMTP_HOST is unset', () => {
    expect(resolveSmtpProviderMode({})).toBe('MOCK_SMTP');
    expect(resolveSmtpConfig({}).configured).toBe(false);
    expect(resolveSmtpConfig({}).missingVariables).toEqual([
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
    ]);
  });

  it('uses SMTP when host is set and reports missing auth vars', () => {
    const config = resolveSmtpConfig({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
    });

    expect(resolveSmtpProviderMode({ SMTP_HOST: 'smtp.example.com' })).toBe('SMTP');
    expect(config.host).toBe('smtp.example.com');
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
    expect(config.configured).toBe(false);
    expect(config.missingVariables).toEqual(['SMTP_USER', 'SMTP_PASS']);
  });

  it('marks config complete when required vars are present', () => {
    const config = resolveSmtpConfig({
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'api@example.com',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'noreply@example.com',
    });

    expect(config.configured).toBe(true);
    expect(config.missingVariables).toEqual([]);
    expect(config.from).toBe('noreply@example.com');
  });

  it('masks smtp user for diagnostics', () => {
    expect(maskSmtpUser('api@example.com')).toBe('ap***@example.com');
    expect(maskSmtpUser(null)).toBeNull();
  });
});
