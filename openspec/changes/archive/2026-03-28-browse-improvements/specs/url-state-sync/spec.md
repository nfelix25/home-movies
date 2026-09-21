## ADDED Requirements

### Requirement: Browse state reflected in URL
The movie browse view SHALL reflect its current state in the browser URL query string using `history.replaceState` on every state change. The following state SHALL be synced: search query (`q`), selected genres (`genre`, comma-separated), minimum rating (`rating`), minimum year (`year`), sort field (`sort`), sort direction (`order`), and page size (`limit`).

Parameters at their default values SHALL be omitted from the URL to keep it clean.

#### Scenario: Search query synced
- **WHEN** the user types a search query
- **THEN** the URL SHALL update to include `?q=<query>`

#### Scenario: Active filters synced
- **WHEN** the user selects genres, sets a rating, and changes the sort
- **THEN** the URL SHALL include `?genre=Action,Drama&rating=7&sort=rating`

#### Scenario: Default values omitted
- **WHEN** all filters are at their default values
- **THEN** the URL SHALL have no query string (or an empty one)

---

### Requirement: Browse state restored from URL on load
When the movie browse view mounts, it SHALL read the current URL query string and initialise its state from any recognised parameters before performing the initial fetch. This allows bookmarked or shared URLs to reproduce the same results.

#### Scenario: Page loaded with query params
- **WHEN** the user navigates to `/?q=inception&rating=7&sort=rating`
- **THEN** the search field SHALL be pre-filled with "inception"
- **THEN** the minimum rating filter SHALL be set to 7
- **THEN** the sort SHALL be set to "rating"
- **THEN** the movie grid SHALL immediately fetch and show results matching that state

#### Scenario: Page loaded with genre params
- **WHEN** the user navigates to `/?genre=Action,Comedy`
- **THEN** both "Action" and "Comedy" SHALL be selected in the genre filter
- **THEN** the filter panel active indicator SHALL be shown

#### Scenario: Page loaded with no params
- **WHEN** the user navigates to `/` with no query string
- **THEN** the browse view SHALL initialise with default state (as before)
