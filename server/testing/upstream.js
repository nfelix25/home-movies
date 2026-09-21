// Test-only route builders for stubFetch: the OpenAI endpoint and TMDB's title search.

import { OPENAI_URL } from './openaiFixtures.js';
import { findResult, tmdbSearch } from './tmdbFixtures.js';

export const route = (pathname, respond) => ({ match: (u) => u.pathname === pathname, respond });
export const ok = (body) => () => ({ body });

export const openAiRoute = (respond) => ({
  match: (u, init) => u.href === OPENAI_URL && init.method === 'POST',
  respond,
});

/** What TMDB "finds" for each title the fake model recommends; anything else finds nothing. */
const SEARCH = {
  'Dark City': [findResult({ id: 2666, title: 'Dark City', release_date: '1998-02-27' })],
  'ghost in the shell': [findResult({ id: 9323, title: 'Ghost in the Shell', release_date: '1995-11-18' })],
  Equilibrium: [findResult({ id: 6978, title: 'Equilibrium', release_date: '2002-12-06' })],
  'The Matrix': [findResult({ id: 603, title: 'The Matrix', release_date: '1999-03-30' })],
  'Blade Runner': [findResult({ id: 78, title: 'Blade Runner', release_date: '1982-06-25' })],
  Akira: [findResult({ id: 149, title: 'Akira', release_date: '1988-07-16' })],
};

export const tmdbSearchRoute = {
  match: (u) => u.pathname === '/3/search/movie',
  respond: (u) => ({ body: tmdbSearch(SEARCH[u.searchParams.get('query')] ?? []) }),
};
