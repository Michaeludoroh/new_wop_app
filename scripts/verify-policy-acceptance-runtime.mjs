/**
 * Runtime verification for policy acceptance flow (backend + API contract).
 * Usage: node scripts/verify-policy-acceptance-runtime.mjs
 * Requires API running at API_BASE_URL (default http://localhost:4000/api/v1)
 */

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const timestamp = Date.now();
const testEmail = `policy-verify-${timestamp}@wop.local`;
const testPassword = 'Password123!';
const testName = 'Policy Verify User';

const metrics = {
  registerOk: false,
  loginOk: false,
  userId: null,
  requiredPolicies: 0,
  statusFetches: 0,
  acceptRequests: 0,
  acceptPersisted: 0,
  finalRequiresAction: null,
  finalPendingCount: null,
  finalAcceptedCount: null,
  backendLogPattern: [],
  errors: [],
};

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return data;
}

function log(msg) {
  console.log(`[POLICY_VERIFY] ${msg}`);
}

async function main() {
  log(`API base: ${API_BASE}`);
  log(`Creating user: ${testEmail}`);

  const register = await request('POST', '/auth/register', {
    email: testEmail,
    password: testPassword,
    fullName: testName,
  });
  metrics.registerOk = true;
  const accessToken = register.accessToken;
  metrics.userId = register.user?.id ?? null;
  log(`Registered userId=${metrics.userId}`);

  const login = await request('POST', '/auth/login', {
    email: testEmail,
    password: testPassword,
  });
  metrics.loginOk = true;
  const token = login.accessToken ?? accessToken;
  log('Login succeeded');

  let status = await request('GET', '/policies/me/status', null, token);
  metrics.statusFetches += 1;
  metrics.requiredPolicies = (status.pending ?? []).length;
  log(
    `Initial status requiresAction=${status.requiresAction} pending=${metrics.requiredPolicies}`,
  );

  const acceptOrder = [];
  while (status.requiresAction && (status.pending ?? []).length > 0) {
    const policy = status.pending[0];
    log(
      `Accepting policy ${acceptOrder.length + 1}/${metrics.requiredPolicies} id=${policy.id} type=${policy.type} version=${policy.version}`,
    );
    const acceptResult = await request(
      'POST',
      '/policies/me/accept',
      { policyId: policy.id },
      token,
    );
    metrics.acceptRequests += 1;
    if (acceptResult.success) {
      metrics.acceptPersisted += 1;
      acceptOrder.push({
        policyId: policy.id,
        type: policy.type,
        version: policy.version,
      });
    }
    status = await request('GET', '/policies/me/status', null, token);
    metrics.statusFetches += 1;
    log(
      `After accept #${metrics.acceptRequests}: pending=${(status.pending ?? []).length} requiresAction=${status.requiresAction}`,
    );
  }

  metrics.finalRequiresAction = status.requiresAction;
  metrics.finalPendingCount = (status.pending ?? []).length;
  metrics.finalAcceptedCount = (status.accepted ?? []).length;

  log('--- SUMMARY ---');
  log(`Required policies (initial pending): ${metrics.requiredPolicies}`);
  log(`Accept requests sent: ${metrics.acceptRequests}`);
  log(`Acceptances persisted (success=true): ${metrics.acceptPersisted}`);
  log(`Status fetches: ${metrics.statusFetches}`);
  log(`Final requiresAction: ${metrics.finalRequiresAction}`);
  log(`Final pending: ${metrics.finalPendingCount}`);
  log(`Final accepted: ${metrics.finalAcceptedCount}`);
  log(`Accept order: ${JSON.stringify(acceptOrder.map((p) => p.type))}`);

  const pass =
    metrics.registerOk &&
    metrics.loginOk &&
    metrics.requiredPolicies >= 1 &&
    metrics.acceptRequests === metrics.requiredPolicies &&
    metrics.acceptPersisted === metrics.requiredPolicies &&
    metrics.finalRequiresAction === false &&
    metrics.finalPendingCount === 0;

  log(`VERDICT: ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error('[POLICY_VERIFY] ERROR', err);
  process.exit(1);
});
