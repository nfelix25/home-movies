## ADDED Requirements

### Requirement: Movie suggestions endpoint
The system SHALL expose a `GET /api/movies/:id/suggestions` endpoint that returns movies similar to the given YTS movie ID. The endpoint SHALL call the YTS `movie_suggestions` API (`/api/v2/movie_suggestions.json?movie_id=<id>`), map the response to the same movie shape used by `/api/movies`, and enrich each result with `inLibrary` and `libraryId` fields from the local library.

#### Scenario: Valid movie ID with suggestions
- **WHEN** a request is made to `/api/movies/12345/suggestions`
- **THEN** the response SHALL be `{ movies: [...] }` using the same movie shape as `/api/movies`
- **THEN** each movie SHALL include `inLibrary` and `libraryId` fields

#### Scenario: Movie with no suggestions
- **WHEN** the YTS API returns an empty suggestions list for the given ID
- **THEN** the endpoint SHALL return `{ movies: [] }` with status 200

#### Scenario: YTS API error
- **WHEN** the YTS suggestions API returns a non-OK status
- **THEN** the endpoint SHALL return status 502 with `{ error: "Unable to fetch suggestions from YTS at this time." }`

---

### Requirement: "More like this" trigger on MovieCard
Each movie card in the browse view SHALL include a "More like this" button. Activating it SHALL replace the current movie grid contents with the suggestions for that movie, and display a contextual heading (e.g., "More like [Movie Title]") with a "← Back" action to return to the previous results.

#### Scenario: User activates "More like this"
- **WHEN** the user clicks "More like this" on a movie card
- **THEN** the movie grid SHALL display a heading "More like [Movie Title]"
- **THEN** the grid SHALL show the suggestion results for that movie
- **THEN** a back control SHALL be visible

#### Scenario: User returns from suggestions
- **WHEN** the user clicks the back control
- **THEN** the movie grid SHALL restore the previous search/filter results without re-fetching

#### Scenario: No suggestions available
- **WHEN** the suggestions endpoint returns an empty list
- **THEN** the movie grid SHALL display a message such as "No similar movies found"
- **THEN** the back control SHALL still be visible

---

### Requirement: Suggestions reuse movie card rendering
Suggestion results SHALL be rendered using the same `MovieCard` component used for regular browse results, including play/queue controls and "In Library" badges.

#### Scenario: Suggestion result cards match browse cards
- **WHEN** suggestions are displayed
- **THEN** each result SHALL show the same fields as a standard MovieCard (poster, title, year, rating, torrent qualities, play/queue buttons, in-library badge)
