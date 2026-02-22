## Why

No good personal tool exists for quickly finding and streaming torrent content from a browser without managing a media library. This project builds a lightweight local server that lets you search, click, and watch - with no files kept after you're done.

## What Changes

- New local web server (Node.js + Express) handling search and streaming
- New Svelte frontend for browsing movies and searching TV shows
- Movie search and browse via YTS public API
- TV show/episode search via EZTV public API
- Torrent download and HTTP streaming via WebTorrent
- Automatic temp file cleanup when streaming stops

## Capabilities

### New Capabilities

- `movie-search`: Browse popular movies and search by title using the YTS API; returns poster, title, year, rating, and available quality tiers with magnet links
- `tv-search`: Search TV shows and episodes using the EZTV API; returns episodes grouped by season with magnet links
- `torrent-streaming`: Accept a magnet link, download via WebTorrent to a temp directory, and serve the file as an HTTP range-request stream; auto-delete temp files when the stream ends or the client disconnects

### Modified Capabilities

None. This is a new project with no existing specs.

## Impact

- **New dependencies**: Node.js, Express, WebTorrent, Svelte, Vite
- **External APIs**: YTS (yts.mx), EZTV (eztv.re) - both public, no auth required
- **Filesystem**: Writes to system temp dir during active streams only
- **Network**: Requires outbound BitTorrent connections (default ports)
- **Future**: TMDB API integration identified as a stretch enhancement for richer metadata
