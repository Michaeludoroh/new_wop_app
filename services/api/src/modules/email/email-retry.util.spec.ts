import { resolveEmailRetryOptions, withRetry } from './email-retry.util';

describe('email-retry.util', () => {
  it('retries transient failures before succeeding', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('temporary failure');
        }
        return 'ok';
      },
      resolveEmailRetryOptions({ SMTP_MAX_RETRIES: '3', SMTP_RETRY_DELAY_MS: '1' }),
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after max attempts are exhausted', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('permanent failure');
        },
        resolveEmailRetryOptions({ SMTP_MAX_RETRIES: '2', SMTP_RETRY_DELAY_MS: '1' }),
      ),
    ).rejects.toThrow('permanent failure');
  });
});
