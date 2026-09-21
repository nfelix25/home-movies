// Live check of the film-insights call against the real TMDB and OpenAI APIs.
//
//   npm --prefix server run smoke:insights -- "The Matrix" 1999
//
// Needs TMDB_API_KEY and OPEN_AI_API_KEY in the repo-root .env. Makes one paid OpenAI call and
// uses a throwaway cache, so nothing is written to server/cache. If OpenAI rejects the request
// shape (for example strict JSON schema combined with web search), its error is printed as-is.
import '../env.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getMovieFacts } from '../library/tmdb.js';
import { createCache } from './cache.js';
import { getInsights, InsightsError } from './insights.js';

const title = process.argv[2] ?? 'The Matrix';
const year = process.argv[3] ? Number(process.argv[3]) : 1999;

const facts = await getMovieFacts({ title, year });
if (!facts) {
  console.error(`TMDB has no match for "${title}" (${year}).`);
  process.exit(1);
}
console.log(`Facts: ${facts.title} (${facts.year}), ${facts.runtimeMinutes} min, directed by ${facts.directors.join(', ')}`);
console.log(`Generating insights with ${process.env.OPENAI_MODEL || 'gpt-5.4-mini'} (web search can take a while)...`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-smoke-'));
const started = Date.now();
try {
  const insights = await getInsights(facts, { refresh: true, cache: createCache({ dir }) });
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  console.log(JSON.stringify(insights, null, 2));
  console.log(
    `\nSummary: ${insights.moreLikeThis.length} more-like-this, ${insights.ifYouLiked.length} if-you-liked, ` +
      `${insights.reviews.scores.length} scores, ${insights.sources.length} sources`
  );
  if (insights.sources.length === 0) {
    console.warn('WARNING: no citations came back, so web search may not have run.');
  }
} catch (err) {
  if (!(err instanceof InsightsError)) throw err;
  console.error(`\n${err.code}: ${err.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
