export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
};

export function resolveEmailRetryOptions(env: Record<string, string | undefined>): RetryOptions {
  const maxAttempts = Math.max(1, Number(env.SMTP_MAX_RETRIES ?? 3));
  const baseDelayMs = Math.max(100, Number(env.SMTP_RETRY_DELAY_MS ?? 1000));

  return {
    maxAttempts: Number.isFinite(maxAttempts) ? maxAttempts : 3,
    baseDelayMs: Number.isFinite(baseDelayMs) ? baseDelayMs : 1000,
  };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxAttempts || !shouldRetry(error)) {
        break;
      }
      const delayMs = options.baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
