import { validateSecurityConfig } from './security-config.validation';

describe('validateSecurityConfig', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/ministry',
    JWT_ACCESS_SECRET: 'A'.repeat(48),
    JWT_REFRESH_SECRET: 'B'.repeat(48),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    NODE_ENV: 'development',
  };

  const validProductionEnv = {
    ...validEnv,
    NODE_ENV: 'production',
    REDIS_URL: 'redis://localhost:6379',
    CORS_ORIGIN: 'https://admin.my-ministry.org',
    CONTENT_ACCESS_SECRET: 'C'.repeat(48),
    METRICS_AUTH_TOKEN: 'M'.repeat(24),
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

  it('requires production-only secrets when NODE_ENV is production', () => {
    expect(() =>
      validateSecurityConfig({
        ...validEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow(/CORS_ORIGIN|CONTENT_ACCESS_SECRET|METRICS_AUTH_TOKEN|REDIS_URL/i);
  });

  it('accepts valid production configuration', () => {
    expect(validateSecurityConfig({ ...validProductionEnv })).toEqual({
      ...validProductionEnv,
    });
  });

  it('rejects placeholder production secrets', () => {
    expect(() =>
      validateSecurityConfig({
        ...validProductionEnv,
        CONTENT_ACCESS_SECRET: 'replace_with_prod_content_access_secret_at_least_32_chars',
      }),
    ).toThrow(/placeholder/i);
  });
});
