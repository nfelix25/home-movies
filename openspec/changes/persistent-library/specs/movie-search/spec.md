## ADDED Requirements

### Requirement: Movie search results indicate library status
The system SHALL check each search result against the library index and include an `inLibrary` boolean in the API response for each movie. The client SHALL display a visual indicator (e.g., a badge or icon) on movie cards that are already present in the library.

#### Scenario: Search returns movies already in library
- **WHEN** the client calls the movie search endpoint and some results are already in the library
- **THEN** those results include `inLibrary: true` and the client renders a visible "In Library" badge on their cards

#### Scenario: Search returns movies not in library
- **WHEN** the client calls the movie search endpoint and a result is not in the library
- **THEN** that result includes `inLibrary: false` and no badge is shown

## MODIFIED Requirements

### Requirement: Select quality and initiate stream
The system SHALL display available quality tiers (720p, 1080p, 2160p) for each movie and allow the user to select one to stream. Selecting a quality SHALL send the magnet link and movie metadata to `POST /api/library/add`, which adds the item to the library and begins downloading. The client SHALL transition to the player view using the stream URL returned by the library add response.

#### Scenario: User selects a quality tier
- **WHEN** user clicks a quality option on a movie card
- **THEN** system sends the magnet link and metadata to `POST /api/library/add`, receives `{ id, streamUrl }`, and transitions to the player using that stream URL

#### Scenario: Single quality available
- **WHEN** a movie has only one quality tier
- **THEN** system initiates the library add and stream immediately without prompting for quality selection

#### Scenario: Movie already in library
- **WHEN** user clicks a quality option on a movie card that is already in the library
- **THEN** system navigates directly to the player using the existing library stream URL without calling `POST /api/library/add` again
