#!/usr/bin/env node
/**
 * Manages deployment release state for rollback support.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE_DIR = resolve('.deploy');
const STATE_FILE = resolve(STATE_DIR, 'release-state.json');

export function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { releases: [] };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

export function saveRelease(release) {
  mkdirSync(STATE_DIR, { recursive: true });
  const state = loadState();
  state.releases.unshift(release);
  state.releases = state.releases.slice(0, 10);
  state.current = release;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`[release-state] Saved release ${release.id} (tag=${release.imageTag})`);
}

export function getPreviousRelease() {
  const state = loadState();
  if (!state.releases || state.releases.length < 2) {
    return null;
  }
  return state.releases[1];
}

export function getCurrentRelease() {
  const state = loadState();
  return state.current ?? state.releases?.[0] ?? null;
}

if (process.argv[1]?.endsWith('release-state.mjs')) {
  const cmd = process.argv[2];
  if (cmd === 'show') {
    console.log(JSON.stringify(loadState(), null, 2));
  }
}
