### Requirement: Genre filter
The system SHALL allow users to filter movies by one or more genres. Genre selection uses OR semantics: results include movies matching any selected genre. When multiple genres are selected the server SHALL fetch each genre in parallel and merge results, deduplicating by movie ID.

Supported genres SHALL match the YTS genre list: Action, Adventure, Animation, Biography, Comedy, Crime, Documentary, Drama, Family, Fantasy, Film-Noir, History, Horror, Music, Musical, Mystery, Romance, Sci-Fi, Sport, Thriller, War, Western.

#### Scenario: Single genre selected
- **WHEN** the user selects one genre (e.g., "Horror")
- **THEN** the movie grid SHALL display only movies tagged with that genre by YTS

#### Scenario: Multiple genres selected
- **WHEN** the user selects two or more genres (e.g., "Comedy" and "Drama")
- **THEN** the movie grid SHALL display movies matching any of the selected genres, deduplicated by movie ID

#### Scenario: No genre selected
- **WHEN** no genre filter is active
- **THEN** the movie grid SHALL behave identically to the current default (no genre restriction)

#### Scenario: Genre filter cleared
- **WHEN** the user removes all selected genres
- **THEN** the movie grid SHALL revert to unfiltered results

---

### Requirement: Minimum rating filter
The system SHALL allow users to set a minimum IMDb rating threshold. The filter SHALL accept discrete values: 0 (any), 6, 7, 8, 9. The server SHALL pass `minimum_rating` to the YTS API.

#### Scenario: Minimum rating applied
- **WHEN** the user sets minimum rating to 7
- **THEN** the movie grid SHALL display only movies with an IMDb rating of 7.0 or higher

#### Scenario: No minimum rating set
- **WHEN** the minimum rating is set to 0 (default/any)
- **THEN** the server SHALL omit `minimum_rating` from the YTS request

---

### Requirement: Minimum year filter
The system SHALL allow users to filter out movies released before a given year. Because the YTS API has no year parameter, the filter SHALL be applied client-side after results are fetched.

#### Scenario: Minimum year applied
- **WHEN** the user sets minimum year to 2010
- **THEN** the movie grid SHALL display only movies with `year >= 2010`

#### Scenario: No minimum year set
- **WHEN** minimum year is unset or set to its default
- **THEN** no year filtering SHALL be applied client-side

---

### Requirement: Sort order
The system SHALL allow users to control the sort field and direction for movie results. The server SHALL pass `sort_by` and `order_by` to the YTS API.

Supported sort fields: Download Count (default), Rating, Year, Seeds, Like Count, Date Added, Title.
Supported directions: Descending (default), Ascending.

#### Scenario: Sort by rating descending
- **WHEN** the user selects "Rating" with direction "Descending"
- **THEN** the movie grid SHALL display movies ordered from highest to lowest IMDb rating

#### Scenario: Sort by year ascending
- **WHEN** the user selects "Year" with direction "Ascending"
- **THEN** the movie grid SHALL display movies ordered from oldest to newest

#### Scenario: Default sort
- **WHEN** no explicit sort is chosen
- **THEN** movies SHALL be sorted by download count descending (YTS default)

---

### Requirement: Filter panel UI
The system SHALL provide a collapsible filter panel below the search bar in the movie browse view. The panel SHALL be toggled by a "Filters" button. When any filter is active the toggle button SHALL show a visual indicator (e.g., a badge or dot).

Changing any filter value SHALL immediately reset the page to 1 and trigger a new fetch.

#### Scenario: Panel collapsed by default
- **WHEN** the user first opens the movie browse view
- **THEN** the filter panel SHALL be collapsed and not visible

#### Scenario: Filter active indicator
- **WHEN** at least one filter differs from its default value
- **THEN** the "Filters" toggle button SHALL display a visual indicator

#### Scenario: Filter change resets pagination
- **WHEN** the user changes any filter while on page 2 or later
- **THEN** results SHALL reset to page 1

---

### Requirement: Server filter passthrough
The `/api/movies` endpoint SHALL accept and forward the following query parameters to the YTS API: `genre` (string), `minimum_rating` (integer 0–9), `sort_by` (string), `order_by` (string "asc" | "desc").

Unknown or invalid parameter values SHALL be ignored (not forwarded).

#### Scenario: Valid params forwarded
- **WHEN** a request includes `minimum_rating=7&sort_by=rating&order_by=desc`
- **THEN** the server SHALL include those params in the YTS API request

#### Scenario: Missing params omitted
- **WHEN** a request omits `minimum_rating`
- **THEN** the server SHALL NOT include `minimum_rating` in the YTS API request

---

### Requirement: Page size control
The movie browse view SHALL allow users to select the number of results loaded per page: 20 (default), 50, or 100. The selected value SHALL be passed to the server as a `limit` query parameter.

Because the YTS API caps `limit` at 50, a page size of 100 SHALL be implemented by fetching two pages of 50 in parallel (pages 1 and 2 for the first load, pages N and N+1 for subsequent loads) and merging the results. The "Load more" button SHALL advance by the equivalent number of YTS pages.

Changing the page size SHALL reset to page 1 and re-fetch.

#### Scenario: Default page size
- **WHEN** the user first opens the browse view
- **THEN** 20 movies SHALL be loaded per page

#### Scenario: Page size set to 50
- **WHEN** the user selects "50" from the page size control
- **THEN** up to 50 movies SHALL be loaded per page
- **THEN** the server SHALL receive `limit=50`

#### Scenario: Page size set to 100
- **WHEN** the user selects "100" from the page size control
- **THEN** up to 100 movies SHALL be loaded per page (two YTS requests merged)

#### Scenario: Page size change resets pagination
- **WHEN** the user changes the page size while on page 2 or later
- **THEN** results SHALL reset to page 1
