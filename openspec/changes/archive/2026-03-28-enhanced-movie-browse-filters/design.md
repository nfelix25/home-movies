## Context

The `/api/movies` route in `server/routes/search.js` already proxies the YTS API and passes through `genre`, `sort_by`, and `query_term`. The client (`MovieGrid.svelte`) only sends `q` and `page`. No filter UI exists.

The YTS API natively supports: `genre` (single value), `minimum_rating` (0–9 integer), `sort_by` (title | year | rating | seeds | peers | download_count | like_count | date_added), `order_by` (asc | desc), and a separate `movie_suggestions` endpoint (`/api/v2/movie_suggestions.json?movie_id=<id>`).

## Goals / Non-Goals

**Goals:**
- Expose YTS filter params (genre, minimum rating, sort, order, minimum year) through the server and a filter panel UI
- Support multi-genre selection in the UI (OR logic via multiple sequential fetches merged client-side)
- Add a `GET /api/movies/:id/suggestions` endpoint and a "More like this" surface on MovieCard

**Non-Goals:**
- AND-logic multi-genre (YTS doesn't support it; client-side intersection would require fetching full datasets)
- Custom recommendation engine or similarity search beyond the YTS suggestions API
- Filtering the local library view (separate concern)
- Year range (max year) — YTS has no upper-year param; minimum year only

## Decisions

### 1. Multi-genre as OR via merged parallel fetches

**Decision**: When the user selects multiple genres, fetch each genre separately in parallel and merge results (dedup by movie ID).

**Why**: YTS only accepts one genre per request. OR semantics (movies matching any selected genre) are the most natural UX expectation. AND semantics would require fetching full genre datasets and intersecting — too expensive and YTS has no endpoint for it.

**Alternative considered**: Single-genre only. Rejected — multi-genre is explicitly requested.

### 2. Minimum year via client-side filter (not server-side)

**Decision**: Filter by `minimum_year` client-side after fetching from YTS.

**Why**: YTS has no `minimum_year` parameter. The `query_term` field won't accept year ranges. Fetching more results than needed and filtering client-side is acceptable given typical result set sizes (20–50 movies per page).

**Alternative considered**: Encode year in `query_term`. Rejected — YTS treats it as a keyword search, not a structured filter.

### 3. Suggestions endpoint as a passthrough

**Decision**: Add `GET /api/movies/:id/suggestions` that calls `YTS_BASE_URL` replaced with `movie_suggestions` endpoint, enriches with library status, and returns the same movie shape as `/api/movies`.

**Why**: Keeps the server as the single integration point for YTS. The client already knows how to render a list of movies; reusing the same shape avoids a new data contract.

### 4. Filter panel as a collapsible inline section in MovieGrid

**Decision**: Add a `FilterPanel.svelte` component, rendered inline in `MovieGrid.svelte` below the search bar, toggled by a "Filters" button.

**Why**: Keeps filters close to the result set they affect. A separate drawer or modal adds navigation overhead for something used frequently during browsing.

### 5. Reset pagination on filter change

**Decision**: Any filter change resets `currentPage` to 1 and re-fetches.

**Why**: Results change entirely when filters change; showing page 2 of old results makes no sense.

## Risks / Trade-offs

- **Multi-genre merge duplicates**: A movie tagged with two selected genres will appear in both fetches. Dedup by `movie.id` handles this, but the merged count will vary from a single-genre page size. → Acceptable: inform the user that results are merged across genres.
- **Client-side year filter reduces visible results per page**: Filtering after fetch means fewer than 20 results may show even when more exist. → Mitigate by noting this is best-effort; "Load more" still works.
- **YTS suggestions quality**: The `movie_suggestions` endpoint returns up to 4 movies. Quality depends on YTS metadata. → No mitigation needed; this is a best-effort discovery feature.
- **`minimum_rating` is an integer (0–9)**: UI should present this as a slider or discrete options (e.g., 6+, 7+, 8+) rather than a free-text input.

## Migration Plan

1. Server changes (search.js): add `minimum_rating` and `order_by` passthrough to `/api/movies`; add `/api/movies/:id/suggestions` route.
2. Client: add `FilterPanel.svelte`; update `MovieGrid.svelte` to hold filter state and pass to fetch; update `MovieCard.svelte` with "More like this" button.
3. No schema changes, no new dependencies, no data migrations. Changes are additive and non-breaking.

## Open Questions

- Should "More like this" open inline (replacing current grid) or push a new view/modal? → Inline replacement with a "← Back" action is simplest.
- Should sort order (asc/desc toggle) be exposed, or just sort field? → Expose both; default to desc.
