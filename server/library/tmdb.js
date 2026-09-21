import fs from 'node:fs';
import path from 'node:path';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

let apiKey = null;
let enabled = false;

function init() {
  apiKey = process.env.TMDB_API_KEY || null;
  if (!apiKey) {
    console.warn('[tmdb] TMDB_API_KEY not set — metadata lookups disabled');
    return;
  }
  enabled = true;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbFetch(endpoint) {
  if (!enabled) return null;
  const url = `${TMDB_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  return res.json();
}

/** Find a movie by IMDB ID (e.g. "tt0133093") */
export async function findMovieByImdbId(imdbId) {
  const data = await tmdbFetch(`/find/${imdbId}?external_source=imdb_id`);
  const movie = data?.movie_results?.[0];
  if (!movie) return null;
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    posterPath: movie.poster_path || null,
  };
}

/** Search for a movie by title and year */
export async function searchMovie(title, year) {
  const q = encodeURIComponent(title);
  const data = await tmdbFetch(`/search/movie?query=${q}${year ? `&year=${year}` : ''}`);
  const movie = data?.results?.[0];
  if (!movie) return null;
  return {
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    posterPath: movie.poster_path || null,
  };
}

/** Search for a TV show by name, return top result */
export async function searchShow(name) {
  const q = encodeURIComponent(name);
  const data = await tmdbFetch(`/search/tv?query=${q}`);
  const show = data?.results?.[0];
  if (!show) return null;
  return {
    tmdbId: show.id,
    name: show.name,
    posterPath: show.poster_path || null,
  };
}

/** Fetch episode detail from TMDB */
export async function getEpisode(showId, season, episode) {
  const data = await tmdbFetch(`/tv/${showId}/season/${season}/episode/${episode}`);
  if (!data) return null;
  return {
    title: data.name || null,
    airDate: data.air_date || null,
  };
}

export function isTmdbEnabled() {
  return enabled;
}

const FACTS_TTL_MS = 10 * 60 * 1000;
const factsMemo = new Map();

/**
 * Full facts for the film-details popup, or null when TMDB has no match.
 * Rejects when TMDB itself fails, so an outage is not reported as "no match".
 * The popup asks for facts and insights at the same moment and both need these,
 * so lookups are shared for a few minutes. Failures and misses are never kept.
 */
export function getMovieFacts({ imdbId = null, title = null, year = null }) {
  const key = imdbId || `${title}|${year}`;
  const cached = factsMemo.get(key);
  if (cached && Date.now() - cached.at < FACTS_TTL_MS) return cached.promise;

  const promise = fetchMovieFacts({ imdbId, title, year });
  factsMemo.set(key, { promise, at: Date.now() });
  const forget = () => {
    if (factsMemo.get(key)?.promise === promise) factsMemo.delete(key);
  };
  promise.then((facts) => facts === null && forget(), forget);
  return promise;
}

async function fetchMovieFacts({ imdbId, title, year }) {
  let tmdbId = null;
  if (imdbId) tmdbId = (await findMovieByImdbId(imdbId))?.tmdbId ?? null;
  if (!tmdbId && title) tmdbId = (await searchMovie(title, year))?.tmdbId ?? null;
  if (!tmdbId) return null;

  const raw = await tmdbFetch(`/movie/${tmdbId}?append_to_response=credits,release_dates`);
  if (!raw) throw new Error('TMDB details lookup failed');
  return mapFacts(raw);
}

function mapFacts(raw) {
  return {
    tmdbId: raw.id,
    imdbId: raw.imdb_id,
    title: raw.title,
    year: raw.release_date ? Number(raw.release_date.slice(0, 4)) : null,
    tagline: raw.tagline || null,
    overview: raw.overview || null,
    runtimeMinutes: raw.runtime || null,
    certification: usCertification(raw.release_dates),
    genres: raw.genres.map((g) => g.name),
    directors: raw.credits.crew.filter((c) => c.job === 'Director').map((c) => c.name),
    cast: raw.credits.cast.slice(0, 8).map((c) => ({ name: c.name, character: c.character })),
    releaseDate: raw.release_date || null,
    languages: raw.spoken_languages.map((l) => l.english_name),
    countries: raw.production_countries.map((c) => c.iso_3166_1),
    tmdbScore: raw.vote_count ? Math.round(raw.vote_average * 10) / 10 : null,
    tmdbVoteCount: raw.vote_count,
  };
}

/** First non-empty US certification; premiere-type entries often carry an empty one. */
function usCertification(releaseDates) {
  const us = releaseDates.results.find((r) => r.iso_3166_1 === 'US');
  return us?.release_dates.find((d) => d.certification)?.certification || null;
}

/**
 * Check that a model-suggested film really exists. Searches by title only (a year
 * filter would hide a film the model dated one year off), then accepts the first of
 * the top 5 results whose title matches and whose release year is within 1.
 * Returns TMDB's canonical { tmdbId, title, year }, null if nothing matches, and
 * rejects when TMDB fails so an outage is not read as "no such film".
 */
export async function verifyFilm(title, year) {
  const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(title)}`);
  if (!data) throw new Error('TMDB search failed');

  const wanted = normalizeTitle(title);
  for (const result of data.results.slice(0, 5)) {
    if (!result.release_date) continue;
    const resultYear = Number(result.release_date.slice(0, 4));
    if (!(Math.abs(resultYear - year) <= 1)) continue;
    if (normalizeTitle(result.title) !== wanted) continue;
    return { tmdbId: result.id, title: result.title, year: resultYear };
  }
  return null;
}

function normalizeTitle(title) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Download poster image to destFile; skips if file already exists */
export async function downloadPoster(posterPath, destFile) {
  if (!posterPath || !enabled) return;
  if (fs.existsSync(destFile)) return;
  try {
    const url = `${POSTER_BASE}${posterPath}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    fs.writeFileSync(destFile, Buffer.from(buf));
  } catch (err) {
    console.warn('[tmdb] Failed to download poster:', err.message);
  }
}

init();
