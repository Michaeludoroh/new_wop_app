import { validateSecurityConfig } from './security-config.validation';

describe('validateSecurityConfig', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/ministry',
    JWT_ACCESS_SECRET: 'A'.repeat(48),
    JWT_REFRESH_SECRET: 'B'.repeat(48),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  };

  it('accepts valid secure configuration', () => {
    expect(validateSecurityConfig({ ...validEnv })).toEqual({ ...validEnv });
  });

  it('fails when required secrets are missing', () => {
    expect(() =>
      validateSecurityConfig({
        ...validEnv,
        JWT_ACCESS_SECRET: '',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/i);
  });

  it('fails weak placeholder secrets', () => {
    expect(() =>
      validateSecurityConfig({
        ...validEnv,
        JWT_REFRESH_SECRET: `${'A'.repeat(40)}changeme${'B'.repeat(8)}`,
      }),
    ).toThrow(/weak|placeholder/i);
  });

  it('fails when expiry format is invalid', () => {
    expect(() =>
      validateSecurityConfig({
        ...validEnv,
        JWT_ACCESS_EXPIRES_IN: 'fifteen-minutes',
      }),
    ).toThrow(/JWT_ACCESS_EXPIRES_IN/i);
  });

  it('fails when refresh expiry is not greater than access expiry', () => {
    expect(() =>
      validateSecurityConfig({
        ...validEnv,
        JWT_ACCESS_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '30m',
      }),
    ).toThrow(/must be greater/i);
  });
});
