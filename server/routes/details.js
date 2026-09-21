import { Router } from 'express';
import { getMovieFacts, isTmdbEnabled } from '../library/tmdb.js';
import { getInsights, InsightsError } from '../details/insights.js';

const MAX_TITLE_LENGTH = 200;

/**
 * Read the film identity from the query string. The movie grid sends `title_long`
 * ("The Matrix (1999)"), so a trailing year is stripped, as library.js does.
 */
function parseIdentity(query) {
  const imdbId = typeof query.imdbId === 'string' && query.imdbId ? query.imdbId : null;
  if (imdbId !== null && !/^tt\d{5,10}$/.test(imdbId)) {
    return { error: 'imdbId must look like tt0133093.' };
  }

  const title = typeof query.title === 'string' ? query.title.replace(/\s*\(\d{4}\)\s*$/, '').trim() : '';
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }

  const yearParam = typeof query.year === 'string' ? query.year : '';
  if (yearParam && !/^\d{4}$/.test(yearParam)) {
    return { error: 'year must be a four-digit year.' };
  }

  if (!imdbId && !title) return { error: 'Provide imdbId or title.' };
  return { imdbId, title: title || null, year: yearParam ? Number(yearParam) : null };
}

/** Resolve the film via TMDB, or send the error response and return null. */
async function loadFacts(req, res) {
  const identity = parseIdentity(req.query);
  if (identity.error) {
    res.status(400).json({ error: identity.error });
    return null;
  }
  if (!isTmdbEnabled()) {
    res.status(503).json({ error: 'TMDB_API_KEY is not configured.', code: 'NO_TMDB_KEY' });
    return null;
  }
  try {
    const facts = await getMovieFacts(identity);
    if (!facts) {
      res.status(404).json({ error: 'No TMDB match found for this film.' });
      return null;
    }
    return facts;
  } catch (error) {
    console.error('Failed to fetch film facts', error);
    res.status(502).json({ error: 'Unable to fetch film details from TMDB at this time.' });
    return null;
  }
}

export function createDetailsRouter({ cache } = {}) {
  const router = Router();

  // TMDB facts: fast, so the popup can show them while insights are still generating.
  router.get('/details/facts', async (req, res) => {
    const facts = await loadFacts(req, res);
    if (facts) res.json(facts);
  });

  // OpenAI-written premise, review consensus and recommendations. Slow the first time.
  router.get('/details/insights', async (req, res) => {
    const facts = await loadFacts(req, res);
    if (!facts) return;

    try {
      res.json(await getInsights(facts, { refresh: req.query.refresh === '1', cache }));
    } catch (error) {
      if (error instanceof InsightsError && error.code === 'NO_KEY') {
        return res.status(503).json({
          error: 'Add OPEN_AI_API_KEY to .env and restart the server to enable summaries.',
          code: 'NO_KEY',
        });
      }
      console.error('Failed to generate film insights', error);
      const message =
        error instanceof InsightsError ? error.message : 'Unable to generate film insights at this time.';
      res.status(502).json({ error: message });
    }
  });

  return router;
}

export default createDetailsRouter();
