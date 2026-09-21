## Why

Three small quality-of-life improvements for movie browsing: subtitles for accessibility, a larger page size for power users who want to see more results at once, and URL state sync so searches and filters can be bookmarked or shared.

## What Changes

- Add support for fetching and displaying English subtitle tracks alongside video playback, sourced from the OpenSubtitles API
- Add a page size selector to the movie browse view (20 / 50 / 100 results per page), forwarded to the YTS `limit` parameter
- Sync movie browse state (query, filters, page size) to the browser URL as query params so the page is bookmarkable and refreshable

## Capabilities

### New Capabilities

- `subtitle-support`: Fetch English subtitle tracks for a playing movie via its IMDb ID and make them available to the HTML5 video player as a `<track>` element
- `url-state-sync`: Reflect movie browse state (search query, active filters, sort, page size) in the browser URL query string; restore state on load

### Modified Capabilities

- `movie-browse-filters`: Add page size control (20 / 50 / 100) as a new requirement; the YTS `limit` parameter is forwarded server-side

## Impact

- **Server**: `server/routes/search.js` — forward `limit` param to YTS API on `/api/movies`; new `GET /api/subtitles` route to proxy OpenSubtitles REST API
- **Client**: `client/src/components/MovieGrid.svelte` — add page size state + selector; sync all browse state to/from `window.location` search params
- **Client**: `client/src/components/Player.svelte` — add `<track>` element to video when a subtitle URL is available
- **External API**: OpenSubtitles REST API (free, no auth required for basic use) — new dependency for subtitle lookup
