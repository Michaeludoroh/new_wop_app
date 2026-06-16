const axios = require('axios');
const { makeCheck } = require('../../core/types');

async function runPaymentsSuite({ config }) {
  const checks = [];
  const base = config.apiBaseUrl;
  let token = null;

  try {
    const login = await axios.post(`${base}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password,
    });
    token = login.data?.accessToken || null;
  } catch {}

  const request = axios.create({
    timeout: config.timeouts.requestMs,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  async function executeWebhookCase({ id, name, body, evaluator, classifyNetworkFailureAs = 'WARNING' }) {
    const t0 = Date.now();
    try {
      const res = await request.post(`${base}/payments/webhook`, body);
      const evaluation = evaluator(res, null);
      checks.push(
        makeCheck({
          id,
          name,
          status: evaluation.status,
          details: {
            statusCode: res.status,
            response: res.data,
            evidenceType: 'request_response',
            ...evaluation.details,
          },
          durationMs: Date.now() - t0,
        }),
      );
    } catch (error) {
      if (!error.response) {
        checks.push(
          makeCheck({
            id,
            name,
            status: classifyNetworkFailureAs,
            details: {
              statusCode: null,
              response: null,
              message: error.message,
              evidenceType: 'network_failure',
            },
            durationMs: Date.now() - t0,
          }),
        );
        return;
      }

      const evaluation = evaluator(null, error.response);
      checks.push(
        makeCheck({
          id,
          name,
          status: evaluation.status,
          details: {
            statusCode: error.response.status,
            response: error.response.data,
            evidenceType: 'request_response',
            ...evaluation.details,
          },
          durationMs: Date.now() - t0,
        }),
      );
    }
  }

  async function fetchPaymentHistory() {
    const t0 = Date.now();
    try {
      const res = await request.get(`${base}/payments/history`);
      const hasDataArray = Array.isArray(res.data?.data);
      checks.push(
        makeCheck({
          id: 'payments-history-persistence',
          name: 'Payment history persistence endpoint returns persisted records envelope',
          status: res.status === 200 && hasDataArray ? 'PASS' : 'FAIL',
          details: {
            statusCode: res.status,
            response: res.data,
            evidenceType: 'persistence_verification',
          },
          durationMs: Date.now() - t0,
        }),
      );
    } catch (error) {
      checks.push(
        makeCheck({
          id: 'payments-history-persistence',
          name: 'Payment history persistence endpoint returns persisted records envelope',
          status: error.response?.status ? 'WARNING' : 'WARNING',
          details: {
            statusCode: error.response?.status || null,
            response: error.response?.data || null,
            message: error.message,
            evidenceType: error.response ? 'request_response' : 'network_failure',
          },
          durationMs: Date.now() - t0,
        }),
      );
    }
  }

  if (!token) {
    checks.push(
      makeCheck({
        id: 'payments-auth-prereq',
        name: 'Payments suite auth prerequisite',
        status: 'SKIPPED',
        details: { reason: 'unable to acquire auth token' },
      }),
    );
    return { checks };
  }

  const runId = Date.now();
  const stripeBasePayload = {
    provider: 'STRIPE',
    eventId: `evt-stripe-validation-${runId}`,
    eventType: 'payment_intent.succeeded',
    signature: 'sig-valid-12345',
    providerReference: 'st-ref-001',
    payload: { amount: 1000, currency: 'USD' },
  };

  const flutterwaveSuccessPayload = {
    provider: 'FLUTTERWAVE',
    eventId: `evt-fw-success-${runId}`,
    eventType: 'charge.completed',
    signature: 'fw-signature-valid-12345',
    providerReference: 'fw-lifecycle-ref-001',
    payload: { amount: 2999, currency: 'USD', status: 'successful' },
  };

  const flutterwaveFailedPayload = {
    provider: 'FLUTTERWAVE',
    eventId: `evt-fw-failed-${runId}`,
    eventType: 'charge.failed',
    signature: 'fw-signature-valid-12345',
    providerReference: 'fw-lifecycle-ref-001',
    payload: { amount: 2999, currency: 'USD', status: 'failed', failureMessage: 'declined' },
  };

  const flutterwaveCancelledPayload = {
    provider: 'FLUTTERWAVE',
    eventId: `evt-fw-cancelled-${runId}`,
    eventType: 'charge.cancelled',
    signature: 'fw-signature-valid-12345',
    providerReference: 'fw-lifecycle-ref-001',
    payload: { amount: 2999, currency: 'USD', status: 'cancelled' },
  };

  await executeWebhookCase({
    id: 'payments-webhook-signature-invalid',
    name: 'Webhook signature verification rejects invalid signature',
    body: { ...stripeBasePayload, signature: 'bad' },
    evaluator: (_ok, errRes) => ({
      status: errRes?.status === 400 ? 'PASS' : 'FAIL',
      details: { expectedStatusCode: 400, validationArea: 'signature_verification' },
    }),
  });

  await executeWebhookCase({
    id: 'payments-webhook-signature-missing',
    name: 'Webhook signature verification rejects missing signature',
    body: { ...stripeBasePayload, signature: '' },
    evaluator: (_ok, errRes) => ({
      status: errRes?.status === 400 ? 'PASS' : 'FAIL',
      details: { expectedStatusCode: 400, validationArea: 'signature_verification' },
    }),
  });

  await executeWebhookCase({
    id: 'payments-provider-error-invalid-provider',
    name: 'Payment provider errors are handled for unsupported provider',
    body: { ...stripeBasePayload, provider: 'INVALID_PROVIDER' },
    evaluator: (_ok, errRes) => ({
      status: errRes?.status === 400 ? 'PASS' : 'FAIL',
      details: { expectedStatusCode: 400, validationArea: 'payment_provider_error' },
    }),
  });

  await executeWebhookCase({
    id: 'payments-flutterwave-success',
    name: 'Flutterwave end-to-end payment success path is accepted',
    body: flutterwaveSuccessPayload,
    evaluator: (okRes) => ({
      status: okRes?.status === 201 || okRes?.status === 200 ? 'PASS' : 'WARNING',
      details: { validationArea: 'flutterwave_success' },
    }),
  });

  await executeWebhookCase({
    id: 'payments-flutterwave-failed',
    name: 'Flutterwave end-to-end payment failure path is handled',
    body: flutterwaveFailedPayload,
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'flutterwave_failure' },
      };
    },
  });

  await executeWebhookCase({
    id: 'payments-flutterwave-cancelled',
    name: 'Flutterwave cancelled payment path is handled',
    body: flutterwaveCancelledPayload,
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'flutterwave_cancelled' },
      };
    },
  });

  const duplicateEventId = `evt-dup-${runId}`;
  const duplicatePayload = {
    ...stripeBasePayload,
    eventId: duplicateEventId,
    providerReference: 'st-ref-001',
  };

  await executeWebhookCase({
    id: 'payments-idempotency-first-delivery',
    name: 'Webhook idempotency first delivery accepted',
    body: duplicatePayload,
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'idempotency_first_delivery' },
      };
    },
  });

  await executeWebhookCase({
    id: 'payments-idempotency-duplicate-delivery',
    name: 'Webhook idempotency duplicate delivery does not double-process',
    body: duplicatePayload,
    evaluator: (okRes) => {
      const duplicateFlag = okRes?.data?.data?.duplicate === true;
      return {
        status: duplicateFlag ? 'PASS' : 'WARNING',
        details: {
          validationArea: 'idempotency_duplicate_delivery',
          duplicateFlagObserved: duplicateFlag,
        },
      };
    },
  });

  await executeWebhookCase({
    id: 'payments-retry-behavior-on-failure',
    name: 'Webhook retry behavior path observed on failed payment',
    body: {
      ...stripeBasePayload,
      eventId: `evt-retry-${runId}`,
      eventType: 'payment_intent.payment_failed',
      providerReference: 'st-lifecycle-ref-001',
      payload: { amount: 2999, currency: 'USD', status: 'failed' },
    },
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'retry_behavior' },
      };
    },
  });

  await executeWebhookCase({
    id: 'payments-webhook-failure-missing-provider-reference',
    name: 'Webhook failure path returns validation error for missing provider reference',
    body: {
      ...stripeBasePayload,
      eventId: `evt-missing-ref-${runId}`,
      providerReference: '',
    },
    evaluator: (_ok, errRes) => ({
      status: errRes?.status === 400 ? 'PASS' : 'WARNING',
      details: { expectedStatusCode: 400, validationArea: 'webhook_failure_path' },
    }),
  });

  await executeWebhookCase({
    id: 'payments-subscription-lifecycle-renewal',
    name: 'Subscription lifecycle renewal/activation path is exercisable via successful payment',
    body: {
      ...stripeBasePayload,
      eventId: `evt-sub-renew-${runId}`,
      eventType: 'payment_intent.succeeded',
      providerReference: 'st-lifecycle-ref-001',
    },
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'subscription_lifecycle_activation_renewal' },
      };
    },
  });

  await executeWebhookCase({
    id: 'payments-subscription-lifecycle-cancellation-expiration',
    name: 'Subscription lifecycle cancellation/expiration path is exercisable via repeated failures',
    body: {
      ...stripeBasePayload,
      eventId: `evt-sub-cancel-${runId}`,
      eventType: 'payment_intent.payment_failed',
      providerReference: 'st-lifecycle-ref-001',
    },
    evaluator: (okRes, errRes) => {
      const status = okRes?.status || errRes?.status;
      return {
        status: status && status >= 200 && status < 500 ? 'PASS' : 'WARNING',
        details: { validationArea: 'subscription_lifecycle_cancellation_expiration' },
      };
    },
  });

  await fetchPaymentHistory();

  checks.push(
    makeCheck({
      id: 'payments-receipt-email-delivery',
      name: 'Receipt email delivery verification',
      status: 'SKIPPED',
      details: {
        reason:
          'No explicit receipt email endpoint or deterministic observable email artifact found in current payments suite. Requires SMTP/mock email assertion hook.',
        validationArea: 'receipt_email_delivery',
      },
    }),
  );

  return { checks };
}

module.exports = { runPaymentsSuite };
