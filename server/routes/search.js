import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const YTS_BASE_URL = 'https://yts.mx/api/v2/list_movies.json';
const YTS_DEFAULT_SORT = 'download_count';
const TRACKERS = [
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.coppersurfer.tk:6969/announce'
];

router.get('/movies', async (req, res) => {
  try {
    const { q, genre, page = '1', sort } = req.query;
    const searchParams = new URLSearchParams();

    searchParams.set('page', page);
    searchParams.set('sort_by', typeof sort === 'string' && sort.trim() ? sort : YTS_DEFAULT_SORT);

    if (q) {
      searchParams.set('query_term', q);
    }

    if (genre) {
      searchParams.set('genre', genre);
    }

    const response = await fetch(`${YTS_BASE_URL}?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`YTS responded with status ${response.status}`);
    }

    const payload = await response.json();

    if (payload.status !== 'ok') {
      throw new Error(`YTS API error: ${payload.status_message || 'unknown error'}`);
    }

    const movies = Array.isArray(payload.data?.movies)
      ? payload.data.movies.map(mapMovie)
      : [];

    res.json({ movies });
  } catch (error) {
    console.error('Failed to fetch YTS movies', error);
    res.status(502).json({ error: 'Unable to fetch movies from YTS at this time.' });
  }
});

router.get('/tv', async (req, res) => {
  res.status(501).json({ error: 'TV search not implemented yet' });
});

function mapMovie(movie) {
  return {
    id: movie.id,
    title: movie.title_long || movie.title,
    year: movie.year,
    rating: movie.rating,
    poster: movie.large_cover_image || movie.medium_cover_image || null,
    torrents: Array.isArray(movie.torrents)
      ? movie.torrents.map((torrent) => ({
          quality: torrent.quality,
          magnet: buildMagnetLink(torrent.hash, movie.title)
        }))
      : []
  };
}

function buildMagnetLink(hash, title) {
  const base = `magnet:?xt=urn:btih:${hash}`;
  const dn = title ? `&dn=${encodeURIComponent(title)}` : '';
  const trackerParams = TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join('');
  return `${base}${dn}${trackerParams}`;
}

export default router;
