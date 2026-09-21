import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { stubFetch } from '../testing/http.js';
import {
  MATRIX_COLLECTION,
  MATRIX_OVERVIEW,
  findResult,
  matrixDetails,
  tmdbFind,
  tmdbSearch,
} from '../testing/tmdbFixtures.js';

// tmdb.js reads its key when first imported, so set it before importing.
process.env.TMDB_API_KEY = 'test-tmdb-key';
const { getCollectionMemberIds, getMovieFacts, verifyFilm } = await import('./tmdb.js');

let stub;
afterEach(() => stub?.restore());

const route = (pathname, respond) => ({ match: (u) => u.pathname === pathname, respond });
const ok = (body) => () => ({ body });

// getMovieFacts memoizes per film, so each test below uses its own IMDb id / TMDB id.

test('getMovieFacts resolves by IMDb id and maps TMDB details to the facts contract', async () => {
  stub = stubFetch([
    route('/3/find/tt0133093', ok(tmdbFind(findResult()))),
    route('/3/movie/603', ok(matrixDetails())),
  ]);

  const facts = await getMovieFacts({ imdbId: 'tt0133093', title: 'The Matrix', year: 1999 });

  assert.deepEqual(facts, {
    tmdbId: 603,
    imdbId: 'tt0133093',
    collectionId: 2344,
    title: 'The Matrix',
    year: 1999,
    tagline: 'Welcome to the Real World.',
    overview: MATRIX_OVERVIEW,
    runtimeMinutes: 136,
    certification: 'R',
    genres: ['Action', 'Science Fiction'],
    directors: ['Lilly Wachowski', 'Lana Wachowski'],
    cast: [
      { name: 'Keanu Reeves', character: 'Thomas A. Anderson / Neo' },
      { name: 'Laurence Fishburne', character: 'Morpheus' },
      { name: 'Carrie-Anne Moss', character: 'Trinity' },
      { name: 'Hugo Weaving', character: 'Agent Smith' },
      { name: 'Joe Pantoliano', character: 'Cypher' },
      { name: 'Marcus Chong', character: 'Tank' },
      { name: 'Julian Arahanga', character: 'Apoc' },
      { name: 'Matt Doran', character: 'Mouse' },
    ],
    releaseDate: '1999-03-30',
    languages: ['English'],
    countries: ['US'],
    tmdbScore: 8.2,
    tmdbVoteCount: 25811,
  });

  // Credits and ratings only arrive if they are requested in the same call.
  const details = stub.calls.find((c) => c.url.pathname === '/3/movie/603').url;
  assert.equal(details.searchParams.get('append_to_response'), 'credits,release_dates');
});

test('getMovieFacts searches by title and year when the card has no IMDb id', async () => {
  stub = stubFetch([
    route('/3/search/movie', ok(tmdbSearch([findResult({ id: 9002 })]))),
    route('/3/movie/9002', ok(matrixDetails({ id: 9002, imdb_id: 'tt9000002' }))),
  ]);

  const facts = await getMovieFacts({ imdbId: null, title: 'The Matrix', year: 1999 });

  assert.equal(facts.tmdbId, 9002);
  const search = stub.calls.find((c) => c.url.pathname === '/3/search/movie').url;
  assert.equal(search.searchParams.get('query'), 'The Matrix');
  assert.equal(search.searchParams.get('year'), '1999');
  assert.ok(
    !stub.calls.some((c) => c.url.pathname.startsWith('/3/find/')),
    'must not call /find without an IMDb id'
  );
});

test('getMovieFacts falls back to title search when TMDB does not know the IMDb id', async () => {
  stub = stubFetch([
    route('/3/find/tt9000003', ok(tmdbFind(null))),
    route('/3/search/movie', ok(tmdbSearch([findResult({ id: 9003 })]))),
    route('/3/movie/9003', ok(matrixDetails({ id: 9003, imdb_id: 'tt9000003' }))),
  ]);

  const facts = await getMovieFacts({ imdbId: 'tt9000003', title: 'The Matrix', year: 1999 });

  assert.equal(facts.tmdbId, 9003);
});

test('getMovieFacts returns null when neither the IMDb id nor the title matches', async () => {
  stub = stubFetch([
    route('/3/find/tt9000004', ok(tmdbFind(null))),
    route('/3/search/movie', ok(tmdbSearch([]))),
  ]);

  const facts = await getMovieFacts({ imdbId: 'tt9000004', title: 'No Such Film', year: 2001 });

  assert.equal(facts, null);
});

test('getMovieFacts rejects, not null, when the details lookup fails after the id resolved', async () => {
  stub = stubFetch([
    route('/3/find/tt9000005', ok(tmdbFind(findResult({ id: 9005 })))),
    route('/3/movie/9005', () => ({ status: 500, body: { status_message: 'Internal error' } })),
  ]);

  await assert.rejects(
    getMovieFacts({ imdbId: 'tt9000005', title: 'The Matrix', year: 1999 }),
    /TMDB/
  );
});

test('getMovieFacts shares one details fetch between concurrent lookups of the same film', async () => {
  stub = stubFetch([
    route('/3/find/tt9000006', ok(tmdbFind(findResult({ id: 9006 })))),
    route('/3/movie/9006', ok(matrixDetails({ id: 9006, imdb_id: 'tt9000006' }))),
  ]);
  const identity = { imdbId: 'tt9000006', title: 'The Matrix', year: 1999 };

  const [a, b] = await Promise.all([getMovieFacts(identity), getMovieFacts(identity)]);

  assert.equal(a.tmdbId, 9006);
  assert.equal(b.tmdbId, 9006);
  const detailFetches = stub.calls.filter((c) => c.url.pathname === '/3/movie/9006');
  assert.equal(detailFetches.length, 1);
});

test('getMovieFacts does not remember a failed lookup', async () => {
  let attempts = 0;
  stub = stubFetch([
    route('/3/find/tt9000007', ok(tmdbFind(findResult({ id: 9007 })))),
    route('/3/movie/9007', () => {
      attempts += 1;
      return attempts === 1
        ? { status: 500, body: { status_message: 'Internal error' } }
        : { body: matrixDetails({ id: 9007, imdb_id: 'tt9000007' }) };
    }),
  ]);
  const identity = { imdbId: 'tt9000007', title: 'The Matrix', year: 1999 };

  await assert.rejects(getMovieFacts(identity), /TMDB/);
  const retry = await getMovieFacts(identity);

  assert.equal(retry.tmdbId, 9007);
});

test('getMovieFacts reports no certification when there is no US rating, not another country’s', async () => {
  const gbOnly = matrixDetails({
    id: 9008,
    imdb_id: 'tt9000008',
    release_dates: {
      results: [
        {
          iso_3166_1: 'GB',
          release_dates: [
            { certification: '15', descriptors: [], iso_639_1: '', note: '', release_date: '1999-06-11T00:00:00.000Z', type: 3 },
          ],
        },
      ],
    },
  });
  stub = stubFetch([
    route('/3/find/tt9000008', ok(tmdbFind(findResult({ id: 9008 })))),
    route('/3/movie/9008', ok(gbOnly)),
  ]);

  const facts = await getMovieFacts({ imdbId: 'tt9000008', title: 'The Matrix', year: 1999 });

  assert.equal(facts.certification, null);
});

test('getMovieFacts maps an obscure, sparsely filled record without inventing values', async () => {
  const sparse = matrixDetails({
    id: 9009,
    imdb_id: null,
    title: 'Obscure Short',
    tagline: '',
    overview: '',
    runtime: 0,
    release_date: '',
    vote_average: 0,
    vote_count: 0,
    genres: [],
    spoken_languages: [],
    production_countries: [],
    belongs_to_collection: null,
    credits: { cast: [], crew: [] },
    release_dates: { results: [] },
  });
  stub = stubFetch([
    route('/3/find/tt9000009', ok(tmdbFind(findResult({ id: 9009 })))),
    route('/3/movie/9009', ok(sparse)),
  ]);

  const facts = await getMovieFacts({ imdbId: 'tt9000009', title: 'Obscure Short', year: null });

  // A runtime of 0 or a score of 0.0 from 0 votes would show up as real data in the popup.
  assert.deepEqual(facts, {
    tmdbId: 9009,
    imdbId: null,
    collectionId: null,
    title: 'Obscure Short',
    year: null,
    tagline: null,
    overview: null,
    runtimeMinutes: null,
    certification: null,
    genres: [],
    directors: [],
    cast: [],
    releaseDate: null,
    languages: [],
    countries: [],
    tmdbScore: null,
    tmdbVoteCount: 0,
  });
});

// ── getCollectionMemberIds ──────────────────────────────────────────────────

test('getCollectionMemberIds lists every film in the franchise', async () => {
  stub = stubFetch([route('/3/collection/2344', ok(MATRIX_COLLECTION))]);

  assert.deepEqual(await getCollectionMemberIds(2344), [603, 604, 605, 624860]);
});

test('getCollectionMemberIds rejects when TMDB fails, so sequels are not silently let through', async () => {
  stub = stubFetch([route('/3/collection/2344', () => ({ status: 500, body: {} }))]);

  await assert.rejects(getCollectionMemberIds(2344), /TMDB/);
});

// ── verifyFilm ──────────────────────────────────────────────────────────────

const hit = (id, title, release_date) => findResult({ id, title, release_date });
const DARK_CITY = { tmdbId: 2666, title: 'Dark City', year: 1998 };

const verifyCases = [
  {
    name: 'accepts an exact title and year',
    rec: ['Dark City', 1998],
    results: [hit(2666, 'Dark City', '1998-02-27')],
    want: DARK_CITY,
  },
  {
    name: 'accepts a release year one off',
    rec: ['Dark City', 1997],
    results: [hit(2666, 'Dark City', '1998-02-27')],
    want: DARK_CITY,
  },
  {
    name: 'rejects a release year two off',
    rec: ['Dark City', 1996],
    results: [hit(2666, 'Dark City', '1998-02-27')],
    want: null,
  },
  {
    name: 'rejects a different title released the same year',
    rec: ['Dark City', 1998],
    results: [hit(1, 'City of Angels', '1998-04-10')],
    want: null,
  },
  {
    name: 'ignores case and punctuation ("Spider Man" vs "Spider-Man")',
    rec: ['spider man', 2002],
    results: [hit(557, 'Spider-Man', '2002-05-01')],
    want: { tmdbId: 557, title: 'Spider-Man', year: 2002 },
  },
  {
    name: 'treats "&" and "and" alike',
    rec: ['Mr and Mrs Smith', 2005],
    results: [hit(787, 'Mr. & Mrs. Smith', '2005-06-07')],
    want: { tmdbId: 787, title: 'Mr. & Mrs. Smith', year: 2005 },
  },
  {
    name: 'ignores diacritics and returns TMDB’s canonical title',
    rec: ['Amelie', 2001],
    results: [hit(194, 'Amélie', '2001-04-25')],
    want: { tmdbId: 194, title: 'Amélie', year: 2001 },
  },
  {
    name: 'finds the match when it is not the first result',
    rec: ['Dark City', 1998],
    results: [hit(1, 'Dark City Blues', '1998-01-01'), hit(2666, 'Dark City', '1998-02-27')],
    want: DARK_CITY,
  },
  {
    name: 'skips a candidate with no release date',
    rec: ['Dark City', 1998],
    results: [hit(2666, 'Dark City', '')],
    want: null,
  },
];

for (const { name, rec, results, want } of verifyCases) {
  test(`verifyFilm ${name}`, async () => {
    stub = stubFetch([route('/3/search/movie', ok(tmdbSearch(results)))]);

    assert.deepEqual(await verifyFilm(...rec), want);
  });
}

test('verifyFilm searches by title only, so an off-by-one year is not filtered out by TMDB', async () => {
  stub = stubFetch([route('/3/search/movie', ok(tmdbSearch([])))]);

  await verifyFilm('Dark City', 1997);

  const search = stub.calls[0].url;
  assert.equal(search.searchParams.get('query'), 'Dark City');
  assert.ok(!search.searchParams.has('year'), 'a year filter would hide 1998 when the model says 1997');
});

test('verifyFilm rejects when the TMDB search fails, so an outage is not read as "no such film"', async () => {
  stub = stubFetch([route('/3/search/movie', () => ({ status: 429, body: { status_message: 'rate limited' } }))]);

  await assert.rejects(verifyFilm('Dark City', 1998), /TMDB/);
});
