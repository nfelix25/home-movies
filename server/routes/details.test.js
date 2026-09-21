import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stubFetch } from '../testing/http.js';
import { startApp } from '../testing/app.js';
import { findResult, matrixDetails, tmdbFind, tmdbSearch } from '../testing/tmdbFixtures.js';
import { MODEL_PAYLOAD, OPENAI_URL, openAiResponse } from '../testing/openaiFixtures.js';
import { ok, openAiRoute, route, tmdbSearchRoute } from '../testing/upstream.js';
import { createCache } from '../details/cache.js';

process.env.TMDB_API_KEY = 'test-tmdb-key';
const { createDetailsRouter } = await import('./details.js');

// getMovieFacts memoizes per film, so each test uses its own IMDb / TMDB id (n = 1..9).
const imdb = (n) => `tt900000${n}`;
const tmdbIdOf = (n) => 9100 + n;
const movieRoutes = (n) => [
  route(`/3/find/${imdb(n)}`, ok(tmdbFind(findResult({ id: tmdbIdOf(n) })))),
  route(`/3/movie/${tmdbIdOf(n)}`, ok(matrixDetails({ id: tmdbIdOf(n), imdb_id: imdb(n) }))),
];
const identity = (n) => `imdbId=${imdb(n)}&title=The%20Matrix&year=1999`;

let stub;
let app;
let cacheDir;
const savedKey = process.env.OPEN_AI_API_KEY;

beforeEach(async () => {
  mock.method(console, 'error', () => {});
  process.env.OPEN_AI_API_KEY = 'test-openai-key';
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'details-route-'));
  app = await startApp('/api', createDetailsRouter({ cache: createCache({ dir: cacheDir }) }));
});

afterEach(async () => {
  stub?.restore();
  mock.restoreAll();
  await app.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
  if (savedKey === undefined) delete process.env.OPEN_AI_API_KEY;
  else process.env.OPEN_AI_API_KEY = savedKey;
});

const openAiCount = () => stub.calls.filter((c) => c.url.href === OPENAI_URL).length;

// ── Both routes: input validation and TMDB failures ─────────────────────────

for (const endpoint of ['facts', 'insights']) {
  const badRequests = [
    ['neither imdbId nor title', '', /imdbId or title/],
    ['a malformed imdbId', '?imdbId=abc', /imdbId/],
    ['an overlong title', `?title=${'x'.repeat(201)}`, /title/],
    ['a year that is not a year', '?title=Dune&year=abcd', /year/],
  ];
  for (const [name, query, message] of badRequests) {
    test(`GET /details/${endpoint} answers 400 for ${name}, before any upstream call`, async () => {
      stub = stubFetch([]);

      const { status, body } = await app.get(`/api/details/${endpoint}${query}`);

      assert.equal(status, 400);
      assert.match(body.error, message);
      assert.equal(stub.calls.length, 0);
    });
  }

  test(`GET /details/${endpoint} answers 404 when TMDB has no match`, async () => {
    stub = stubFetch([route(`/3/find/${imdb(1)}`, ok(tmdbFind(null))), route('/3/search/movie', ok(tmdbSearch([])))]);

    const { status, body } = await app.get(`/api/details/${endpoint}?${identity(1)}`);

    assert.equal(status, 404);
    assert.match(body.error, /No TMDB match/);
  });

  test(`GET /details/${endpoint} answers 502 when TMDB fails`, async () => {
    stub = stubFetch([
      route(`/3/find/${imdb(2)}`, ok(tmdbFind(findResult({ id: tmdbIdOf(2) })))),
      route(`/3/movie/${tmdbIdOf(2)}`, () => ({ status: 500, body: {} })),
    ]);

    const { status, body } = await app.get(`/api/details/${endpoint}?${identity(2)}`);

    assert.equal(status, 502);
    assert.match(body.error, /TMDB/);
  });
}

// ── facts ───────────────────────────────────────────────────────────────────

test('GET /details/facts returns the film facts', async () => {
  stub = stubFetch(movieRoutes(3));

  const { status, body } = await app.get(`/api/details/facts?${identity(3)}`);

  assert.equal(status, 200);
  assert.equal(body.tmdbId, tmdbIdOf(3));
  assert.equal(body.title, 'The Matrix');
  assert.equal(body.runtimeMinutes, 136);
  assert.equal(body.certification, 'R');
});

test('GET /details/facts strips the "(1999)" the movie grid appends to titles before searching TMDB', async () => {
  stub = stubFetch([
    route('/3/search/movie', ok(tmdbSearch([findResult({ id: 9150 })]))),
    route('/3/movie/9150', ok(matrixDetails({ id: 9150, imdb_id: 'tt9000150' }))),
  ]);

  const { status } = await app.get('/api/details/facts?title=The%20Matrix%20(1999)&year=1999');

  assert.equal(status, 200);
  const search = stub.calls.find((c) => c.url.pathname === '/3/search/movie').url;
  assert.equal(search.searchParams.get('query'), 'The Matrix');
});

// ── insights ────────────────────────────────────────────────────────────────

test('GET /details/insights returns insights, serves repeats from the cache, and regenerates on refresh=1', async () => {
  stub = stubFetch([...movieRoutes(4), openAiRoute(ok(openAiResponse())), tmdbSearchRoute]);
  const url = `/api/details/insights?${identity(4)}`;

  const first = await app.get(url);
  assert.equal(first.status, 200);
  assert.equal(first.body.premise, MODEL_PAYLOAD.premise);
  assert.equal(first.body.moreLikeThis[0].title, 'Dark City');
  assert.equal(openAiCount(), 1);

  await app.get(url);
  assert.equal(openAiCount(), 1, 'a repeat request is served from the cache');

  await app.get(`${url}&refresh=1`);
  assert.equal(openAiCount(), 2, 'refresh=1 must force a new generation');
});

test('GET /details/insights answers 503 with code NO_KEY when the OpenAI key is missing', async () => {
  delete process.env.OPEN_AI_API_KEY;
  stub = stubFetch(movieRoutes(5));

  const { status, body } = await app.get(`/api/details/insights?${identity(5)}`);

  assert.equal(status, 503);
  assert.equal(body.code, 'NO_KEY');
});

test('GET /details/insights answers 502 with a readable message when OpenAI rejects the key', async () => {
  stub = stubFetch([
    ...movieRoutes(6),
    openAiRoute(() => ({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-...wxyz' } } })),
  ]);

  const { status, body } = await app.get(`/api/details/insights?${identity(6)}`);

  assert.equal(status, 502);
  assert.match(body.error, /OPEN_AI_API_KEY/);
  assert.ok(!body.error.includes('sk-'), 'the key fragment OpenAI echoes must not reach the client');
});
