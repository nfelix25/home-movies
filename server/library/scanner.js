import fs from 'node:fs';
import path from 'node:path';
import { addDownload, addToIndex } from './manager.js';
import { findMovieByImdbId, searchMovie, searchShow, getEpisode, downloadPoster, delay } from './tmdb.js';

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.ts', '.mpg', '.mpeg']);

/** Parse "Title (Year)" folder name → { title, year } or null */
function parseMovieFolder(name) {
  const match = name.match(/^(.+?)\s*\((\d{4})\)$/);
  if (!match) return null;
  return { title: match[1].trim(), year: Number(match[2]) };
}

/** Parse "SxxExx" from a filename → { season, episode } or null */
function parseSeasonEpisode(name) {
  const match = name.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

/** Slugify a string for use as a local-{slug} ID */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Find the first video file in a directory (non-recursive) */
function findVideoFile(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        return path.join(dir, entry.name);
      }
    }
  } catch {}
  return null;
}

/** Find the first video file in a directory, recursively */
function findVideoFileRecursive(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const found = findVideoFileRecursive(fullPath);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

async function processMovieFolder(movieDir, delayBetweenCalls) {
  const folderName = path.basename(movieDir);
  const metaPath = path.join(movieDir, 'metadata.json');

  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const filePath = meta.filePath
      ? path.resolve(movieDir, meta.filePath)
      : findVideoFileRecursive(movieDir);

    if (!filePath) return;

    if (meta.status === 'complete') {
      addToIndex(meta.id, filePath, movieDir, meta);
    } else if (meta.status === 'downloading' && meta.magnet) {
      console.log(`[scanner] Resuming download: ${meta.id}`);
      addDownload(meta.id, meta.magnet, movieDir, meta);
    }
    return;
  }

  // No metadata.json — try to resolve from folder name
  const filePath = findVideoFileRecursive(movieDir);
  if (!filePath) return;

  const parsed = parseMovieFolder(folderName);
  if (!parsed) {
    // Cannot parse — use local-{slug} ID
    const id = `local-${slugify(folderName)}`;
    const meta = { id, title: folderName, type: 'movie', status: 'complete', addedAt: new Date().toISOString() };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    addToIndex(id, filePath, movieDir, meta);
    return;
  }

  if (delayBetweenCalls) await delay(250);

  let tmdbResult = await searchMovie(parsed.title, parsed.year);
  let id = tmdbResult ? `movie-${tmdbResult.tmdbId}` : `local-${slugify(folderName)}`;

  const meta = {
    id,
    title: parsed.title,
    year: parsed.year,
    type: 'movie',
    status: 'complete',
    tmdbId: tmdbResult?.tmdbId || null,
    posterPath: tmdbResult?.posterPath ? 'poster.jpg' : null,
    addedAt: new Date().toISOString(),
    filePath: path.relative(movieDir, filePath),
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (tmdbResult?.posterPath) {
    downloadPoster(tmdbResult.posterPath, path.join(movieDir, 'poster.jpg')).catch(() => {});
  }

  addToIndex(id, filePath, movieDir, meta);
}

async function processTvEpisodeFile(episodeFile, showDir, showName, delayBetweenCalls) {
  const seasonDir = path.dirname(episodeFile);
  const filename = path.basename(episodeFile);
  const se = parseSeasonEpisode(filename);
  const metaPath = se
    ? path.join(seasonDir, `s${String(se.season).padStart(2,'0')}e${String(se.episode).padStart(2,'0')}.json`)
    : path.join(seasonDir, `${path.parse(filename).name}.json`);

  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.status === 'complete') {
      addToIndex(meta.id, episodeFile, showDir, meta);
    } else if (meta.status === 'downloading' && meta.magnet) {
      console.log(`[scanner] Resuming TV download: ${meta.id}`);
      addDownload(meta.id, meta.magnet, seasonDir, meta);
    }
    return;
  }

  if (!se) {
    const id = `local-${slugify(showName + '-' + filename)}`;
    const meta = { id, title: filename, showTitle: showName, type: 'tv', status: 'complete', addedAt: new Date().toISOString() };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    addToIndex(id, episodeFile, showDir, meta);
    return;
  }

  if (delayBetweenCalls) await delay(250);

  const showResult = await searchShow(showName);
  let episodeTitle = null;

  if (showResult) {
    if (delayBetweenCalls) await delay(250);
    const epResult = await getEpisode(showResult.tmdbId, se.season, se.episode);
    episodeTitle = epResult?.title || null;

    // Download show poster once
    const posterDest = path.join(showDir, 'poster.jpg');
    if (showResult.posterPath) {
      downloadPoster(showResult.posterPath, posterDest).catch(() => {});
    }
  }

  const id = showResult
    ? `tv-${showResult.tmdbId}-s${String(se.season).padStart(2, '0')}e${String(se.episode).padStart(2, '0')}`
    : `local-${slugify(showName + '-s' + se.season + 'e' + se.episode)}`;

  const meta = {
    id,
    title: episodeTitle || filename,
    showTitle: showName,
    season: se.season,
    episode: se.episode,
    type: 'tv',
    status: 'complete',
    tmdbId: showResult?.tmdbId || null,
    addedAt: new Date().toISOString(),
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  addToIndex(id, episodeFile, showDir, meta);
}

async function scanMovies(moviesDir) {
  if (!fs.existsSync(moviesDir)) return;
  const entries = fs.readdirSync(moviesDir, { withFileTypes: true });
  let firstCall = true;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const movieDir = path.join(moviesDir, entry.name);
    await processMovieFolder(movieDir, !firstCall);
    firstCall = false;
  }
}

async function scanTv(tvDir) {
  if (!fs.existsSync(tvDir)) return;
  const showEntries = fs.readdirSync(tvDir, { withFileTypes: true });
  let firstCall = true;

  for (const showEntry of showEntries) {
    if (!showEntry.isDirectory()) continue;
    const showDir = path.join(tvDir, showEntry.name);
    const showName = showEntry.name;

    // Find all video files recursively under the show folder
    const videoFiles = findAllVideoFiles(showDir);
    for (const videoFile of videoFiles) {
      await processTvEpisodeFile(videoFile, showDir, showName, !firstCall);
      firstCall = false;
    }
  }
}

function findAllVideoFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      } else if (entry.isDirectory()) {
        results.push(...findAllVideoFiles(fullPath));
      }
    }
  } catch {}
  return results;
}

/** Main entry point — call this at server startup */
export async function scanLibrary(libraryRoot) {
  const moviesDir = path.join(libraryRoot, 'movies');
  const tvDir = path.join(libraryRoot, 'tv');

  fs.mkdirSync(moviesDir, { recursive: true });
  fs.mkdirSync(tvDir, { recursive: true });

  console.log('[scanner] Scanning library...');
  await scanMovies(moviesDir);
  await scanTv(tvDir);
  console.log('[scanner] Scan complete.');
}
