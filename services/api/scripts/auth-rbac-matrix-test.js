const baseUrl = 'http://localhost:3000/api/v1';

async function req(method, path, body, token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: res.status,
    text: await res.text(),
  };
}

async function malformedJson(path, rawBody) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });

  return {
    status: res.status,
    text: await res.text(),
  };
}

async function main() {
  const email = `matrix_${Date.now()}@example.com`;
  const password = 'Password123!';

  const register = await req('POST', '/auth/register', {
    email,
    password,
    fullName: 'Matrix User',
  });
  console.log('register_member', register.status);

  const registerJson = JSON.parse(register.text);
  const memberToken = registerJson.accessToken;
  const memberRefresh = registerJson.refreshToken;

  const endpoints = [
    '/users',
    '/subscriptions/plans',
    '/payments',
    '/analytics',
    '/notifications',
    '/announcements',
    '/ebooks',
    '/programs',
    '/mentorship',
  ];

  for (const ep of endpoints) {
    const r = await req('GET', ep);
    console.log('no_token', ep, r.status);
  }

  for (const ep of endpoints) {
    const r = await req('GET', ep, undefined, memberToken);
    console.log('member_token', ep, r.status);
  }

  const invalidRefresh = await req('POST', '/auth/refresh', {
    refreshToken: 'invalid-refresh-token',
  });
  console.log('refresh_invalid', invalidRefresh.status);

  const missingRefresh = await req('POST', '/auth/refresh', {});
  console.log('refresh_missing', missingRefresh.status);

  const loginMissing = await req('POST', '/auth/login', { email });
  console.log('login_missing_fields', loginMissing.status);

  const malformed = await malformedJson('/auth/register', '{"email":"badjson@example.com",');
  console.log('register_malformed', malformed.status);

  const logout = await req('POST', '/auth/logout', { refreshToken: memberRefresh });
  console.log('logout_member', logout.status);

  const refreshAfterLogout = await req('POST', '/auth/refresh', { refreshToken: memberRefresh });
  console.log('refresh_after_logout_member', refreshAfterLogout.status);
}

main().catch((e) => {
  console.error('matrix_test_error', e);
  process.exit(1);
});

