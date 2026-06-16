#!/usr/bin/env node

const targets = [
  { name: 'API', url: process.env.API_HEALTH_URL },
  { name: 'WebSocket', url: process.env.WS_HEALTH_URL },
  { name: 'Admin Web', url: process.env.ADMIN_HEALTH_URL },
];

const timeoutMs = 10000;

async function check(url, name) {
  if (!url) {
    throw new Error(`[verify-health] Missing URL for ${name}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`[verify-health] ${name} unhealthy (${res.status}) @ ${url}`);
    }
    console.log(`[verify-health] ${name} healthy (${res.status}) @ ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  for (const t of targets) {
    await check(t.url, t.name);
  }
  console.log('[verify-health] All targets healthy.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
