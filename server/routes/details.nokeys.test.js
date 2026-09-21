import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { stubFetch } from '../testing/http.js';
import { startApp } from '../testing/app.js';

// Separate file because tmdb.js decides whether it is enabled when first imported.
delete process.env.TMDB_API_KEY;
const { createDetailsRouter } = await import('./details.js');

let stub;
let app;
beforeEach(async () => {
  stub = stubFetch([]);
  app = await startApp('/api', createDetailsRouter());
});
afterEach(async () => {
  stub.restore();
  await app.close();
});

for (const endpoint of ['facts', 'insights']) {
  test(`GET /details/${endpoint} answers 503 NO_TMDB_KEY when TMDB is not configured, without calling out`, async () => {
    const { status, body } = await app.get(`/api/details/${endpoint}?imdbId=tt0133093&title=The%20Matrix`);

    assert.equal(status, 503);
    assert.equal(body.code, 'NO_TMDB_KEY');
    assert.equal(stub.calls.length, 0);
  });
}
