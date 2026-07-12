export type EmailErrorCategory =
  | 'AUTH_FAILURE'
  | 'CONNECTION_REFUSED'
  | 'TLS_FAILURE'
  | 'TIMEOUT'
  | 'INVALID_RECIPIENT'
  | 'SMTP_UNAVAILABLE'
  | 'RETRY_EXHAUSTED'
  | 'UNKNOWN';

export type ClassifiedEmailError = {
  category: EmailErrorCategory;
  message: string;
  retryable: boolean;
};

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function classifyEmailDeliveryError(
  error: unknown,
  options?: { retryExhausted?: boolean },
): ClassifiedEmailError {
  const message = extractMessage(error);
  const lower = message.toLowerCase();

  if (options?.retryExhausted) {
    return {
      category: 'RETRY_EXHAUSTED',
      message,
      retryable: false,
    };
  }

  if (
    lower.includes('unauthorized ip') ||
    lower.includes('421') ||
    lower.includes('450') ||
    lower.includes('451') ||
    lower.includes('452') ||
    lower.includes('525') ||
    lower.includes('service unavailable') ||
    lower.includes('unavailable')
  ) {
    return {
      category: 'SMTP_UNAVAILABLE',
      message,
      retryable: true,
    };
  }

  if (
    lower.includes('invalid login') ||
    lower.includes('authentication failed') ||
    lower.includes('535') ||
    lower.includes('534')
  ) {
    return {
      category: 'AUTH_FAILURE',
      message,
      retryable: false,
    };
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('connection refused') ||
    lower.includes('connect econnrefused')
  ) {
    return {
      category: 'CONNECTION_REFUSED',
      message,
      retryable: true,
    };
  }

  if (
    lower.includes('tls') ||
    lower.includes('certificate') ||
    lower.includes('starttls') ||
    lower.includes('ssl')
  ) {
    return {
      category: 'TLS_FAILURE',
      message,
      retryable: false,
    };
  }

  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('etimedout') ||
    lower.includes('esocket')
  ) {
    return {
      category: 'TIMEOUT',
      message,
      retryable: true,
    };
  }

  if (
    lower.includes('recipient') ||
    lower.includes('550') ||
    lower.includes('551') ||
    lower.includes('552') ||
    lower.includes('553') ||
    lower.includes('554')
  ) {
    return {
      category: 'INVALID_RECIPIENT',
      message,
      retryable: false,
    };
  }

  return {
    category: 'UNKNOWN',
    message,
    retryable: true,
  };
}

export function formatEmailErrorLog(input: {
  provider: string;
  to: string;
  category: EmailErrorCategory;
  message: string;
  attempt: number;
  maxAttempts: number;
}): string {
  return [
    `provider=${input.provider}`,
    `to=${input.to}`,
    `category=${input.category}`,
    `attempt=${input.attempt}/${input.maxAttempts}`,
    `message=${input.message}`,
  ].join(' ');
}
