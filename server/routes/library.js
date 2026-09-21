import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import {
  addDownload,
  addToIndex,
  removeDownload,
  removeFromIndex,
  getFromIndex,
  hasItem,
  getItem,
  listAllItems,
  getDownloadFile,
  getDownload,
  waitForFile,
} from '../library/manager.js';
import { findMovieByImdbId, searchMovie, searchShow, getEpisode, downloadPoster } from '../library/tmdb.js';

const router = Router();

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.ts': 'video/mp2t',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
};

function getMimeType(filename) {
  return MIME_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

// ── POST /api/library/add ──────────────────────────────────────────────────────

router.post('/library/add', async (req, res) => {
  const { magnet, metadata: clientMeta } = req.body;

  if (!magnet || typeof magnet !== 'string' || !magnet.startsWith('magnet:')) {
    return res.status(400).json({ error: 'A valid magnet link is required.' });
  }
  if (!clientMeta || typeof clientMeta !== 'object') {
    return res.status(400).json({ error: 'metadata object is required.' });
  }

  const libraryRoot = process.env.LIBRARY_ROOT;
  const { type } = clientMeta;

  // Resolve library ID via TMDB
  let id = null;
  let tmdbPosterPath = null;
  let libraryDir = null;

  try {
    if (type === 'movie') {
      const { year, imdbId } = clientMeta;
      const title = String(clientMeta.title).replace(/\s*\(\d{4}\)\s*$/, '').trim();
      let tmdbResult = imdbId ? await findMovieByImdbId(imdbId) : null;
      if (!tmdbResult) tmdbResult = await searchMovie(title, year);
      id = tmdbResult ? `movie-${tmdbResult.tmdbId}` : `movie-local-${slugify(title + '-' + year)}`;
      tmdbPosterPath = tmdbResult?.posterPath || null;
      libraryDir = path.join(libraryRoot, 'movies', `${title} (${year})`);
    } else if (type === 'tv') {
      const { showTitle, season, episode } = clientMeta;
      const showResult = await searchShow(showTitle);
      if (showResult) {
        const ss = String(season).padStart(2, '0');
        const ee = String(episode).padStart(2, '0');
        id = `tv-${showResult.tmdbId}-s${ss}e${ee}`;
        tmdbPosterPath = showResult.posterPath || null;
      } else {
        id = `tv-local-${slugify(showTitle + '-s' + season + 'e' + episode)}`;
      }
      libraryDir = path.join(libraryRoot, 'tv', showTitle, `Season ${String(season).padStart(2, '0')}`);
    } else {
      return res.status(400).json({ error: 'metadata.type must be "movie" or "tv".' });
    }
  } catch (err) {
    console.error('[library/add] TMDB lookup failed:', err.message);
    id = `local-${Date.now()}`;
    libraryDir = path.join(libraryRoot, type === 'tv' ? 'tv' : 'movies', id);
  }

  // Idempotency — already in library
  if (hasItem(id)) {
    const existing = getItem(id);
    return res.json({ id, streamUrl: `/api/library/${id}/stream` });
  }

  // Create folder and write metadata.json
  fs.mkdirSync(libraryDir, { recursive: true });

  const metadata = {
    id,
    type,
    status: 'downloading',
    magnet,
    addedAt: new Date().toISOString(),
    posterPath: tmdbPosterPath ? 'poster.jpg' : (clientMeta.poster ? null : null),
    ...clientMeta,
  };
  // Override status from clientMeta
  metadata.status = 'downloading';

  const metaPath = type === 'tv'
    ? path.join(libraryDir, `s${String(clientMeta.season).padStart(2,'0')}e${String(clientMeta.episode).padStart(2,'0')}.json`)
    : path.join(libraryDir, 'metadata.json');

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  // Start download
  addDownload(id, magnet, libraryDir, metadata);

  // Download poster async (non-blocking)
  if (tmdbPosterPath) {
    const posterDest = type === 'tv'
      ? path.join(libraryRoot, 'tv', clientMeta.showTitle, 'poster.jpg')
      : path.join(libraryDir, 'poster.jpg');
    downloadPoster(tmdbPosterPath, posterDest).catch(() => {});
  } else if (clientMeta.poster) {
    // Use the poster URL from YTS — download it
    const posterDest = path.join(libraryDir, 'poster.jpg');
    fetchAndSavePoster(clientMeta.poster, posterDest).catch(() => {});
    metadata.posterPath = 'poster.jpg';
  }

  res.json({ id, streamUrl: `/api/library/${id}/stream` });
});

async function fetchAndSavePoster(url, destFile) {
  if (fs.existsSync(destFile)) return;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    fs.writeFileSync(destFile, Buffer.from(buf));
  } catch {}
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── GET /api/library ──────────────────────────────────────────────────────────

router.get('/library', (req, res) => {
  const libraryRoot = process.env.LIBRARY_ROOT || '';
  const items = listAllItems().map((item) => {
    const posterPath = item.metadata.posterPath
      ? path.join(item.libraryDir, item.metadata.posterPath)
      : null;
    const posterUrl = posterPath
      ? '/library/' + path.relative(libraryRoot, posterPath).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')
      : (item.metadata.poster || null);

    return {
      id: item.id,
      title: item.metadata.title || item.metadata.showTitle || '',
      showTitle: item.metadata.showTitle || null,
      season: item.metadata.season || null,
      episode: item.metadata.episode || null,
      year: item.metadata.year || null,
      type: item.metadata.type || 'movie',
      status: item.status,
      progress: item.progress,
      posterUrl,
      streamUrl: `/api/library/${item.id}/stream`,
    };
  });

  res.json({ items });
});

// ── DELETE /api/library/:id ───────────────────────────────────────────────────

router.delete('/library/:id', (req, res) => {
  const { id } = req.params;

  const download = getDownload(id);
  const indexed = getFromIndex(id);

  if (!download && !indexed) {
    return res.status(404).json({ error: 'Item not found in library.' });
  }

  if (download) {
    removeDownload(id);
    if (download.libraryDir && fs.existsSync(download.libraryDir)) {
      fs.rmSync(download.libraryDir, { recursive: true, force: true });
    }
  } else if (indexed) {
    removeFromIndex(id);
    if (indexed.libraryDir && fs.existsSync(indexed.libraryDir)) {
      fs.rmSync(indexed.libraryDir, { recursive: true, force: true });
    }
  }

  res.json({ ok: true });
});

// ── GET /api/library/:id/stream ───────────────────────────────────────────────

router.get('/library/:id/stream', async (req, res) => {
  const { id } = req.params;

  const download = getDownload(id);
  const indexed = getFromIndex(id);

  if (!download && !indexed) {
    return res.status(404).json({ error: 'Item not found in library.' });
  }

  // Resolve file info
  let filePath = null;
  let fileSize = null;
  let contentType = null;
  let wtFile = null; // WebTorrent file object (if still downloading)

  if (download && download.status === 'downloading' && download.torrent) {
    wtFile = getDownloadFile(id);
    if (!wtFile) {
      try {
        wtFile = await waitForFile(id);
      } catch (err) {
        return res.status(503).json({ error: 'Timed out waiting for torrent metadata.' });
      }
    }
    fileSize = wtFile.length;
    contentType = getMimeType(wtFile.name);
  } else {
    filePath = (download || indexed).filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on disk.' });
    }
    fileSize = fs.statSync(filePath).size;
    contentType = getMimeType(filePath);
  }

  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const stream = wtFile
      ? wtFile.createReadStream({ start, end })
      : fs.createReadStream(filePath, { start, end });

    stream.on('error', () => {});
    stream.pipe(res);
    req.on('close', () => stream.destroy());
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    const stream = wtFile
      ? wtFile.createReadStream()
      : fs.createReadStream(filePath);

    stream.on('error', () => {});
    stream.pipe(res);
    req.on('close', () => stream.destroy());
  }
});

export default router;
