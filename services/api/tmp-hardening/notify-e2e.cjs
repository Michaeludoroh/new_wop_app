const http = require('http');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://127.0.0.1:4000/api/v1';
const prisma = new PrismaClient();

function request(method, path, payload, token, label) {
  return new Promise((resolve) => {
    const data = payload ? JSON.stringify(payload) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path: `/api/v1${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body || '{}');
          } catch {
            parsed = body;
          }

          console.log(`\n${label}_URL: ${BASE}${path}`);
          if (payload) console.log(`${label}_PAYLOAD: ${JSON.stringify(payload)}`);
          console.log(`${label}_STATUS: ${res.statusCode}`);
          console.log(`${label}_BODY: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);

          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );

    req.on('error', (err) => {
      console.log(`\n${label}_URL: ${BASE}${path}`);
      console.log(`${label}_ERROR: ${err.message}`);
      resolve({ status: 0, body: { error: err.message } });
    });

    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const ts = Date.now();
  const adminEmail = `notify.admin+${ts}@example.com`;
  const userEmail = `notify.user+${ts}@example.com`;
  const noEmailUserEmail = `notify.noemail+${ts}@example.com`;
  const pass = 'Passw0rd!23';

  // Setup users
  await request('POST', '/auth/register', { email: adminEmail, password: pass, fullName: 'Notify Admin' }, null, 'ADMIN_REGISTER');
  await request('POST', '/auth/register', { email: userEmail, password: pass, fullName: 'Notify User' }, null, 'USER_REGISTER');
  await request('POST', '/auth/register', { email: noEmailUserEmail, password: pass, fullName: 'No Email User' }, null, 'NOEMAIL_REGISTER');

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });

  const noEmailUser = await prisma.user.findUnique({ where: { email: noEmailUserEmail } });

  const adminLogin = await request('POST', '/auth/login', { email: adminEmail, password: pass }, null, 'ADMIN_LOGIN');
  const userLogin = await request('POST', '/auth/login', { email: userEmail, password: pass }, null, 'USER_LOGIN');

  const adminToken = adminLogin.body.accessToken;
  const userToken = userLogin.body.accessToken;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });

  // Push token for targeted push positive path
  await request(
    'POST',
    '/push/device-token/register',
    { token: `demo-push-token-${ts}`, platform: 'ANDROID', deviceId: 'emu-01' },
    userToken,
    'PUSH_TOKEN_REGISTER',
  );

  // Positive paths
  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Push Targeted', body: 'Push path test', channel: 'PUSH' },
    adminToken,
    'TARGETED_PUSH_OK',
  );

  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Email Targeted', body: 'Email path test', channel: 'EMAIL' },
    adminToken,
    'TARGETED_EMAIL_OK',
  );

  await request(
    'POST',
    '/notifications/broadcast',
    { title: 'Email Broadcast', body: 'Broadcast email test', channel: 'EMAIL' },
    adminToken,
    'BROADCAST_EMAIL_OK',
  );

  await request(
    'POST',
    '/notifications/broadcast',
    { title: 'Push Broadcast', body: 'Broadcast push test', channel: 'PUSH' },
    adminToken,
    'BROADCAST_PUSH_OK',
  );

  // Error paths
  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Unauthorized', body: 'x', channel: 'EMAIL' },
    userToken,
    'TARGETED_UNAUTHORIZED',
  );

  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Invalid Channel', body: 'x', channel: 'SMS' },
    adminToken,
    'TARGETED_INVALID_CHANNEL',
  );

  await request(
    'POST',
    '/notifications/targeted',
    { userId: '00000000-0000-0000-0000-000000000000', title: 'Missing User', body: 'x', channel: 'EMAIL' },
    adminToken,
    'TARGETED_RECIPIENT_NOT_FOUND',
  );

  await request(
    'POST',
    '/notifications/targeted',
    { userId: '00000000-0000-0000-0000-000000000000', title: 'Missing Email Recipient (same not-found path)', body: 'x', channel: 'EMAIL' },
    adminToken,
    'TARGETED_MISSING_EMAIL_RECIPIENT',
  );

  const noPushUserEmail = `notify.nopush+${ts}@example.com`;
  await request('POST', '/auth/register', { email: noPushUserEmail, password: pass, fullName: 'No Push User' }, null, 'NOPUSH_REGISTER');
  const noPushUser = await prisma.user.findUnique({ where: { email: noPushUserEmail } });

  await request(
    'POST',
    '/notifications/targeted',
    { userId: noPushUser.id, title: 'No Push Token', body: 'x', channel: 'PUSH' },
    adminToken,
    'TARGETED_MISSING_PUSH_TOKEN',
  );

  // Dedupe behavior check (same notification dedupe key path not directly injectable via API)
  // Approximate by calling same targeted push twice and then inspecting logs for distinct notification ids.
  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Push Dedupe 1', body: 'same body', channel: 'PUSH' },
    adminToken,
    'TARGETED_PUSH_DUPLICATE_ATTEMPT_1',
  );
  await request(
    'POST',
    '/notifications/targeted',
    { userId: user.id, title: 'Push Dedupe 2', body: 'same body', channel: 'PUSH' },
    adminToken,
    'TARGETED_PUSH_DUPLICATE_ATTEMPT_2',
  );

  // Delivery artifacts from DB
  const emailLogs = await prisma.$queryRawUnsafe(
    `select id,user_id,dedupe_key,provider,success,provider_message_id,error_code,error_message,created_at
     from "NotificationDeliveryLog"
     where provider='MOCK_SMTP'
     order by created_at desc
     limit 50`,
  );

  const pushLogs = await prisma.$queryRawUnsafe(
    `select id,user_id,dedupe_key,provider,success,provider_message_id,error_code,error_message,created_at
     from "PushDeliveryLog"
     order by created_at desc
     limit 50`,
  );

  console.log(`\nEMAIL_LOGS: ${JSON.stringify(emailLogs)}`);
  console.log(`\nPUSH_LOGS: ${JSON.stringify(pushLogs)}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('E2E_SCRIPT_ERROR:', error);
  await prisma.$disconnect();
  process.exit(1);
});
