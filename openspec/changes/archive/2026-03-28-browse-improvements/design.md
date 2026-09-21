## Context

Three independent improvements to the movie browsing and playback experience. The app is a Svelte 5 + Express single-page application with no client-side router. The player uses an HTML5 `<video>` element and a shared Svelte state store (`playerStore.svelte.js`). Browse state currently lives only in `MovieGrid.svelte` component memory and is lost on refresh.

## Goals / Non-Goals

**Goals:**
- English subtitles available in the player for movies that have them on OpenSubtitles
- Page size selector (20 / 50 / 100) in the movie browse view
- Browser URL reflects search query, active filters, sort, and page size; page is fully restorable from URL

**Non-Goals:**
- Subtitle language selection beyond English (can be added later)
- Subtitle caching or offline support
- URL sync for the TV or library views
- Client-side routing or history navigation (back/forward button for filter changes)

## Decisions

### 1. Subtitles: server-side proxy with SRT→VTT conversion

**Decision**: Add `GET /api/subtitles?imdb_id=<id>` that queries OpenSubtitles REST API, downloads the best English SRT file, converts it to WebVTT server-side, and returns the VTT content as `text/vtt`. The client passes the returned URL as a `<track src=...>` on the `<video>` element.

**Why**: The HTML5 `<track>` element requires WebVTT format; OpenSubtitles returns SRT. Conversion is trivial server-side (replace header, reformat timestamps). Proxying avoids CORS issues and keeps the API key out of the client. Returning the VTT body directly (rather than a redirect) lets the server handle auth transparently.

**Two-step OpenSubtitles flow**:
1. `GET https://api.opensubtitles.com/api/v1/subtitles?imdb_id=<id>&languages=en` → pick best result by `download_count`
2. `POST https://api.opensubtitles.com/api/v1/download` with `{ file_id }` → get temporary `link` URL
3. Fetch the SRT from `link`, convert to VTT, respond to client

**API key**: `OPENSUBTITLES_API_KEY` environment variable. If unset, the endpoint returns 501 Not Implemented (subtitle UI is hidden client-side).

**Alternative considered**: Use the legacy OpenSubtitles XML-RPC API (no key needed). Rejected — deprecated and unreliable.

**Alternative considered**: Return a redirect to the raw subtitle file. Rejected — CORS blocks the browser from loading cross-origin `<track>` sources.

### 2. Subtitle state in playerStore

**Decision**: Add `imdbId` and `subtitleUrl` fields to the player store. When `imdbId` is set and the subtitles endpoint is available, `Player.svelte` fetches `/api/subtitles?imdb_id=<id>` after the stream URL is resolved and stores the result in `subtitleUrl`. The `<track>` element is rendered conditionally.

**Why**: Subtitles are per-movie. `imdbId` is already part of the movie metadata passed when starting a stream. Fetching from the player component (rather than the caller) keeps subtitle logic self-contained.

**Subtitle fetch timing**: Fetch in a `$effect` that watches `imdbId` — fires once when player activates, not on every render.

### 3. Page size: `limit` param forwarded to YTS

**Decision**: Add a `pageSize` state variable (default 20) to `MovieGrid.svelte` with a select control (20 / 50 / 100). Pass as `limit` in the YTS API request. YTS supports `limit` up to 50 natively; for 100, fetch two pages of 50 in parallel and merge.

**Why**: YTS `limit` maxes out at 50. Fetching two pages of 50 and merging is straightforward given the parallel fetch pattern already established for multi-genre.

**Alternative considered**: Show a note that 100 = 2 pages merged. Rejected — implementation detail; just do it transparently.

### 4. URL state sync: `replaceState` without a router

**Decision**: Maintain browse state in URL query params using `history.replaceState` (not `pushState`) on every state change, and read params from `window.location.search` on mount. No router library.

**Why**: `replaceState` keeps the history stack clean (no phantom back-button entries per keystroke). The app has no router; adding one for this feature would be disproportionate. A simple `syncToUrl()` / `readFromUrl()` utility in `MovieGrid.svelte` is sufficient.

**Params synced**: `q`, `genre` (comma-separated), `rating`, `year`, `sort`, `order`, `limit`.

**Alternative considered**: `pushState` on every change. Rejected — creates noisy browser history.

**Alternative considered**: Hash-based state (`#q=foo`). Rejected — query params are more standard and readable.

## Risks / Trade-offs

- **OpenSubtitles rate limits**: Free tier allows 5 downloads/day per IP by default. Subtitle fetches are triggered on playback, not browse, so typical usage is well within limits. → No mitigation needed beyond documenting the env var requirement.
- **SRT→VTT conversion edge cases**: Malformed SRT files (inconsistent line endings, non-standard timestamp formats) may produce broken VTT. → Wrap conversion in a try/catch; return 502 if conversion fails so the player degrades gracefully (no subtitle track).
- **100-result merge for page size**: Two parallel YTS requests per load-more when page size is 100. → Acceptable for a personal app; no debouncing needed.
- **URL sync and suggestions mode**: Suggestions mode is transient (not a saved browseable state). It is NOT synced to the URL — only the underlying browse state is preserved. → The back button in suggestions mode restores browse state, which is already in the URL.

## Migration Plan

All changes are additive. No schema changes, no breaking changes to existing routes. The `OPENSUBTITLES_API_KEY` env var is optional — the feature silently degrades if absent.

## Open Questions

- None — scope is well-defined.
