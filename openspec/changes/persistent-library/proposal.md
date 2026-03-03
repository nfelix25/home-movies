## Why

The app currently streams torrent content to temp files and discards everything on disconnect, making it impossible to build a personal media collection. Moving to permanent local storage enables a persistent library that accumulates passively — anything you watch is kept — and can also be populated manually by dropping files into the right folder structure.

## What Changes

- Replace temp-dir streaming with permanent storage under `library/` in the app folder
- Introduce a library home view as the default screen (replaces search-first UX)
- Replace the single-active-torrent model with a concurrent download manager — multiple torrents can download simultaneously, and downloads resume automatically on server restart
- Integrate TMDB API for metadata and poster fetching; posters and metadata cached locally
- Library scanner runs on startup: discovers both app-downloaded and manually added files
- Search results indicate when an item is already in the library
- Watching anything from search automatically adds it to the library (remove to curate)
- Stream URL moves from `/stream/:infoHash/:fileIndex` to `/api/library/:id/stream`

## Capabilities

### New Capabilities

- `library`: Persistent local media library — folder structure, startup scanner, in-memory index, add/remove/list operations; supports both app-downloaded and manually placed files following the naming convention
- `download-manager`: Concurrent WebTorrent download management; tracks per-torrent status (downloading/complete), resumes in-progress downloads on server restart by re-adding magnet links found in persisted metadata
- `library-metadata`: TMDB API integration for fetching and caching movie/TV metadata and posters; parses folder names for manual entries; writes `metadata.json` and `poster.jpg` alongside media files

### Modified Capabilities

- `torrent-streaming`: Stream URL changes to `/api/library/:id/stream`; files are no longer deleted after streaming; multiple concurrent torrents replace the single-active model; streaming serves from WebTorrent during download and switches to direct `fs` read when complete
- `movie-search`: Search results include an `inLibrary` flag; UI surfaces a badge on cards already present in the library
- `tv-search`: Same as movie-search — episodes flagged as in-library when already downloaded

## Impact

- **New dependency**: TMDB API (requires `TMDB_API_KEY` env var); `node-fetch` or native fetch for poster download
- **New directory**: `library/movies/` and `library/tv/` created at startup; gitignored
- **Removed**: `destroyStore: true` cleanup logic; grace-period deletion; single-active-torrent constraint
- **Stream route**: `/stream/:infoHash/:fileIndex` removed; replaced by `/api/library/:id/stream`
- **Client**: Library view becomes home tab; Player receives library item IDs instead of raw magnet+infoHash
- **Breaking**: Any bookmarked stream URLs at the old path will 404
