export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  delayMs = 500,
): Promise<T> {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * i));
    }
  }

  throw lastError;
}
