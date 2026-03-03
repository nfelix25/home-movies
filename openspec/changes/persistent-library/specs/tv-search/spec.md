## ADDED Requirements

### Requirement: TV search results indicate library status
The system SHALL check each episode result against the library index and include an `inLibrary` boolean in the API response for each episode. The client SHALL display a visual indicator on episode rows that are already present in the library.

#### Scenario: Search returns episodes already in library
- **WHEN** the client calls the TV search endpoint and some episodes are already in the library
- **THEN** those episodes include `inLibrary: true` and the client renders a visible indicator on their rows

#### Scenario: Search returns episodes not in library
- **WHEN** an episode result is not in the library
- **THEN** that episode includes `inLibrary: false` and no indicator is shown

## MODIFIED Requirements

### Requirement: Initiate stream from episode
The system SHALL allow the user to select an episode to stream. Selecting an episode SHALL send the episode's magnet link and metadata to `POST /api/library/add`, which adds the item to the library and begins downloading. The client SHALL transition to the player view using the stream URL returned by the library add response.

#### Scenario: User clicks an episode
- **WHEN** user clicks an episode row
- **THEN** system sends the episode's magnet link and metadata to `POST /api/library/add`, receives `{ id, streamUrl }`, and transitions to the player using that stream URL

#### Scenario: Episode already in library
- **WHEN** user clicks an episode row that is already in the library
- **THEN** system navigates directly to the player using the existing library stream URL without calling `POST /api/library/add` again
