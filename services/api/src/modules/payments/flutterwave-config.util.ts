export type FlutterwaveConfigSnapshot = {
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  redirectBaseUrl: string;
  configured: boolean;
  webhookReady: boolean;
  missingVariables: string[];
};

export type FlutterwaveProviderMode = 'NOT_CONFIGURED' | 'FLUTTERWAVE';

export function resolveFlutterwaveConfig(
  env: Record<string, string | undefined>,
): FlutterwaveConfigSnapshot {
  const secretKeyConfigured = Boolean(env.FLUTTERWAVE_SECRET_KEY?.trim());
  const webhookSecretConfigured = Boolean(env.FLUTTERWAVE_WEBHOOK_SECRET?.trim());
  const redirectBaseUrl =
    env.PAYMENT_REDIRECT_BASE_URL?.trim() ||
    env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    'http://localhost:4000/api/v1';

  const missingVariables: string[] = [];
  if (!secretKeyConfigured) missingVariables.push('FLUTTERWAVE_SECRET_KEY');
  if (!webhookSecretConfigured) missingVariables.push('FLUTTERWAVE_WEBHOOK_SECRET');
  if (!env.PAYMENT_REDIRECT_BASE_URL?.trim()) {
    missingVariables.push('PAYMENT_REDIRECT_BASE_URL');
  }

  const configured = secretKeyConfigured && webhookSecretConfigured;
  const webhookReady = secretKeyConfigured && webhookSecretConfigured;

  return {
    secretKeyConfigured,
    webhookSecretConfigured,
    redirectBaseUrl,
    configured,
    webhookReady,
    missingVariables,
  };
}

export function resolveFlutterwaveProviderMode(
  env: Record<string, string | undefined>,
): FlutterwaveProviderMode {
  return env.FLUTTERWAVE_SECRET_KEY?.trim() ? 'FLUTTERWAVE' : 'NOT_CONFIGURED';
}

export function maskSecretKey(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '***';
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

export async function testFlutterwaveApiCredentials(
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ passed: boolean; error: string | null }> {
  try {
    const response = await fetchImpl('https://api.flutterwave.com/v3/transactions?page=1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        passed: false,
        error: 'Flutterwave secret key rejected (unauthorized)',
      };
    }

    if (!response.ok) {
      return {
        passed: false,
        error: `Flutterwave API returned HTTP ${response.status}`,
      };
    }

    return { passed: true, error: null };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : 'Flutterwave API connection failed',
    };
  }
}
