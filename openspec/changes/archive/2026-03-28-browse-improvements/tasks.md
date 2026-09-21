## 1. Server — Subtitles endpoint

- [x] 1.1 Create `server/routes/subtitles.js` with `GET /api/subtitles?imdb_id=<id>`: return 501 if `OPENSUBTITLES_API_KEY` is unset; query OpenSubtitles REST API (`/api/v1/subtitles?imdb_id=<id>&languages=en`), pick result with highest `download_count`; call `/api/v1/download` with `file_id` to get the temporary link; fetch the SRT, convert to WebVTT, respond with `Content-Type: text/vtt`
- [x] 1.2 Implement `srtToVtt(srt)` conversion utility (replace `WEBVTT\n\n` header, reformat `,` timestamp separator to `.`); return 502 if conversion throws
- [x] 1.3 Register the subtitles router in `server/index.js` (or wherever routes are mounted)

## 2. Server — Page size passthrough

- [x] 2.1 In `server/routes/search.js` `/movies` route, read `limit` from `req.query`; accept values 20, 50 only (reject others); forward as `limit` to the YTS API request

## 3. Client — Player: imdbId + subtitle track

- [x] 3.1 Add `imdbId` and `subtitleUrl` fields to the player store in `playerStore.svelte.js`; update `startStream`, `activateStream`, and `closePlayer` to handle `imdbId` (passed via metadata) and reset `subtitleUrl`
- [x] 3.2 In `Player.svelte`, add a `$effect` that watches `player.imdbId`: when set and stream URL is resolved, fetch `/api/subtitles?imdb_id=<id>`; on 200, set `player.subtitleUrl` to a blob URL created from the response text; on non-200, do nothing
- [x] 3.3 In `Player.svelte`, add a `<track kind="subtitles" label="English" srclang="en" src={player.subtitleUrl} default>` inside the `<video>` element, rendered only when `player.subtitleUrl` is set; remove the `<!-- svelte-ignore a11y_media_has_caption -->` comment

## 4. Client — MovieGrid: page size

- [x] 4.1 Add `pageSize` state (default 20) to `MovieGrid.svelte`; add a page size selector (`<select>`: 20 / 50 / 100) to the search row area
- [x] 4.2 Update `fetchSingleGenre` to pass `limit` param (capped at 50 server-side); for `pageSize === 100`, fetch two YTS pages in parallel inside `fetchMovies` and merge, keeping dedup by movie id; advance `currentPage` by 2 for load-more when pageSize is 100
- [x] 4.3 Changing page size SHALL reset `currentPage` to 1 and re-fetch

## 5. Client — MovieGrid: URL state sync

- [x] 5.1 Add `syncToUrl()` helper in `MovieGrid.svelte` that writes current state to `window.location` via `history.replaceState`; omit params that equal their default values; call after every state change (search, filter change, page size change)
- [x] 5.2 Add `readFromUrl()` helper that reads `URLSearchParams` from `window.location.search` and returns parsed state (splitting `genre` on commas, parsing numeric params, falling back to defaults for missing/invalid values)
- [x] 5.3 In `onMount`, call `readFromUrl()` to initialise all filter/search state before the initial `fetchMovies` call

## 6. Verification

- [x] 6.1 Verify subtitles: a movie with a known IMDb ID (e.g., tt0133093) loads a subtitle track in the player; player works normally when `OPENSUBTITLES_API_KEY` is unset
- [x] 6.2 Verify page size: selecting 50 fetches 50 results; selecting 100 fetches ~100 results via two merged requests; load-more advances correctly
- [x] 6.3 Verify URL sync: changing search/filters updates the URL in real time; reloading the page with `?q=batman&rating=7` restores the correct state and fetches matching results
