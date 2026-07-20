import {
  maskSecretKey,
  resolveFlutterwaveConfig,
  resolveFlutterwaveProviderMode,
  testFlutterwaveApiCredentials,
} from './flutterwave-config.util';

describe('flutterwave-config.util', () => {
  it('reports not configured when secret key is missing', () => {
    expect(resolveFlutterwaveProviderMode({})).toBe('NOT_CONFIGURED');
    const config = resolveFlutterwaveConfig({});
    expect(config.configured).toBe(false);
    expect(config.missingVariables).toContain('FLUTTERWAVE_SECRET_KEY');
    expect(config.missingVariables).toContain('FLUTTERWAVE_WEBHOOK_SECRET');
  });

  it('reports configured when required vars are present', () => {
    const config = resolveFlutterwaveConfig({
      FLUTTERWAVE_SECRET_KEY: 'FLWSECK_TEST-abc123',
      FLUTTERWAVE_WEBHOOK_SECRET: 'whsec_test',
      PAYMENT_REDIRECT_BASE_URL: 'https://woppandmopp.com/api/v1',
    });

    expect(resolveFlutterwaveProviderMode({ FLUTTERWAVE_SECRET_KEY: 'key' })).toBe('FLUTTERWAVE');
    expect(config.configured).toBe(true);
    expect(config.webhookReady).toBe(true);
    expect(config.redirectBaseUrl).toBe('https://woppandmopp.com/api/v1');
    expect(config.missingVariables).toEqual([]);
  });

  it('masks secret keys for diagnostics', () => {
    expect(maskSecretKey('FLWSECK_TEST-abcdefghijklmnop')).toBe('FLWS***mnop');
    expect(maskSecretKey(undefined)).toBeNull();
  });

  it('passes API credential test on HTTP 200', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await testFlutterwaveApiCredentials('FLWSECK_TEST', fetchImpl as never);
    expect(result.passed).toBe(true);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('fails API credential test on HTTP 401', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const result = await testFlutterwaveApiCredentials('bad-key', fetchImpl as never);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('unauthorized');
  });
});
