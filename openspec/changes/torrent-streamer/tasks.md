## 1. Project Setup

- [x] 1.1 Create monorepo directory structure: `server/`, `client/`, root `package.json`
- [x] 1.2 Initialize `server/package.json` with dependencies: express, webtorrent, cors, node-fetch
- [x] 1.3 Scaffold Svelte + Vite client in `client/` using `npm create vite@latest`
- [x] 1.4 Add root scripts: `dev` (runs server + vite concurrently), `build` (vite build), `start` (node server/index.js)
- [x] 1.5 Configure Vite proxy in `client/vite.config.js` to forward `/api` and `/stream` requests to the Express server port

## 2. Server Foundation

- [x] 2.1 Create `server/index.js`: initialize Express, enable CORS, mount route modules, serve `client/dist` as static files, listen on port 3000
- [x] 2.2 Create `server/routes/search.js` module skeleton with router export
- [x] 2.3 Create `server/routes/stream.js` module skeleton with router export and a singleton WebTorrent instance

## 3. Movies Search API

- [x] 3.1 Implement `GET /api/movies` handler: proxy YTS `list_movies.json` endpoint, pass through `q`, `genre`, `page`, `sort` query params
- [x] 3.2 Map YTS response to a clean shape: `{ id, title, year, rating, poster, torrents: [{ quality, magnet }] }`
- [x] 3.3 Default sort to `download_count` when no `sort` param provided (browse popular behavior)
- [x] 3.4 Handle YTS API errors and return HTTP 502 with an error message to the client

## 4. TV Search API

- [ ] 4.1 Implement `GET /api/tv` handler: query EZTV API with `q` param, fetch up to 100 results
- [ ] 4.2 Parse each episode's filename/title for season and episode number (S##E## pattern); assign unknown season/episode when unparseable
- [ ] 4.3 Group episodes by season server-side; within each season sort by episode number ascending; order seasons newest first
- [ ] 4.4 Return grouped shape: `{ seasons: [{ season, episodes: [{ title, episode, magnet, seeds }] }] }`
- [ ] 4.5 Handle EZTV API errors and return HTTP 502 with an error message

## 5. Streaming Engine

- [ ] 5.1 Implement `POST /api/stream`: validate magnet link present, stop and clean up any existing active torrent, add new magnet to WebTorrent
- [ ] 5.2 Wait for torrent metadata, then select the largest file by byte size as the stream target
- [ ] 5.3 Return `{ streamUrl: "/stream/:infoHash/:fileIndex", infoHash }` once metadata is ready
- [ ] 5.4 Implement `GET /stream/:infoHash/:fileIndex`: look up torrent and file, pipe file stream to response with correct Content-Type and Content-Length headers
- [ ] 5.5 Handle HTTP range requests: parse `Range` header, respond with HTTP 206 and correct `Content-Range` header
- [ ] 5.6 On `req.on('close')`: start a 30-second grace period timer before removing torrent and deleting temp files
- [ ] 5.7 Cancel the cleanup timer if a new request for the same infoHash arrives within the grace period
- [ ] 5.8 Implement inactivity timeout: if no bytes transferred for 10 minutes on an open connection, close it and begin grace period

## 6. Client Shell & Navigation

- [ ] 6.1 Create `App.svelte` with two-tab layout (Movies / TV) and a slot for the player overlay
- [ ] 6.2 Create `TabNav.svelte` component: renders Movies and TV tabs, emits tab change events
- [ ] 6.3 Create `SearchBar.svelte` component: text input + submit, emits search query string
- [ ] 6.4 Implement global player state in a Svelte store: `{ active, streamUrl, title }`; player overlay shown when `active` is true

## 7. Movies UI

- [ ] 7.1 Create `MovieGrid.svelte`: on mount fetch `/api/movies` (popular), render grid of `MovieCard` components, handle loading and error states
- [ ] 7.2 Wire `SearchBar` in movies tab: on submit fetch `/api/movies?q=...`, replace grid with search results
- [ ] 7.3 Create `MovieCard.svelte`: display poster (with placeholder fallback), title, year, rating, and quality buttons (720p / 1080p / 4K) for available tiers
- [ ] 7.4 On quality button click: POST magnet to `/api/stream`, set player store to active with returned stream URL
- [ ] 7.5 Add "Load more" button: fetch next page and append cards to existing grid

## 8. TV UI

- [ ] 8.1 Create `TvSearch.svelte`: default state shows search prompt with no results; on search query fetch `/api/tv?q=...`
- [ ] 8.2 Create `SeasonGroup.svelte`: collapsible section showing season label and list of episodes; latest season expanded by default
- [ ] 8.3 Create `EpisodeRow.svelte`: displays episode number, title, and seed count; on click POST magnet to `/api/stream` and activate player
- [ ] 8.4 Handle "Unknown" season group: render at the bottom below all numbered seasons

## 9. Player UI

- [ ] 9.1 Create `Player.svelte`: overlay component with a `<video>` element pointed at `streamUrl`, native browser controls enabled
- [ ] 9.2 Show a loading/buffering indicator while the torrent metadata is being fetched (between POST and stream URL being available)
- [ ] 9.3 Add a close/back button: clear player store state, return user to the previous tab and search results
- [ ] 9.4 Display the title of the content being streamed above the video player

## 10. Polish & Error Handling

- [ ] 10.1 Add empty state UI for movie search with no results ("No movies found for '...'")
- [ ] 10.2 Add empty state UI for TV search with no results
- [ ] 10.3 Show a user-facing error message when `/api/movies` or `/api/tv` returns an error
- [ ] 10.4 Show a user-facing error message when `/api/stream` fails (e.g. bad magnet, WebTorrent error)
- [ ] 10.5 Add a basic README with setup instructions (`npm install`, `npm run dev`, `npm start`)
