## Why

The movie browsing view currently offers only a free-text search bar, forcing users to know what they're looking for. Adding filters for genre, year, rating, and sort order — plus a "More like this" feature — enables discovery-style browsing backed entirely by the existing YTS API.

## What Changes

- Add a filter panel to the movie browse view with: genre (multi-select), minimum year, minimum rating, and sort order
- Expose the YTS API's existing filter parameters (`genre`, `minimum_rating`, `sort_by`, `order_by`) through the `/api/movies` server route
- Add a `/api/movies/:id/suggestions` server endpoint backed by the YTS `movie_suggestions` API
- Add a "More like this" trigger on each MovieCard that opens a suggestions view

## Capabilities

### New Capabilities

- `movie-browse-filters`: Filter panel UI and server-side support for genre, year, rating, and sort parameters when browsing/searching movies
- `movie-suggestions`: "More like this" feature — fetch and display YTS movie suggestions for a given movie ID

### Modified Capabilities

- None

## Impact

- **Server**: `server/routes/movies.js` — pass additional query params to YTS API; add new suggestions route
- **Client**: `client/src/components/MovieGrid.svelte` — add filter state and panel; `client/src/components/MovieCard.svelte` — add "More like this" button
- **New component**: `client/src/components/FilterPanel.svelte` (or inline in MovieGrid)
- **External API**: YTS API already supports all required filter params and has a `movie_suggestions` endpoint — no new dependencies
