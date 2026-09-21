import fs from 'node:fs';
import path from 'node:path';
import WebTorrent from 'webtorrent';

const client = new WebTorrent();

/**
 * downloads: Map<libraryId, DownloadEntry>
 * Active torrents being downloaded to the library.
 *
 * DownloadEntry shape:
 * {
 *   id,           // library item ID (e.g. "movie-603")
 *   infoHash,     // torrent infoHash (set after metadata event)
 *   torrent,      // WebTorrent Torrent object; null when complete
 *   status,       // 'downloading' | 'complete' | 'error'
 *   libraryDir,   // absolute path to the item's library folder
 *   filePath,     // absolute path to the video file (set after metadata event)
 *   fileIndex,    // index of the target file in torrent.files
 *   metadata,     // in-memory copy of metadata.json contents
 * }
 */
const downloads = new Map();

/**
 * libraryIndex: Map<libraryId, IndexEntry>
 * Complete items with no active torrent (served from disk).
 *
 * IndexEntry shape:
 * { id, filePath, libraryDir, metadata }
 */
const libraryIndex = new Map();

/** Add a torrent to the download manager */
export function addDownload(id, magnet, libraryDir, metadata) {
  const entry = {
    id,
    infoHash: null,
    torrent: null,
    status: 'downloading',
    libraryDir,
    filePath: null,
    fileIndex: null,
    metadata,
  };
  downloads.set(id, entry);

  const torrent = client.add(magnet, { path: libraryDir });
  entry.torrent = torrent;

  torrent.once('metadata', () => {
    entry.infoHash = torrent.infoHash;

    // Resolve the largest file as the stream target
    const { files } = torrent;
    const largest = files.reduce((max, f) => (f.length > max.length ? f : max), files[0]);
    entry.fileIndex = files.indexOf(largest);
    entry.filePath = path.join(libraryDir, largest.path);
  });

  torrent.once('done', () => {
    entry.status = 'complete';
    entry.torrent = null;

    // Update metadata.json status on disk
    const metaPath = path.join(libraryDir, 'metadata.json');
    try {
      const existing = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      fs.writeFileSync(metaPath, JSON.stringify({ ...existing, status: 'complete' }, null, 2));
    } catch (err) {
      console.warn('[manager] Failed to update metadata.json on complete:', err.message);
    }

    torrent.destroy();

    // Move from downloads to library index
    downloads.delete(id);
    addToIndex(id, entry.filePath, libraryDir, { ...entry.metadata, status: 'complete' });
  });

  torrent.once('error', (err) => {
    console.error(`[manager] Torrent error for ${id}:`, err.message);
    entry.status = 'error';
  });

  return entry;
}

/** Get a download entry by library ID */
export function getDownload(id) {
  return downloads.get(id) || null;
}

/** Stop a torrent and remove from the downloads map */
export function removeDownload(id) {
  const entry = downloads.get(id);
  if (!entry) return;
  if (entry.torrent) {
    entry.torrent.destroy();
  }
  downloads.delete(id);
}

/** List all active downloads with computed progress */
export function listDownloads() {
  return Array.from(downloads.values()).map((entry) => ({
    id: entry.id,
    filePath: entry.filePath,
    libraryDir: entry.libraryDir,
    status: entry.status,
    progress: entry.torrent ? entry.torrent.progress : (entry.status === 'complete' ? 1.0 : 0),
    metadata: entry.metadata,
    torrent: entry.torrent,
    fileIndex: entry.fileIndex,
  }));
}

/** Get a specific download's torrent file by fileIndex (for streaming) */
export function getDownloadFile(id) {
  const entry = downloads.get(id);
  if (!entry || !entry.torrent) return null;
  return entry.torrent.files[entry.fileIndex] || null;
}

/**
 * Wait until the torrent's metadata event has fired and files are resolved.
 * Resolves with the target file object, or rejects on timeout.
 */
export function waitForFile(id, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const entry = downloads.get(id);
    if (!entry) return reject(new Error('Item not found in downloads'));

    // Already resolved
    if (entry.fileIndex !== null && entry.torrent) {
      return resolve(entry.torrent.files[entry.fileIndex]);
    }

    if (!entry.torrent) return reject(new Error('No active torrent'));

    const timer = setTimeout(() => reject(new Error('Timed out waiting for torrent metadata')), timeoutMs);
    entry.torrent.once('metadata', () => {
      clearTimeout(timer);
      resolve(entry.torrent.files[entry.fileIndex]);
    });
  });
}

// ── Library Index ──────────────────────────────────────────────────────────────

export function addToIndex(id, filePath, libraryDir, metadata) {
  libraryIndex.set(id, { id, filePath, libraryDir, metadata });
}

export function removeFromIndex(id) {
  libraryIndex.delete(id);
}

export function getFromIndex(id) {
  return libraryIndex.get(id) || null;
}

export function listIndex() {
  return Array.from(libraryIndex.values());
}

/** Check if an item exists in either the downloads map or the library index */
export function hasItem(id) {
  return downloads.has(id) || libraryIndex.has(id);
}

/** Get an item from either source */
export function getItem(id) {
  if (downloads.has(id)) return downloads.get(id);
  return libraryIndex.get(id) || null;
}

/** Get all library items (downloads + index), formatted for API response */
export function listAllItems() {
  const items = [];

  for (const entry of downloads.values()) {
    items.push({
      id: entry.id,
      status: entry.status,
      progress: entry.torrent ? entry.torrent.progress : 0,
      libraryDir: entry.libraryDir,
      metadata: entry.metadata,
    });
  }

  for (const entry of libraryIndex.values()) {
    items.push({
      id: entry.id,
      status: 'complete',
      progress: 1.0,
      libraryDir: entry.libraryDir,
      metadata: entry.metadata,
    });
  }

  return items;
}
