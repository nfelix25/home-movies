## ADDED Requirements

### Requirement: Search TV shows by name
The system SHALL allow users to search for TV shows by name using the EZTV API. The search SHALL return episodes matching the query, grouped by season.

#### Scenario: User searches for a show
- **WHEN** user types a show name in the search bar on the TV tab and submits
- **THEN** system queries EZTV with the search term and displays matching episodes

#### Scenario: No results found
- **WHEN** EZTV returns zero episodes for a search query
- **THEN** system displays an empty state message indicating no results were found

### Requirement: Display episodes grouped by season
The system SHALL group returned episodes by season and display them in collapsible season sections, ordered from latest to oldest season. Within each season, episodes SHALL be ordered by episode number ascending.

#### Scenario: Multi-season show results
- **WHEN** search results include episodes from multiple seasons
- **THEN** episodes are grouped into labeled sections (e.g., "Season 3", "Season 2") with the latest season expanded by default

#### Scenario: Single season results
- **WHEN** all results belong to one season
- **THEN** a single season section is displayed, expanded

#### Scenario: Episode with unknown season
- **WHEN** an episode cannot be parsed for season/episode number
- **THEN** it is placed in an "Unknown" group at the bottom

### Requirement: Initiate stream from episode
The system SHALL allow the user to select an episode to stream. Selecting an episode SHALL pass its magnet link to the torrent streaming capability.

#### Scenario: User clicks an episode
- **WHEN** user clicks an episode row
- **THEN** system sends the episode's magnet link to the streaming endpoint and transitions to the player view

### Requirement: TV tab is search-only
The TV tab SHALL NOT display any content before the user performs a search. It SHALL display a prompt encouraging the user to search for a show.

#### Scenario: User opens TV tab without searching
- **WHEN** user navigates to the TV tab without having searched
- **THEN** system displays a search prompt and no episode results
