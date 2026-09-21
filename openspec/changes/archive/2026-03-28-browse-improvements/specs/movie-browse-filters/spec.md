## ADDED Requirements

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
