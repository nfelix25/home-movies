import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCache } from './cache.js';

const DAY = 24 * 60 * 60 * 1000;
const GENERATED_AT = '2026-09-20T12:00:00.000Z';
const T0 = Date.parse(GENERATED_AT);

let root;
let clock;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-cache-'));
  clock = T0;
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const cacheAt = (dir) => createCache({ dir, ttlMs: 30 * DAY, now: () => clock });
const entry = { premise: 'A hacker discovers his world is not real.', generatedAt: GENERATED_AT };

test('get returns null for a film that was never cached', () => {
  assert.equal(cacheAt(root).get(603), null);
});

test('set then get returns the stored entry', () => {
  const cache = cacheAt(root);

  cache.set(603, entry);

  assert.deepEqual(cache.get(603), entry);
});

test('an entry is fresh just inside the TTL and a miss just past it', () => {
  const cache = cacheAt(root);
  cache.set(603, entry);

  clock = T0 + 30 * DAY - 1;
  assert.deepEqual(cache.get(603), entry);

  clock = T0 + 30 * DAY + 1;
  assert.equal(cache.get(603), null);
});

test('set creates the cache directory on first write', () => {
  const cache = cacheAt(path.join(root, 'server', 'cache', 'insights'));

  cache.set(603, entry);

  assert.deepEqual(cache.get(603), entry);
});

test('set leaves only the finished file behind, no temp files', () => {
  const cache = cacheAt(root);

  cache.set(603, entry);

  assert.deepEqual(fs.readdirSync(root), ['603.json']);
});

test('a truncated file from an interrupted write is a miss, not a crash', () => {
  fs.writeFileSync(path.join(root, '603.json'), '{"premise": "A hacker disc');

  assert.equal(cacheAt(root).get(603), null);
});

test('an entry with no usable timestamp is a miss, so it cannot live forever', () => {
  fs.writeFileSync(path.join(root, '603.json'), JSON.stringify({ premise: 'no timestamp' }));
  fs.writeFileSync(path.join(root, '604.json'), JSON.stringify({ premise: 'bad', generatedAt: 'not a date' }));
  const cache = cacheAt(root);

  assert.equal(cache.get(603), null);
  assert.equal(cache.get(604), null);
});

test('keys must be integer TMDB ids, so a crafted id cannot escape the cache directory', () => {
  const cache = cacheAt(root);

  assert.throws(() => cache.get('../../etc/passwd'), TypeError);
  assert.throws(() => cache.set('../evil', entry), TypeError);
});
