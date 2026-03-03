## 1. Environment & Project Setup

- [x] 1.1 Add `TMDB_API_KEY` to `.env` and create `.env.example` with a placeholder
- [x] 1.2 Add `library/` to `.gitignore`
- [x] 1.3 Add `dotenv` to server dependencies and load `.env` in `server/index.js`

## 2. TMDB Client

- [x] 2.1 Create `server/library/tmdb.js` with base fetch helper using `TMDB_API_KEY`; log warning and disable lookups if key is absent
- [x] 2.2 Implement `findMovieByImdbId(imdbId)` using TMDB `/find/{imdb_id}?external_source=imdb_id`
- [x] 2.3 Implement `searchMovie(title, year)` using TMDB `/search/movie` as a fallback for unmatched manual files
- [x] 2.4 Implement `searchShow(name)` using TMDB `/search/tv` returning the top result
- [x] 2.5 Implement `getEpisode(showId, season, episode)` using TMDB `/tv/{id}/season/{s}/episode/{e}`
- [x] 2.6 Implement `downloadPoster(posterPath, destFile)` that fetches from `https://image.tmdb.org/t/p/w500{posterPath}` and writes to disk; skip if file already exists
- [x] 2.7 Add 250ms inter-call delay utility used by the startup scanner to avoid TMDB rate limits

## 3. Library Manager

- [x] 3.1 Create `server/library/manager.js` with a `downloads` Map (infoHash → DownloadEntry) and a single shared WebTorrent client instance
- [x] 3.2 Implement `addDownload(id, magnet, libraryDir, metadata)` — adds torrent with `{ path: libraryDir }`, stores entry in map, returns entry
- [x] 3.3 Implement the WebTorrent `metadata` event handler to resolve the largest file as the target and store `filePath` on the entry
- [x] 3.4 Implement the WebTorrent `done` event handler: update entry status to `complete`, update `metadata.json` on disk, call `torrent.destroy()` (no `destroyStore`), set `torrent` to null
- [x] 3.5 Implement `getEntry(id)` — looks up entry by library ID (not infoHash)
- [x] 3.6 Implement `removeDownload(id)` — stops torrent if active, removes from map
- [x] 3.7 Implement `listAll()` — returns all entries as an array with computed `progress` from `torrent.progress` (or `1.0` if complete)
- [x] 3.8 Create separate `libraryIndex` Map (id → { id, metadata, filePath, status }) for items that are complete and have no active torrent entry; expose `addToIndex`, `removeFromIndex`, `getFromIndex`, `listIndex`

## 4. Library Scanner

- [x] 4.1 Create `server/library/scanner.js` with a `scanLibrary()` function that ensures `library/movies/` and `library/tv/` directories exist
- [x] 4.2 Implement movie folder scan: iterate `library/movies/*/`, read `metadata.json` if present; if status is `complete`, add to library index; if status is `downloading`, re-add magnet to download manager
- [x] 4.3 Implement TV folder scan: iterate `library/tv/*/Season */`, read episode `metadata.json` if present; handle same complete/downloading logic
- [x] 4.4 Implement folder name parser for movies: extract title and year from `Title (Year)` pattern; return null if no match
- [x] 4.5 Implement folder name parser for TV episodes: extract show name, season, and episode from path structure and `SxxExx` filename pattern; return null if no match
- [x] 4.6 For movie folders with no `metadata.json`: call `findMovieByImdbId` or `searchMovie`, write `metadata.json`, download poster, add to index (with 250ms delay between TMDB calls)
- [x] 4.7 For TV episode files with no `metadata.json`: call `searchShow` + `getEpisode`, write show-level and episode-level `metadata.json`, download show poster if not present, add to index
- [x] 4.8 For folders whose name cannot be parsed: assign a `local-{slug}` ID, write a minimal `metadata.json` with no TMDB data, add to index

## 5. Library Routes

- [x] 5.1 Create `server/routes/library.js` and mount it in `server/index.js`; remove the old stream router mount
- [x] 5.2 Implement `POST /api/library/add`: validate magnet and metadata body, create library folder, write `metadata.json`, fetch TMDB metadata + poster (async, non-blocking to response), start download via manager, respond with `{ id, streamUrl: /api/library/:id/stream }`
- [x] 5.3 Implement idempotency in `POST /api/library/add`: if the item ID is already in the index or downloads map, return the existing `{ id, streamUrl }` without creating a duplicate
- [x] 5.4 Implement `GET /api/library`: merge download manager entries and library index entries into one array; include `id`, `title`, `type`, `status`, `progress`, `posterUrl` per item
- [x] 5.5 Implement `DELETE /api/library/:id`: remove from download manager (stops torrent), remove from library index, delete item folder from disk recursively; respond 404 if ID not found
- [x] 5.6 Implement `GET /api/library/:id/stream` with HTTP range request support: resolve item from downloads map or library index; if downloading, stream via `torrent.files[i].createReadStream({ start, end })`; if complete, stream via `fs.createReadStream(filePath, { start, end })`. Set correct Content-Type by file extension.
- [x] 5.7 Add static file serving for `library/` so `poster.jpg` files are accessible at `/library/movies/...` or `/library/tv/...`

## 6. Remove Old Stream Route

- [x] 6.1 Delete `server/routes/stream.js`
- [x] 6.2 Remove the stream router import and mount from `server/index.js`
- [x] 6.3 Verify no other server code references `/stream/:infoHash/:fileIndex`

## 7. Search Route Updates

- [x] 7.1 In `server/routes/search.js`, import the library index lookup function
- [x] 7.2 In the movies search handler, annotate each result with `inLibrary: true/false` by checking the library index for a matching TMDB ID or title+year
- [x] 7.3 In the TV search handler, annotate each episode result with `inLibrary: true/false` by checking the library index for matching show + season + episode

## 8. Server Startup

- [x] 8.1 In `server/index.js`, call `scanLibrary()` at startup and await its completion before calling `app.listen()`

## 9. Client — Library Home View

- [x] 9.1 Create `client/src/components/LibraryView.svelte` that fetches `GET /api/library` on mount and renders a grid of library item cards
- [x] 9.2 Implement polling: `LibraryView` re-fetches `GET /api/library` every 2 seconds; stops polling when all items are `complete`
- [x] 9.3 Add a downloading state to library cards: show a progress bar overlay with percentage when `status === 'downloading'`
- [x] 9.4 Add an empty state to `LibraryView` with a prompt to search for something to watch
- [x] 9.5 Clicking a library card with `status === 'complete'` navigates to the player using `/api/library/:id/stream`
- [x] 9.6 Clicking a library card with `status === 'downloading'` navigates to the player immediately (stream while download continues)

## 10. Client — App.svelte & Navigation

- [x] 10.1 Make Library the default/home tab in `App.svelte`; render `LibraryView` when no other tab is active
- [x] 10.2 Add a Library tab to `TabNav.svelte` as the first tab
- [x] 10.3 Pass the library item list (fetched in `LibraryView` or lifted to `App`) to search components so they can check `inLibrary` status client-side

## 11. Client — MovieCard Updates

- [x] 11.1 Add an `inLibrary` prop to `MovieCard.svelte`; render an "In Library" badge when true
- [x] 11.2 Update the quality select / play action in `MovieCard`: if `inLibrary` is true, navigate directly to player with the existing library stream URL; otherwise call `POST /api/library/add` and navigate using the returned `streamUrl`

## 12. Client — EpisodeRow Updates

- [x] 12.1 Add an `inLibrary` prop to `EpisodeRow.svelte`; render a visible indicator when true
- [x] 12.2 Update the click handler in `EpisodeRow`: if `inLibrary`, navigate to player with existing library stream URL; otherwise call `POST /api/library/add` and navigate using returned `streamUrl`

## 13. Client — Player Updates

- [x] 13.1 Update `playerStore.svelte.js` to store a `streamUrl` string (already `/api/library/:id/stream`) rather than constructing it from `infoHash`/`fileIndex`
- [x] 13.2 Verify `Player.svelte` uses the `streamUrl` from the store directly; remove any reference to the old `/stream/` path pattern
