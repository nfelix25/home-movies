import path from 'node:path';
import { Router } from 'express';
import WebTorrent from 'webtorrent';

const router = Router();
const client = new WebTorrent();

const GRACE_PERIOD_MS = 30 * 1000;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

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

/** Currently active torrent state */
let active = null; // { torrent, cleanupTimer }

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

/** Destroy the active torrent and delete its temp files */
function destroyActive() {
  return new Promise((resolve) => {
    if (!active) return resolve();
    if (active.cleanupTimer) clearTimeout(active.cleanupTimer);
    const { torrent } = active;
    active = null;
    torrent.destroy({ destroyStore: true }, resolve);
  });
}

/** Schedule cleanup after 30-second grace period */
function scheduleCleanup() {
  if (!active) return;
  active.cleanupTimer = setTimeout(async () => {
    await destroyActive();
  }, GRACE_PERIOD_MS);
}

// 5.1 + 5.2 + 5.3: Start streaming from a magnet link
router.post('/api/stream', async (req, res) => {
  const { magnet } = req.body;

  if (!magnet || typeof magnet !== 'string' || !magnet.startsWith('magnet:')) {
    return res.status(400).json({ error: 'A valid magnet link is required.' });
  }

  // Stop any existing active torrent immediately
  await destroyActive();

  try {
    const torrent = await new Promise((resolve, reject) => {
      const t = client.add(magnet);
      t.once('metadata', () => resolve(t));
      t.once('error', reject);
    });

    // Auto-select the largest file (almost always the video)
    const { files } = torrent;
    const largestFile = files.reduce((max, f) => (f.length > max.length ? f : max), files[0]);
    const fileIndex = files.indexOf(largestFile);

    active = { torrent, cleanupTimer: null };

    res.json({
      streamUrl: `/stream/${torrent.infoHash}/${fileIndex}`,
      infoHash: torrent.infoHash,
    });
  } catch (err) {
    console.error('Failed to add torrent:', err);
    res.status(500).json({ error: 'Failed to load torrent. Check the magnet link.' });
  }
});

// 5.4 + 5.5 + 5.6 + 5.7 + 5.8: Serve file as HTTP range-request stream
router.get('/stream/:infoHash/:fileIndex', (req, res) => {
  const { infoHash, fileIndex } = req.params;

  if (!active || active.torrent.infoHash !== infoHash) {
    return res.status(404).json({ error: 'No active torrent matching that infoHash.' });
  }

  const { torrent } = active;
  const file = torrent.files[Number(fileIndex)];

  if (!file) {
    return res.status(404).json({ error: 'File index not found in torrent.' });
  }

  // 5.7: Cancel any pending cleanup — client reconnected within grace period
  if (active.cleanupTimer) {
    clearTimeout(active.cleanupTimer);
    active.cleanupTimer = null;
  }

  const fileSize = file.length;
  const contentType = getMimeType(file.name);
  const rangeHeader = req.headers.range;

  let stream;

  // 5.5: Handle HTTP range requests
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

    stream = file.createReadStream({ start, end });
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    stream = file.createReadStream();
  }

  // 5.8: Inactivity timeout — close connection if no bytes transferred for 10 minutes
  let inactivityTimer = setTimeout(() => res.end(), INACTIVITY_TIMEOUT_MS);
  stream.on('data', () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => res.end(), INACTIVITY_TIMEOUT_MS);
  });
  stream.on('end', () => clearTimeout(inactivityTimer));
  stream.on('error', () => clearTimeout(inactivityTimer));

  stream.pipe(res);

  // 5.6: Start grace period cleanup when connection closes
  req.on('close', () => {
    stream.destroy();
    clearTimeout(inactivityTimer);
    scheduleCleanup();
  });
});

export default router;
