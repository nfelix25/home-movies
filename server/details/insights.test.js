import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stubFetch } from '../testing/http.js';
import { MATRIX_FACTS, MODEL_PAYLOAD, OPENAI_URL, openAiResponse } from '../testing/openaiFixtures.js';
import { openAiRoute, tmdbSearchRoute } from '../testing/upstream.js';
import { createCache } from './cache.js';

// tmdb.js (used to verify recommendations) reads its key when first imported.
process.env.TMDB_API_KEY = 'test-tmdb-key';
const { getInsights, parseResponse, validateInsights, verifyRecommendations } = await import('./insights.js');

const NOW = new Date('2026-09-20T12:00:00.000Z');

// ── parseResponse ───────────────────────────────────────────────────────────

test('parseResponse reads the JSON payload from the message, skipping reasoning and search items', () => {
  const { data } = parseResponse(openAiResponse());

  assert.deepEqual(data, MODEL_PAYLOAD);
});

test('parseResponse returns citation sources deduped by URL with tracking parameters removed', () => {
  const { sources } = parseResponse(openAiResponse());

  assert.deepEqual(sources, [
    {
      title: 'The Matrix movie review & film summary (1999) | Roger Ebert',
      url: 'https://www.rogerebert.com/reviews/the-matrix-1999',
    },
    { title: 'The Matrix | Rotten Tomatoes', url: 'https://www.rottentomatoes.com/m/matrix' },
  ]);
});

test('parseResponse keeps meaningful query parameters and drops only utm_*', () => {
  const annotations = [
    {
      type: 'url_citation',
      start_index: 0,
      end_index: 5,
      url: 'https://example.com/film?id=5&utm_source=openai&utm_medium=x',
      title: 'Example',
    },
  ];

  const { sources } = parseResponse(openAiResponse({ annotations }));

  assert.deepEqual(sources, [{ title: 'Example', url: 'https://example.com/film?id=5' }]);
});

test('parseResponse drops sources that are not http(s) links, since the popup renders them as hrefs', () => {
  const annotations = [
    { type: 'url_citation', start_index: 0, end_index: 5, url: 'javascript:alert(1)', title: 'Bad' },
    { type: 'file_citation', file_id: 'file-1', filename: 'notes.txt', index: 3 },
    { type: 'url_citation', start_index: 6, end_index: 9, url: 'https://ok.example/review', title: 'OK' },
  ];

  const { sources } = parseResponse(openAiResponse({ annotations }));

  assert.deepEqual(sources, [{ title: 'OK', url: 'https://ok.example/review' }]);
});

test('parseResponse rejects an incomplete response and says why', () => {
  const incomplete = openAiResponse({ status: 'incomplete', incompleteReason: 'max_output_tokens' });

  assert.throws(() => parseResponse(incomplete), { code: 'UPSTREAM', message: /max_output_tokens/ });
});

test('parseResponse rejects a refusal', () => {
  const refused = openAiResponse({ content: [{ type: 'refusal', refusal: 'I cannot help with that.' }] });

  assert.throws(() => parseResponse(refused), { code: 'UPSTREAM', message: /declined/ });
});

test('parseResponse rejects text that is not JSON', () => {
  const chatty = openAiResponse({
    content: [{ type: 'output_text', text: 'Sure! Here is your guide.', annotations: [], logprobs: [] }],
  });

  assert.throws(() => parseResponse(chatty), { code: 'UPSTREAM', message: /not valid JSON/ });
});

test('parseResponse rejects a response with no message, without crashing', () => {
  const searchOnly = { ...openAiResponse(), output: [openAiResponse().output[1]] };

  assert.throws(() => parseResponse(searchOnly), { code: 'UPSTREAM', message: /no text/ });
});

// ── validateInsights ────────────────────────────────────────────────────────

test('validateInsights accepts a well-formed payload unchanged', () => {
  assert.deepEqual(validateInsights(MODEL_PAYLOAD), MODEL_PAYLOAD);
});

const malformed = [
  ['a missing premise', (p) => delete p.premise, /premise/],
  ['a blank premise', (p) => (p.premise = '   '), /premise/],
  ['a premise that is only a citation', (p) => (p.premise = '([rt](https://rt.com/m))'), /premise/],
  ['reviews that are not an object', (p) => (p.reviews = 'good'), /reviews\.critics/],
  ['praised that is not an array', (p) => (p.reviews.praised = 'great'), /reviews\.praised/],
  ['a score with no value', (p) => delete p.reviews.scores[0].value, /scores\[0\]\.value/],
  ['a recommendation year that is not an integer', (p) => (p.moreLikeThis[1].year = '1995'), /moreLikeThis\[1\]\.year/],
  ['a recommendation with no reason', (p) => delete p.ifYouLiked[0].reason, /ifYouLiked\[0\]\.reason/],
  ['moreLikeThis that is not an array', (p) => (p.moreLikeThis = null), /moreLikeThis/],
];

for (const [name, mutate, message] of malformed) {
  test(`validateInsights rejects ${name}`, () => {
    const payload = structuredClone(MODEL_PAYLOAD);
    mutate(payload);

    assert.throws(() => validateInsights(payload), { code: 'UPSTREAM', message });
  });
}

test('validateInsights accepts empty review prose, since an obscure film may have no reviews', () => {
  const payload = structuredClone(MODEL_PAYLOAD);
  payload.reviews = { critics: '', audience: '', praised: [], criticized: [], scores: [] };

  const result = validateInsights(payload);

  assert.deepEqual(result.reviews, { critics: '', audience: '', praised: [], criticized: [], scores: [] });
});

test('validateInsights trims review lists to their display caps', () => {
  const payload = structuredClone(MODEL_PAYLOAD);
  payload.reviews.praised = ['p1', 'p2', 'p3', 'p4', 'p5'];
  payload.reviews.criticized = ['c1', 'c2', 'c3', 'c4'];
  payload.reviews.scores = ['a', 'b', 'c', 'd', 'e', 'f'].map((source) => ({ source, value: '1' }));

  const { reviews } = validateInsights(payload);

  assert.deepEqual(reviews.praised, ['p1', 'p2', 'p3']);
  assert.deepEqual(reviews.criticized, ['c1', 'c2', 'c3']);
  assert.deepEqual(reviews.scores.map((s) => s.source), ['a', 'b', 'c', 'd']);
});

// With web search on, gpt-5.4-mini appends "([site](url))" to sentences (seen in a live run).
// Sources are shown separately, so links must not reach the popup as raw markdown.
const linkCases = [
  [
    'a trailing parenthesised citation, as the model really wrote it',
    'The setup is a rescue mission, a mystery, and a fight for freedom rolled into one. ([rottentomatoes.com](https://www.rottentomatoes.com/m/matrix))',
    'The setup is a rescue mission, a mystery, and a fight for freedom rolled into one.',
  ],
  ['several links in one citation', 'Well liked. ([a.com](https://a.com/x), [b.com](https://b.com/y))', 'Well liked.'],
  ['a citation in the middle of a sentence', 'Critics ([rt](https://rt.com/m)) loved it.', 'Critics loved it.'],
  [
    'a bare markdown link, keeping its text',
    'See [Rotten Tomatoes](https://www.rottentomatoes.com/m/matrix) for more.',
    'See Rotten Tomatoes for more.',
  ],
  [
    'a link whose URL contains parentheses',
    'Read on. ([wikipedia.org](https://en.wikipedia.org/wiki/The_Matrix_(film)))',
    'Read on.',
  ],
  [
    'nothing from ordinary parentheses and brackets',
    'The 1999 film (rated R) has a [remastered] cut.',
    'The 1999 film (rated R) has a [remastered] cut.',
  ],
];

for (const [name, input, expected] of linkCases) {
  test(`validateInsights removes ${name}`, () => {
    const payload = structuredClone(MODEL_PAYLOAD);
    payload.reviews.critics = input;

    assert.equal(validateInsights(payload).reviews.critics, expected);
  });
}

test('validateInsights removes links from every model-written string, not just review prose', () => {
  const payload = structuredClone(MODEL_PAYLOAD);
  const cite = ' ([rottentomatoes.com](https://www.rottentomatoes.com/m/matrix))';
  payload.premise += cite;
  payload.reviews.praised[0] += cite;
  payload.moreLikeThis[0].reason += cite;
  payload.ifYouLiked[0].reason += cite;

  const result = validateInsights(payload);

  assert.equal(result.premise, MODEL_PAYLOAD.premise);
  assert.equal(result.reviews.praised[0], MODEL_PAYLOAD.reviews.praised[0]);
  assert.equal(result.moreLikeThis[0].reason, MODEL_PAYLOAD.moreLikeThis[0].reason);
  assert.equal(result.ifYouLiked[0].reason, MODEL_PAYLOAD.ifYouLiked[0].reason);
});

// ── verifyRecommendations ───────────────────────────────────────────────────

const known = {
  'dark city': { tmdbId: 1, title: 'Dark City', year: 1998 },
  'ghost in the shell': { tmdbId: 2, title: 'Ghost in the Shell', year: 1995 },
  'the matrix': { tmdbId: 603, title: 'The Matrix', year: 1999 },
  equilibrium: { tmdbId: 3, title: 'Equilibrium', year: 2002 },
};
const verify = async (title) => known[title.toLowerCase()] ?? null;
const rec = (title, reason) => ({ title, year: 2000, reason });

test('verifyRecommendations keeps verified films in order with TMDB’s canonical title and year', async () => {
  const recs = [rec('ghost in the shell', 'r1'), rec('Made Up Film', 'r2'), rec('Dark City', 'r3')];

  const out = await verifyRecommendations(recs, { verify, selfTmdbId: 603, max: 6 });

  assert.deepEqual(out, [
    { title: 'Ghost in the Shell', year: 1995, reason: 'r1' },
    { title: 'Dark City', year: 1998, reason: 'r3' },
  ]);
});

test('verifyRecommendations drops the film itself and repeated films', async () => {
  const recs = [rec('The Matrix', 'self'), rec('Dark City', 'first'), rec('dark city', 'again')];

  const out = await verifyRecommendations(recs, { verify, selfTmdbId: 603, max: 6 });

  assert.deepEqual(out, [{ title: 'Dark City', year: 1998, reason: 'first' }]);
});

test('verifyRecommendations caps the list after dropping unverified films', async () => {
  const recs = [rec('Made Up Film', 'x'), rec('Dark City', 'a'), rec('Equilibrium', 'b'), rec('ghost in the shell', 'c')];

  const out = await verifyRecommendations(recs, { verify, selfTmdbId: 603, max: 2 });

  assert.deepEqual(out.map((r) => r.title), ['Dark City', 'Equilibrium']);
});

test('verifyRecommendations skips films already shown in another list and still fills the cap', async () => {
  const recs = [rec('Dark City', 'a'), rec('Equilibrium', 'b'), rec('ghost in the shell', 'c')];

  const out = await verifyRecommendations(recs, {
    verify,
    selfTmdbId: 603,
    max: 2,
    alsoShown: [{ title: 'Dark City', year: 1998 }],
  });

  assert.deepEqual(out.map((r) => r.title), ['Equilibrium', 'Ghost in the Shell']);
});

test('verifyRecommendations rejects when verification itself fails', async () => {
  const failing = async () => {
    throw new Error('TMDB search failed');
  };

  await assert.rejects(verifyRecommendations([rec('Dark City', 'a')], { verify: failing, selfTmdbId: 603, max: 6 }), /TMDB/);
});

// ── getInsights (real cache on a temp dir; OpenAI and TMDB stubbed at the network) ──

const succeeds = () => [openAiRoute(() => ({ body: openAiResponse() })), tmdbSearchRoute];

let stub;
let cacheDir;
let cache;
const savedEnv = { key: process.env.OPEN_AI_API_KEY, model: process.env.OPENAI_MODEL };

beforeEach(() => {
  process.env.OPEN_AI_API_KEY = 'test-openai-key';
  delete process.env.OPENAI_MODEL;
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-'));
  cache = createCache({ dir: cacheDir, now: () => NOW.getTime() });
});

afterEach(() => {
  stub?.restore();
  mock.restoreAll();
  fs.rmSync(cacheDir, { recursive: true, force: true });
  for (const [name, value] of [['OPEN_AI_API_KEY', savedEnv.key], ['OPENAI_MODEL', savedEnv.model]]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const generate = (opts = {}) => getInsights(MATRIX_FACTS, { cache, now: () => NOW, ...opts });
const openAiCalls = () => stub.calls.filter((c) => c.url.href === OPENAI_URL);

test('getInsights assembles verified insights, sources and metadata, and caches them', async () => {
  stub = stubFetch(succeeds());

  const insights = await generate();

  assert.deepEqual(insights, {
    premise: MODEL_PAYLOAD.premise,
    reviews: MODEL_PAYLOAD.reviews,
    moreLikeThis: [
      { title: 'Dark City', year: 1998, reason: 'Another story about a man who finds his reality is manufactured.' },
      { title: 'Ghost in the Shell', year: 1995, reason: 'A cyberpunk touchstone that shaped the film’s look.' },
      { title: 'Equilibrium', year: 2002, reason: 'Dystopian setting with stylized gun-fu action.' },
    ],
    ifYouLiked: [
      { title: 'Blade Runner', year: 1982, reason: 'A dystopian tech-noir that asks what is real.' },
      { title: 'Akira', year: 1988, reason: 'An anime landmark whose kinetic action inspired the film.' },
    ],
    sources: [
      {
        title: 'The Matrix movie review & film summary (1999) | Roger Ebert',
        url: 'https://www.rogerebert.com/reviews/the-matrix-1999',
      },
      { title: 'The Matrix | Rotten Tomatoes', url: 'https://www.rottentomatoes.com/m/matrix' },
    ],
    generatedAt: '2026-09-20T12:00:00.000Z',
    model: 'gpt-5.4-mini',
  });
  assert.deepEqual(cache.get(603), insights);
});

test('a film suggested in both lists is shown only under More like this', async () => {
  // A live run put Ghost in the Shell in both lists.
  const payload = structuredClone(MODEL_PAYLOAD);
  payload.ifYouLiked = [
    { title: 'Dark City', year: 1998, reason: 'Also suggested as a close match.' },
    { title: 'Blade Runner', year: 1982, reason: 'Only suggested here.' },
  ];
  stub = stubFetch([openAiRoute(() => ({ body: openAiResponse({ payload }) })), tmdbSearchRoute]);

  const insights = await generate();

  assert.deepEqual(insights.moreLikeThis.map((r) => r.title), ['Dark City', 'Ghost in the Shell', 'Equilibrium']);
  assert.deepEqual(insights.ifYouLiked.map((r) => r.title), ['Blade Runner']);
});

test('getInsights sends the key, forces web search with a strict JSON schema, and grounds the model in the film', async () => {
  stub = stubFetch(succeeds());

  await generate();

  const [call] = openAiCalls();
  const body = JSON.parse(call.init.body);
  assert.equal(call.init.headers.Authorization, 'Bearer test-openai-key');
  assert.deepEqual(body.tools.map((t) => t.type), ['web_search']);
  // "required" is what stops the model answering from stale memory instead of searching.
  assert.equal(body.tool_choice, 'required');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
  for (const fact of ['The Matrix', '1999', 'tt0133093', 'Lilly Wachowski', 'Keanu Reeves', '2026-09-20']) {
    assert.ok(body.input.includes(fact), `the prompt should contain "${fact}"`);
  }
});

test('getInsights uses gpt-5.4-mini by default and OPENAI_MODEL when it is set', async () => {
  stub = stubFetch(succeeds());

  await generate({ refresh: true });
  process.env.OPENAI_MODEL = 'some-other-model';
  await generate({ refresh: true });

  const models = openAiCalls().map((c) => JSON.parse(c.init.body).model);
  assert.deepEqual(models, ['gpt-5.4-mini', 'some-other-model']);
});

test('getInsights reports NO_KEY without calling OpenAI when the key is missing and nothing is cached', async () => {
  delete process.env.OPEN_AI_API_KEY;
  stub = stubFetch([]);

  await assert.rejects(generate(), { code: 'NO_KEY' });
  assert.equal(stub.calls.length, 0);
});

test('getInsights serves a fresh cached entry without calling OpenAI, even with no key', async () => {
  const cached = { premise: 'cached', generatedAt: NOW.toISOString() };
  cache.set(603, cached);
  delete process.env.OPEN_AI_API_KEY;
  stub = stubFetch([]);

  assert.deepEqual(await generate(), cached);
  assert.equal(stub.calls.length, 0);
});

test('getInsights with refresh bypasses the cache and replaces the entry', async () => {
  cache.set(603, { premise: 'old', generatedAt: NOW.toISOString() });
  stub = stubFetch(succeeds());

  const fresh = await generate({ refresh: true });

  assert.equal(fresh.premise, MODEL_PAYLOAD.premise);
  assert.equal(cache.get(603).premise, MODEL_PAYLOAD.premise);
  assert.equal(openAiCalls().length, 1);
});

test('a failed refresh keeps the previous cached entry', async () => {
  const old = { premise: 'old', generatedAt: NOW.toISOString() };
  cache.set(603, old);
  stub = stubFetch([openAiRoute(() => ({ status: 500, body: { error: { message: 'boom' } } }))]);

  await assert.rejects(generate({ refresh: true }), { code: 'UPSTREAM' });

  assert.deepEqual(cache.get(603), old);
});

test('concurrent requests for the same film share one OpenAI call', async () => {
  stub = stubFetch(succeeds());

  const [a, b] = await Promise.all([generate(), generate()]);

  assert.deepEqual(a, b);
  assert.equal(openAiCalls().length, 1);
});

test('a failed generation is not remembered, so the next request tries again', async () => {
  let attempts = 0;
  stub = stubFetch([
    openAiRoute(() => (++attempts === 1 ? { status: 500, body: {} } : { body: openAiResponse() })),
    tmdbSearchRoute,
  ]);

  await assert.rejects(generate(), { code: 'UPSTREAM' });
  const retry = await generate();

  assert.equal(retry.premise, MODEL_PAYLOAD.premise);
});

const httpFailures = [
  [401, { error: { message: 'Incorrect API key provided: sk-...wxyz' } }, /API key/],
  [429, { error: { message: 'You exceeded your current quota' } }, /rate limit or quota/],
  [500, { error: { message: 'The server had an error' } }, /500.*The server had an error/],
];

for (const [status, body, pattern] of httpFailures) {
  test(`getInsights turns an OpenAI ${status} into a clear UPSTREAM error`, async () => {
    stub = stubFetch([openAiRoute(() => ({ status, body }))]);

    await assert.rejects(
      generate(),
      (err) => err.code === 'UPSTREAM' && pattern.test(err.message) && !err.message.includes('sk-')
    );
  });
}

test('getInsights gives up after the timeout and reports it', async () => {
  stub = stubFetch([
    openAiRoute(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason));
        })
    ),
  ]);

  await assert.rejects(generate({ timeoutMs: 20 }), { code: 'UPSTREAM', message: /timed out/ });
});

test('a TMDB failure while verifying recommendations fails the request instead of caching empty lists', async () => {
  stub = stubFetch([
    openAiRoute(() => ({ body: openAiResponse() })),
    { match: (u) => u.pathname === '/3/search/movie', respond: () => ({ status: 500, body: {} }) },
  ]);

  await assert.rejects(generate(), { code: 'UPSTREAM', message: /TMDB/ });
  assert.equal(cache.get(603), null);
});

test('a cache write failure does not throw away insights that were just generated', async () => {
  mock.method(console, 'warn', () => {});
  const readOnlyCache = {
    get: () => null,
    set: () => {
      throw new Error('EROFS: read-only file system');
    },
  };
  stub = stubFetch(succeeds());

  const insights = await generate({ cache: readOnlyCache });

  assert.equal(insights.premise, MODEL_PAYLOAD.premise);
});
