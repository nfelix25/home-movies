## Context

Greenfield personal project. No existing codebase. The goal is a minimal local tool: search for content, click to stream, walk away when done. No persistence, no user accounts, no library management. Simplicity is the primary constraint.

## Goals / Non-Goals

**Goals:**
- Search movies (YTS) and TV episodes (EZTV) from a browser UI
- Stream a selected torrent via in-browser `<video>` while it downloads
- Auto-cleanup temp files when streaming stops
- Single-command startup (`npm start` or similar)

**Non-Goals:**
- Library management or download history
- User authentication
- Transcoding (serve files as-is; browser handles decoding)
- Mobile optimization
- TMDB metadata (future stretch)
- Multiple concurrent streams (personal tool, 1 active stream is sufficient for now)

## Decisions

### 1. WebTorrent as the torrent engine

**Decision**: Use the `webtorrent` npm package directly rather than wrapping an existing client like Transmission or qBittorrent.

**Rationale**: WebTorrent exposes a `createServer()` method that serves torrent files over HTTP with range request support - exactly what a `<video>` tag needs. No separate torrent daemon to install or manage. The integration is pure Node.js and fits the single-process architecture.

**Alternative considered**: Wrapping qBittorrent's web API. Rejected because it requires the user to have qBittorrent installed and running separately, adding operational complexity for a personal tool.

### 2. Single Express server for API + static files

**Decision**: One Node.js process serves both the REST API and the built Svelte frontend.

**Rationale**: Simplest possible deployment. `npm run build` compiles Svelte to `dist/`, Express serves it as static files alongside the API. No reverse proxy, no separate dev orchestration beyond Vite's dev server in development.

**Dev mode**: Vite dev server runs on a separate port with a proxy to the Express API, enabling HMR during development.

### 3. Stream cleanup via connection close event

**Decision**: Clean up temp files and remove the torrent when the HTTP streaming connection closes (`req.on('close', ...)`), with a 30-second grace period before deletion.

**Rationale**: Avoids requiring an explicit DELETE call from the client (which may not fire on tab close or crash). The grace period handles brief network interruptions without destroying the torrent.

**Alternative considered**: Explicit DELETE from client `beforeunload`. Rejected as unreliable - browsers don't guarantee fetch calls fire during unload.

### 4. YTS + EZTV over Jackett/Prowlarr

**Decision**: Hardcode YTS and EZTV as the two search sources rather than integrating a local Jackett/Prowlarr instance.

**Rationale**: Both have usable public JSON endpoints with no auth. Jackett/Prowlarr would require the user to run an additional service. For a personal tool with reasonable coverage needs, YTS (movies) + EZTV (TV) covers the common case.

**Trade-off**: Less breadth than a full indexer aggregator. Accepted for now.

### 5. Project structure: monorepo with `server/` and `client/`

```
home-movies/
├── server/          # Node.js + Express + WebTorrent
│   ├── index.js
│   ├── routes/
│   │   ├── search.js    # YTS + EZTV proxying
│   │   └── stream.js    # WebTorrent + HTTP streaming
│   └── package.json
├── client/          # Svelte + Vite
│   ├── src/
│   │   ├── App.svelte
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── package.json     # root scripts: dev, build, start
```

### 6. API surface

```
GET  /api/movies?q=&genre=&page=&sort=   → YTS search/browse
GET  /api/tv?q=                          → EZTV search
POST /api/stream  { magnet, fileIndex }  → start torrent, return { streamUrl, infoHash }
GET  /stream/:infoHash/:fileIndex        → HTTP range-request stream
```

No explicit DELETE endpoint. Cleanup is driven by connection close.

## Risks / Trade-offs

- **WebTorrent maintenance** → The package is stable but not actively developed. Mitigated by the fact we use only core functionality (add torrent, create HTTP server). If it becomes a problem, swapping to `webtorrent-hybrid` or another engine is isolated to `routes/stream.js`.

- **Browser codec support** → MKV files with H265 video or AC3/DTS audio will fail to play. No mitigation planned (transcoding is out of scope). TV content from EZTV may hit this occasionally.

- **EZTV API reliability** → EZTV is an unofficial endpoint that could change or go down. Mitigated by: the backend proxies it, so the client is isolated. A fallback to apibay.org (ThePirateBay's JSON API) could be added later.

- **Connection close reliability** → `req.on('close')` doesn't fire in 100% of disconnect scenarios. Mitigation: 30-second grace period + a server-side inactivity timeout (if no bytes have been read for N minutes, tear down the torrent).

## Open Questions

- Should the TV search group results by season client-side, or should the server pre-group them before returning? (Leaning: server-side, simpler Svelte template)
- What file index to stream when a torrent has multiple files? (Leaning: auto-select the largest file, which is almost always the video)
