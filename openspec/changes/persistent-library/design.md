## Context

The current server uses a single `active` object holding one WebTorrent torrent at a time, streaming to the OS temp directory and deleting files after the client disconnects. This works for ephemeral viewing but makes it impossible to build a persistent collection. The redesign replaces this with a library-first model: files live permanently in `library/` under the app root, downloads are managed concurrently, and everything is discoverable on startup.

## Goals / Non-Goals

**Goals:**
- Persistent local media storage under `library/movies/` and `library/tv/`
- Concurrent download management — multiple torrents at once, independent of playback
- Automatic resume of in-progress downloads across server restarts
- Discovery of manually placed files that follow the naming convention
- TMDB-backed metadata and poster caching for all items
- Library home view as the default UI; search as an add-to-library mechanism
- "Always add" model — watching anything adds it, remove to curate

**Non-Goals:**
- Cloud sync or remote access
- Transcoding or format conversion
- Multi-user or authentication
- Subtitle management
- Auto-download (no RSS feeds or watch lists)

## Decisions

### 1. Folder structure follows Plex convention

```
library/
  movies/
    The Matrix (1999)/
      The Matrix (1999).mkv
      metadata.json
      poster.jpg
  tv/
    Breaking Bad/
      Season 01/
        S01E01 - Pilot.mkv
      metadata.json     ← show-level
      poster.jpg
```

**Why**: This is the de-facto standard (Plex, Jellyfin, Infuse all use it). TMDB's search API is designed around `Title (Year)` parsing. Manually added files that follow this pattern work automatically. The folder name is the canonical identity for unmatched files.

**Alternative considered**: Flat files with sidecar JSON. Rejected — harder to browse manually, folder-per-item scales better when there are subtitles, extras, etc.

### 2. Download manager: Map replaces singleton

```javascript
// server/library/manager.js
const downloads = new Map(); // infoHash → DownloadEntry

// DownloadEntry shape:
{
  torrent,       // WebTorrent Torrent object; null when complete
  status,        // 'downloading' | 'complete' | 'error'
  progress,      // 0.0–1.0 (torrent.progress)
  id,            // library item ID (see Decision 4)
  libraryDir,    // absolute path to item's folder
  filePath,      // absolute path to the video file
  metadata,      // in-memory copy of metadata.json contents
}
```

Torrents are added with `client.add(magnet, { path: libraryDir })`. On the `'done'` event, the entry is updated to `complete`, `torrent.destroy()` is called (without `destroyStore`), and `torrent` is set to `null`. The file stays on disk.

**Why**: Simple, no external process manager needed. The Map is rebuilt from disk on startup for any in-progress items.

### 3. Startup scan rebuilds the download map

On server start, `scanner.js` walks `library/movies/` and `library/tv/`, reads each `metadata.json`, and:

- If `status === 'complete'`: adds to in-memory library index only. No torrent needed.
- If `status === 'downloading'` and `magnet` is present: re-adds to WebTorrent with the same `path`. WebTorrent verifies existing pieces via SHA1 hashing and resumes from where the download stopped. Entry added to downloads map.
- If no `metadata.json`: parses folder name (`Title (Year)` or `Show/Season XX/SxxExx`), queries TMDB, writes `metadata.json` and fetches poster. Then adds to index as `complete`.

Scan is sequential and runs at startup before the HTTP server begins accepting requests.

### 4. Library item IDs

| Item type | ID format | Example |
|-----------|-----------|---------|
| Movie (TMDB matched) | `movie-{tmdbId}` | `movie-603` |
| TV episode (TMDB matched) | `tv-{showTmdbId}-s{ss}e{ee}` | `tv-1396-s01e01` |
| Unmatched manual file | `local-{slugified-folder-name}` | `local-the-matrix-1999` |

IDs are stored in `metadata.json` and used as the key for the in-memory index. The stream route `/api/library/:id/stream` uses this ID.

### 5. Dual-source stream serving

```
GET /api/library/:id/stream
        │
        ├── id found in downloads map + status=downloading
        │         └── torrent.files[i].createReadStream({ start, end })
        │               WebTorrent manages piece availability
        │
        ├── id found in downloads map + status=complete
        │         └── fs.createReadStream(filePath, { start, end })
        │
        └── id in library index only (complete, torrent gone)
                  └── fs.createReadStream(filePath, { start, end })
```

Range request handling is identical in both paths — the only difference is the stream source. When download completes mid-stream, the current response continues to use WebTorrent (no disruption); next request uses fs directly.

### 6. TMDB integration

`server/library/tmdb.js` exposes two functions:
- `searchMovie(title, year)` → TMDB movie details + poster path
- `searchShow(name)` → TMDB show details + poster path

Poster images are downloaded and cached as `poster.jpg` in the item folder. TMDB's image base URL is `https://image.tmdb.org/t/p/w500`. API key comes from `TMDB_API_KEY` environment variable.

When adding via search (YTS/EZTV), the metadata provided by the search API (title, year, IMDB ID) is used to fetch the TMDB ID via TMDB's find-by-external-ID endpoint, avoiding a fuzzy search.

### 7. Progress updates via polling

The client polls `GET /api/library` every 2 seconds. The response includes `progress` (0–1) for downloading items. No WebSockets or SSE needed at this scale.

### 8. New server file layout

```
server/
  library/
    manager.js   ← DownloadEntry map, WebTorrent client, add/remove/get
    scanner.js   ← startup scan, folder parsing, TMDB lookup for unmatched
    tmdb.js      ← TMDB API client
  routes/
    library.js   ← GET /api/library, POST /api/library/add,
                   DELETE /api/library/:id,
                   GET /api/library/:id/stream
    search.js    ← modified: inLibrary flag on results
  index.js       ← mounts library routes, runs scanner on startup
```

## Risks / Trade-offs

- **Partial file on abrupt shutdown**: If the OS kills the process during download, the partial file stays on disk. WebTorrent's piece verification on resume handles this correctly — it will re-download any corrupt/missing pieces.
- **TMDB rate limits**: Free tier allows 40 requests/10 seconds. Startup scan for large manually-added libraries could hit this. Mitigation: add 250ms delay between TMDB calls during scan; cache results immediately so it never re-queries.
- **Manual file naming edge cases**: Folder names that don't match `Title (Year)` or standard TV patterns will fall through to `local-{slug}` IDs with no TMDB metadata. Acceptable — they still play, just show no poster.
- **Single WebTorrent client instance**: All concurrent downloads share one client. WebTorrent is designed for this; no issues expected at personal-library scale (1–5 concurrent).
- **Disk space**: No automatic cleanup. User must manually remove items. Acceptable given the "always add, curate by removing" model.

## Migration Plan

1. Deploy new server with `library/` directory structure
2. Old `/stream/:infoHash/:fileIndex` route is removed — any in-flight streams from the old client will 404 (acceptable; both client and server deploy together)
3. `library/` is gitignored; no data migration needed (old temp files were already deleted)
4. Set `TMDB_API_KEY` in `.env` before starting server
