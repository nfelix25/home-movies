import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const YTS_BASE_URL = 'https://movies-api.accel.li/api/v2/list_movies.json';
const YTS_DEFAULT_SORT = 'download_count';
const TRACKERS = [
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://open.stealth.si:80/announce',
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

    const response = await fetch(`${YTS_BASE_URL}?${searchParams.toString()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; home-movies/1.0)' }
    });

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
  try {
    const { q = '' } = req.query;
    if (!q.trim()) {
      return res.json({ seasons: [] });
    }

    // Use ThePirateBay API (cat 205 = TV shows) — EZTV's keywords filter is non-functional
    const response = await fetch(
      `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=205`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; home-movies/1.0)' } }
    );

    if (!response.ok) {
      throw new Error(`Search API responded with status ${response.status}`);
    }

    const data = await response.json();
    // apibay returns [{"id":"0",...}] with a single zero-id entry when no results found
    const torrents = Array.isArray(data) ? data.filter((t) => t.id !== '0') : [];
    const grouped = groupEpisodesBySeason(torrents, true);

    res.json({ seasons: grouped });
  } catch (error) {
    console.error('Failed to fetch TV episodes', error);
    res.status(502).json({ error: 'Unable to fetch TV episodes at this time.' });
  }
});

function groupEpisodesBySeason(torrents, isTPB = false) {
  const seasonsMap = new Map();
  const unknownKey = 'unknown';

  for (const torrent of torrents) {
    // Support both EZTV shape and ThePirateBay shape
    const title = isTPB ? torrent.name : (torrent.title || torrent.episode_title);
    const magnet = isTPB
      ? buildMagnetLink(torrent.info_hash, torrent.name)
      : torrent.magnet_url;
    const seeds = isTPB ? Number(torrent.seeders) : Number(torrent.seeds);

    const { season, episode } = parseSeasonEpisode(title);
    const key = season ?? unknownKey;

    if (!seasonsMap.has(key)) {
      seasonsMap.set(key, []);
    }

    seasonsMap.get(key).push({
      episode: episode ?? null,
      title,
      magnet,
      seeds: seeds || 0
    });
  }

  const seasons = [];

  for (const [key, episodes] of seasonsMap.entries()) {
    const sortedEpisodes = episodes.sort((a, b) => {
      if (a.episode === null) return 1;
      if (b.episode === null) return -1;
      return a.episode - b.episode;
    });

    seasons.push({
      season: key === unknownKey ? 'Unknown' : Number(key),
      episodes: sortedEpisodes
    });
  }

  return seasons
    .sort((a, b) => {
      if (a.season === 'Unknown') return 1;
      if (b.season === 'Unknown') return -1;
      return b.season - a.season;
    })
    .map((seasonGroup) => {
      // ensure numeric seasons stay numbers, unknown stays string
      if (seasonGroup.season !== 'Unknown') {
        return { ...seasonGroup, season: Number(seasonGroup.season) };
      }
      return seasonGroup;
    });
}

function parseSeasonEpisode(title = '') {
  const match = title.match(/S(\d{1,2})E(\d{1,3})/i);
  if (!match) {
    return { season: null, episode: null };
  }

  return {
    season: Number(match[1]),
    episode: Number(match[2])
  };
}

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
