import { getCollectionMemberIds, verifyFilm } from '../library/tmdb.js';
import { defaultCache } from './cache.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = 90_000;

// The model is asked for a few more films than are shown, because verification drops some.
const MORE_LIKE_THIS_MAX = 6;
const IF_YOU_LIKED_MAX = 5;
const MAX_SOURCES = 8;
const SCORE_KINDS = ['critics', 'audience'];

/** code: 'NO_KEY' (OpenAI key not configured) or 'UPSTREAM' (OpenAI/TMDB failed or returned junk). */
export class InsightsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InsightsError';
    this.code = code;
  }
}

export function checkInsightsConfig() {
  if (!process.env.OPEN_AI_API_KEY) {
    console.warn('[insights] OPEN_AI_API_KEY not set — film details will show facts only');
  }
}

// ── Prompt and schema ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You write spoiler-free pre-viewing guides for films. Use web search to ground everything you say about how the film was received; do not rely on memory for reviews or scores.

Rules:
- premise: 2-4 sentences (about 80 words at most) describing the protagonist, the disruption to their life and the choice they face. Nothing that happens after the first act, and no deaths or endings. Never say who or what is behind the mystery, what the world turns out to be, or what the truth is, even when it is revealed early or shown in trailers. Right: "A lighthouse keeper begins hearing a voice in the storm." Wrong: "A lighthouse keeper learns the voice is his drowned wife."
- reviews.critics and reviews.audience: about 60 words each, summarising the consensus among professional critics and among general audiences. Never quote or paraphrase anything that reveals plot. Use an empty string if you find no reviews.
- reviews.praised and reviews.criticized: up to 3 short points each (12 words or fewer), with no plot details.
- reviews.scores: include a score only if a search result you read states it explicitly (for example Rotten Tomatoes 83%, Metacritic 73/100, IMDb 8.7/10). Use the site name as source and the value exactly as shown. Set kind to "critics" for critic scores (Tomatometer, Metascore) and "audience" for audience or user scores (Popcornmeter, user score), one entry per score. If none are stated, return an empty array. Never estimate or recall a score from memory. Do not include TMDB or IMDb scores; those are shown separately.
- moreLikeThis: 7 real, released feature films that closely resemble this one in tone, genre and premise.
- ifYouLiked: 6 well-known, real, released feature films whose fans would likely enjoy this one, so someone who loved them can decide whether to watch it.
- Across both lists, never include this film or its sequels, prequels, remakes or other franchise entries, and never list the same film twice.
- For every recommendation give the title as commonly released in English, the release year, and a reason of 20 words or fewer that spoils neither film.
- Only recommend films you are certain exist.`;

const recommendationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'year', 'reason'],
  properties: {
    title: { type: 'string' },
    year: { type: 'integer' },
    reason: { type: 'string' },
  },
};

const stringList = { type: 'array', items: { type: 'string' } };

const INSIGHTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['premise', 'reviews', 'moreLikeThis', 'ifYouLiked'],
  properties: {
    premise: { type: 'string' },
    reviews: {
      type: 'object',
      additionalProperties: false,
      required: ['critics', 'audience', 'praised', 'criticized', 'scores'],
      properties: {
        critics: { type: 'string' },
        audience: { type: 'string' },
        praised: stringList,
        criticized: stringList,
        scores: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['source', 'kind', 'value'],
            properties: {
              source: { type: 'string' },
              kind: { type: 'string', enum: SCORE_KINDS },
              value: { type: 'string' },
            },
          },
        },
      },
    },
    moreLikeThis: { type: 'array', items: recommendationSchema },
    ifYouLiked: { type: 'array', items: recommendationSchema },
  },
};

function buildPrompt(facts, today) {
  return [
    `Film: ${facts.title}${facts.year ? ` (${facts.year})` : ''}`,
    facts.imdbId && `IMDb ID: ${facts.imdbId}`,
    facts.directors.length > 0 && `Directed by: ${facts.directors.join(', ')}`,
    facts.cast.length > 0 && `Starring: ${facts.cast.map((c) => c.name).join(', ')}`,
    facts.genres.length > 0 && `Genres: ${facts.genres.join(', ')}`,
    facts.overview &&
      `Synopsis from TMDB (may contain spoilers; use it only to identify the film): ${facts.overview}`,
    `Today's date: ${today}`,
    '',
    'Research this film and write the guide.',
  ]
    .filter((line) => line !== false && line != null)
    .join('\n');
}

// ── OpenAI call ─────────────────────────────────────────────────────────────

async function callOpenAI({ model, facts, today }, { apiKey, timeoutMs }) {
  const body = {
    model,
    // Web search quality drops at effort "none" for the 5.4 family.
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' }],
    // Forces a real search, so the model cannot answer reviews from stale memory.
    tool_choice: 'required',
    // Lists every page the search consulted, so sources exist even if the model does not cite.
    include: ['web_search_call.action.sources'],
    instructions: SYSTEM_PROMPT,
    input: buildPrompt(facts, today),
    text: { format: { type: 'json_schema', name: 'film_insights', strict: true, schema: INSIGHTS_SCHEMA } },
  };

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw await httpError(res);
    return await res.json();
  } catch (err) {
    if (err instanceof InsightsError) throw err;
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new InsightsError('UPSTREAM', 'OpenAI request timed out.');
    }
    throw new InsightsError('UPSTREAM', `Could not reach OpenAI: ${err?.message ?? err}`);
  }
}

async function httpError(res) {
  const detail = await res.json().catch(() => null);
  const message = detail?.error?.message;
  // 401 messages echo part of the key, so they are replaced, never passed through.
  if (res.status === 401) {
    return new InsightsError('UPSTREAM', 'OpenAI rejected the API key. Check OPEN_AI_API_KEY.');
  }
  if (res.status === 429) {
    return new InsightsError('UPSTREAM', 'OpenAI rate limit or quota reached. Try again shortly.');
  }
  const suffix = message ? `: ${String(message).slice(0, 200)}` : '';
  return new InsightsError('UPSTREAM', `OpenAI request failed (${res.status})${suffix}`);
}

// ── Parsing and validation ──────────────────────────────────────────────────

/**
 * Pull the JSON payload, the real sources and the number of web searches out of a Responses
 * API result. `searches` lets the popup flag a result that was written without searching.
 */
export function parseResponse(response) {
  if (response?.status !== 'completed') {
    const why = response?.incomplete_details?.reason ?? response?.error?.message ?? response?.status ?? 'unknown';
    throw new InsightsError('UPSTREAM', `OpenAI did not finish the response (${why}).`);
  }

  const parts = (response.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? []);

  const refusal = parts.find((part) => part.type === 'refusal');
  if (refusal) throw new InsightsError('UPSTREAM', `OpenAI declined the request: ${refusal.refusal}`);

  const textParts = parts.filter((part) => part.type === 'output_text');
  if (textParts.length === 0) throw new InsightsError('UPSTREAM', 'OpenAI returned no text output.');

  let data;
  try {
    data = JSON.parse(textParts.map((part) => part.text).join(''));
  } catch {
    throw new InsightsError('UPSTREAM', 'OpenAI returned output that is not valid JSON.');
  }
  const searches = (response.output ?? []).filter((item) => item.type === 'web_search_call').length;
  return { data, sources: collectSources(response, textParts), searches };
}

/**
 * Sources come from the API itself, never from model-written fields: first the pages the model
 * cited (they carry titles), then every page the searches consulted, which covers a model that
 * did not cite inline. Capped so a long search does not bury the cited pages.
 */
function collectSources(response, textParts) {
  const sources = new Map();
  const add = (rawUrl, title) => {
    const url = cleanUrl(rawUrl);
    if (url && !sources.has(url)) sources.set(url, title ? { title, url } : { url });
  };

  for (const part of textParts) {
    for (const annotation of part.annotations ?? []) {
      if (annotation.type === 'url_citation') add(annotation.url, annotation.title);
    }
  }
  for (const item of response.output ?? []) {
    if (item.type !== 'web_search_call') continue;
    for (const source of item.action?.sources ?? []) add(source.url);
  }
  return [...sources.values()].slice(0, MAX_SOURCES);
}

/** http(s) only, because the popup renders these as links; utm_* tracking removed. */
function cleanUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_')) url.searchParams.delete(key);
  }
  return url.toString();
}

// A URL in a markdown link may contain one level of parentheses, e.g. .../The_Matrix_(film)
const MARKDOWN_URL = String.raw`\((?:[^()\s]|\([^()\s]*\))+\)`;
const MARKDOWN_LINK = String.raw`\[[^\]]*\]${MARKDOWN_URL}`;
const CITATION = new RegExp(String.raw`\s*\(\s*${MARKDOWN_LINK}(?:\s*[,;]\s*${MARKDOWN_LINK})*\s*\)`, 'g');
const INLINE_LINK = new RegExp(String.raw`\[([^\]]*)\]${MARKDOWN_URL}`, 'g');

/**
 * With web search on, the model appends "([site](https://…))" to sentences even when told not
 * to. Sources are listed separately, so citations are dropped from the prose and any other
 * markdown link is reduced to its text.
 */
function stripLinks(value) {
  return value.replace(CITATION, '').replace(INLINE_LINK, '$1');
}

/**
 * Check the model's JSON has the shape the popup renders, clean links out of its text, and
 * trim review lists to their display caps. List lengths are enforced here, not by the schema.
 */
export function validateInsights(data) {
  const bad = (path, want) => {
    throw new InsightsError('UPSTREAM', `OpenAI returned invalid insights: ${path} should be ${want}.`);
  };
  const text = (value, path) => (typeof value === 'string' ? stripLinks(value).trim() : bad(path, 'a string'));
  const str = (value, path) => text(value, path) || bad(path, 'a non-empty string');
  const list = (value, path, each) =>
    Array.isArray(value) ? value.map((item, i) => each(item, `${path}[${i}]`)) : bad(path, 'an array');
  const recommendation = (r, path) => ({
    title: str(r?.title, `${path}.title`),
    year: Number.isInteger(r?.year) ? r.year : bad(`${path}.year`, 'an integer'),
    reason: str(r?.reason, `${path}.reason`),
  });

  const reviews = data?.reviews;
  return {
    premise: str(data?.premise, 'premise'),
    reviews: {
      critics: text(reviews?.critics, 'reviews.critics'),
      audience: text(reviews?.audience, 'reviews.audience'),
      praised: list(reviews?.praised, 'reviews.praised', str).slice(0, 3),
      criticized: list(reviews?.criticized, 'reviews.criticized', str).slice(0, 3),
      scores: list(reviews?.scores, 'reviews.scores', (score, path) => ({
        source: str(score?.source, `${path}.source`),
        kind: SCORE_KINDS.includes(score?.kind) ? score.kind : bad(`${path}.kind`, '"critics" or "audience"'),
        value: str(score?.value, `${path}.value`),
      })).slice(0, 4),
    },
    moreLikeThis: list(data?.moreLikeThis, 'moreLikeThis', recommendation),
    ifYouLiked: list(data?.ifYouLiked, 'ifYouLiked', recommendation),
  };
}

const filmKey = (film) => `${film.title}|${film.year}`;

/**
 * Keep only recommendations that `verify` (a TMDB lookup) confirms are real films, using the
 * canonical title and year it returns. Drops the film itself, its franchise (`franchiseTmdbIds`,
 * since the prompt alone does not keep sequels out), repeats, and anything already shown in
 * `alsoShown` (the other list), then caps the list.
 * Rejects if verification fails, so an outage is not mistaken for "every film is invented".
 */
export async function verifyRecommendations(
  recs,
  { verify, selfTmdbId, franchiseTmdbIds = [], max, alsoShown = [] }
) {
  const verified = await Promise.all(recs.map((rec) => verify(rec.title, rec.year)));
  const seen = new Set([selfTmdbId, ...franchiseTmdbIds]);
  const shownElsewhere = new Set(alsoShown.map(filmKey));
  const kept = [];
  recs.forEach((rec, i) => {
    const hit = verified[i];
    if (!hit || seen.has(hit.tmdbId) || shownElsewhere.has(filmKey(hit))) return;
    seen.add(hit.tmdbId);
    kept.push({ title: hit.title, year: hit.year, reason: rec.reason });
  });
  return kept.slice(0, max);
}

// ── Orchestration ───────────────────────────────────────────────────────────

const inFlight = new Map();

/**
 * Spoiler-free premise, review consensus and recommendations for a film.
 * Served from the cache when fresh (unless `refresh`); otherwise generated once, even if
 * several requests arrive together. A failed generation never touches the cache.
 */
export async function getInsights(
  facts,
  { refresh = false, cache = defaultCache(), timeoutMs = DEFAULT_TIMEOUT_MS, now = () => new Date() } = {}
) {
  if (!refresh) {
    const cached = cache.get(facts.tmdbId);
    if (cached) return cached;
  }

  const apiKey = process.env.OPEN_AI_API_KEY;
  if (!apiKey) throw new InsightsError('NO_KEY', 'OPEN_AI_API_KEY is not set.');

  const running = inFlight.get(facts.tmdbId);
  if (running) return running;

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const promise = generate(facts, { apiKey, model, timeoutMs, now })
    .then((insights) => {
      try {
        cache.set(facts.tmdbId, insights);
      } catch (err) {
        // The insights were paid for; don't lose them because the disk is unhappy.
        console.warn('[insights] Could not write cache:', err.message);
      }
      return insights;
    })
    .finally(() => inFlight.delete(facts.tmdbId));
  inFlight.set(facts.tmdbId, promise);
  return promise;
}

async function generate(facts, { apiKey, model, timeoutMs, now }) {
  const today = now().toISOString().slice(0, 10);
  const response = await callOpenAI({ model, facts, today }, { apiKey, timeoutMs });
  const { data, sources, searches } = parseResponse(response);
  const insights = validateInsights(data);

  let moreLikeThis;
  let ifYouLiked;
  try {
    const franchiseTmdbIds = facts.collectionId ? await getCollectionMemberIds(facts.collectionId) : [];
    // One after the other: the second list must skip whatever the first ended up showing.
    moreLikeThis = await verifyRecommendations(insights.moreLikeThis, {
      verify: verifyFilm,
      selfTmdbId: facts.tmdbId,
      franchiseTmdbIds,
      max: MORE_LIKE_THIS_MAX,
    });
    ifYouLiked = await verifyRecommendations(insights.ifYouLiked, {
      verify: verifyFilm,
      selfTmdbId: facts.tmdbId,
      franchiseTmdbIds,
      max: IF_YOU_LIKED_MAX,
      alsoShown: moreLikeThis,
    });
  } catch (err) {
    throw new InsightsError('UPSTREAM', `Could not verify recommendations with TMDB (${err.message}).`);
  }

  return {
    premise: insights.premise,
    reviews: insights.reviews,
    moreLikeThis,
    ifYouLiked,
    sources,
    searches,
    generatedAt: now().toISOString(),
    model,
  };
}
