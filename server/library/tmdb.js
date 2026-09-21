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
