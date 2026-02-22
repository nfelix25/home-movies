## ADDED Requirements

### Requirement: Browse popular movies
The system SHALL display a grid of popular movies on the Movies tab by default, fetched from the YTS API sorted by download count. Each result SHALL include poster image, title, release year, IMDb rating, and available quality tiers.

#### Scenario: Default movies tab load
- **WHEN** user opens the Movies tab
- **THEN** system fetches popular movies from YTS and displays them as a grid of cards with poster, title, year, and rating

#### Scenario: Poster unavailable
- **WHEN** YTS returns a movie with no poster URL
- **THEN** system displays a placeholder image in place of the poster

### Requirement: Search movies by title
The system SHALL allow users to search for movies by title using the YTS API. Results SHALL replace the browse grid and include the same fields as browse results.

#### Scenario: User searches for a title
- **WHEN** user types a query in the search bar on the Movies tab and submits
- **THEN** system queries YTS with the search term and displays matching movies as a grid

#### Scenario: No results found
- **WHEN** the YTS API returns zero results for a search query
- **THEN** system displays an empty state message indicating no movies were found

### Requirement: Select quality and initiate stream
The system SHALL display available quality tiers (720p, 1080p, 2160p) for each movie and allow the user to select one to stream. Selecting a quality SHALL pass the corresponding magnet link to the torrent streaming capability.

#### Scenario: User selects a quality tier
- **WHEN** user clicks a quality option on a movie card
- **THEN** system sends the corresponding magnet link to the streaming endpoint and transitions to the player view

#### Scenario: Single quality available
- **WHEN** a movie has only one quality tier
- **THEN** system initiates the stream immediately without prompting for quality selection

### Requirement: Paginate movie results
The system SHALL support loading additional pages of results for both browse and search modes.

#### Scenario: User loads more results
- **WHEN** user clicks a "Load more" control
- **THEN** system fetches the next page from YTS and appends results to the existing grid
