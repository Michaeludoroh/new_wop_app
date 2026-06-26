/**
 * Runtime verification script for policy acceptance flow.
 * Registers a brand-new user and walks through accept-all flow against live API.
 *
 * Usage: node scripts/runtime-verify-policy-acceptance.mjs [--base-url=http://localhost:4000/api/v1]
 */

const baseUrl =
  process.argv.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ??
  process.env.API_BASE_URL ??
  'http://localhost:4000/api/v1';

const timestamp = Date.now();
const testUser = {
  email: `policy-runtime-${timestamp}@wop.local`,
  password: 'Password123!',
  fullName: 'Policy Runtime Verify',
};

const results = {
  baseUrl,
  testUser: { email: testUser.email },
  requiredPolicies: 0,
  acceptanceRequests: 0,
  acceptanceRecords: 0,
  statusChecks: 0,
  finalStatus: null,
  backendLogs: [],
  errors: [],
};

function diag(message) {
  const line = `[POLICY_DIAG] ${message}`;
  console.log(line);
  results.backendLogs.push(line);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed ${response.status}: ${text}`);
  }

  return data;
}

async function main() {
  diag(`Starting runtime verification against ${baseUrl}`);

  const register = await request('/auth/register', {
    method: 'POST',
    body: testUser,
  });

  const accessToken = register.accessToken;
  const userId = register.user?.id;
  diag(`Registered userId=${userId} email=${testUser.email}`);

  let status = await request('/policies/me/status', { token: accessToken });
  results.statusChecks += 1;

  const pending = status.pending ?? [];
  results.requiredPolicies = pending.length;
  diag(
    `Initial status requiresAction=${status.requiresAction} pendingCount=${pending.length}`,
  );

  for (const policy of pending) {
    diag(
      `Accepting policyId=${policy.id} type=${policy.type} version=${policy.version}`,
    );
    await request('/policies/me/accept', {
      method: 'POST',
      token: accessToken,
      body: { policyId: policy.id },
    });
    results.acceptanceRequests += 1;

    status = await request('/policies/me/status', { token: accessToken });
    results.statusChecks += 1;
    diag(
      `After accept policyType=${policy.type} pendingCount=${(status.pending ?? []).length} requiresAction=${status.requiresAction}`,
    );
  }

  results.finalStatus = status;
  results.acceptanceRecords = (status.accepted ?? []).length;

  diag(
    `Final status requiresAction=${status.requiresAction} acceptedCount=${results.acceptanceRecords}`,
  );

  const pass =
    results.requiredPolicies > 0 &&
    results.acceptanceRequests === results.requiredPolicies &&
    results.acceptanceRecords === results.requiredPolicies &&
    status.requiresAction === false &&
    (status.pending ?? []).length === 0;

  results.verdict = pass ? 'PASS' : 'FAIL';

  const outputPath = new URL('../POLICY_ACCEPTANCE_RUNTIME_BACKEND.json', import.meta.url);
  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${outputPath.pathname}`);
  console.log(`VERDICT: ${results.verdict}`);
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  results.errors.push(String(error));
  results.verdict = 'FAIL';
  console.error(error);
  process.exit(1);
});
