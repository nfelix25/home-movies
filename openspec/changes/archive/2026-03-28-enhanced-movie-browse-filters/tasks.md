## 1. Server — Filter passthrough

- [x] 1.1 In `server/routes/search.js`, read `minimum_rating` and `order_by` from `req.query` in the `/movies` route and forward them to the YTS API request when present and valid
- [x] 1.2 Add `GET /api/movies/:id/suggestions` route in `server/routes/search.js` that calls the YTS `movie_suggestions` endpoint, maps results through `mapMovie`, filters to torrents with seeds > 1, and enriches with `inLibrary`/`libraryId` from the library

## 2. Client — FilterPanel component

- [x] 2.1 Create `client/src/components/FilterPanel.svelte` with props for current filter values and an `onchange` callback; include controls for: genre multi-select, minimum rating (discrete: Any/6+/7+/8+/9+), minimum year (text or number input), sort field (select), sort direction (toggle/select)
- [x] 2.2 Populate genre options from the static YTS genre list (Action, Adventure, Animation, Biography, Comedy, Crime, Documentary, Drama, Family, Fantasy, Film-Noir, History, Horror, Music, Musical, Mystery, Romance, Sci-Fi, Sport, Thriller, War, Western)
- [x] 2.3 Style the filter panel to match the existing dark theme (border, background matching `.load-more` button style)

## 3. Client — MovieGrid filter integration

- [x] 3.1 In `MovieGrid.svelte`, add filter state: `selectedGenres` (string[]), `minRating` (number, default 0), `minYear` (number | null), `sortBy` (string, default "download_count"), `orderBy` (string, default "desc")
- [x] 3.2 Add a "Filters" toggle button above/below the search bar that shows/hides `FilterPanel`; show a visual indicator (e.g., a colored dot or badge) when any filter differs from its default
- [x] 3.3 Update `fetchMovies` to include filter params in the `/api/movies` request (`genre`, `minimum_rating`, `sort_by`, `order_by`); when multiple genres selected, fetch each in parallel and merge/dedup by `movie.id`
- [x] 3.4 Apply client-side `minYear` filter to results after fetch
- [x] 3.5 Ensure any filter change resets `currentPage` to 1 before fetching

## 4. Client — "More like this" in MovieCard

- [x] 4.1 Add a "More like this" button to `MovieCard.svelte`; emit/callback with the movie's `id` and `title` when clicked
- [x] 4.2 In `MovieGrid.svelte`, add `suggestionsContext` state (`{ movieId, movieTitle } | null`); when set, fetch `/api/movies/:id/suggestions` and display results in place of the normal grid with a "More like [Title]" heading
- [x] 4.3 Add a "← Back" button when in suggestions mode that restores the previous results (no re-fetch) and clears `suggestionsContext`
- [x] 4.4 Display "No similar movies found" when the suggestions fetch returns an empty list

## 5. Verification

- [x] 5.1 Verify genre filter: single and multi-genre selections return expected results
- [x] 5.2 Verify minimum rating filter: setting 7+ excludes lower-rated movies
- [x] 5.3 Verify minimum year filter: setting 2015 hides older movies in the rendered grid
- [x] 5.4 Verify sort: switching sort field and direction reorders results
- [x] 5.5 Verify suggestions: "More like this" fetches and displays suggestions; back navigation restores prior results
- [x] 5.6 Verify filter indicator shows/hides correctly as filters are applied and cleared
