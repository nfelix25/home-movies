## ADDED Requirements

### Requirement: Each library item has a metadata.json file
The system SHALL write a `metadata.json` file into each item's library folder when the item is first added. The file SHALL include: `id`, `title`, `year` (movies) or `season`/`episode` (TV), `type` (`movie` or `tv`), `status` (`downloading` or `complete`), `magnet`, `tmdbId` (if resolved), `addedAt` (ISO timestamp), and `posterPath` (relative path to `poster.jpg` if fetched).

#### Scenario: Movie added via search
- **WHEN** a movie is added from the search results
- **THEN** `metadata.json` is written to `library/movies/Title (Year)/` before the torrent begins downloading

#### Scenario: metadata.json persists status
- **WHEN** a download completes
- **THEN** `metadata.json` is updated in place to reflect `status: "complete"`

### Requirement: Movie metadata is resolved via TMDB using IMDB ID when available
The system SHALL use the TMDB find-by-external-ID endpoint (`/find/{imdb_id}?external_source=imdb_id`) to resolve a TMDB ID for movies added via YTS, since YTS provides an IMDB ID. This avoids fuzzy title matching and guarantees accuracy.

#### Scenario: Movie added from YTS with IMDB ID
- **WHEN** a movie is added from the YTS search results which include an IMDB ID
- **THEN** the system queries TMDB's find endpoint with the IMDB ID and stores the resolved `tmdbId` in `metadata.json`

#### Scenario: TMDB lookup fails
- **WHEN** the TMDB API returns no result for the given IMDB ID
- **THEN** the system proceeds without a `tmdbId` and logs a warning; the item is still added to the library

### Requirement: TV metadata is resolved via TMDB by show name
The system SHALL search TMDB by show name using `/search/tv?query={name}` and take the top result to resolve the show's TMDB ID. Episode-level metadata (title, air date) SHALL be fetched from `/tv/{show_id}/season/{s}/episode/{e}` and stored in the episode's `metadata.json`.

#### Scenario: TV episode added from EZTV search
- **WHEN** a TV episode is added from the EZTV search results
- **THEN** the system searches TMDB by show name, takes the top result, fetches episode detail, and stores show and episode metadata

### Requirement: Posters are downloaded and cached locally
The system SHALL download the TMDB poster image (at `w500` resolution) for each item and save it as `poster.jpg` in the item's library folder. For TV shows, one show-level poster is saved under `library/tv/Show Name/poster.jpg` and reused across all episodes of that show.

#### Scenario: Poster downloaded on add
- **WHEN** a library item is added and TMDB returns a poster path
- **THEN** the system downloads the image and saves it as `poster.jpg` in the item folder

#### Scenario: Poster already exists for show
- **WHEN** a second episode from the same TV show is added
- **THEN** the system does not re-download the show poster if `poster.jpg` already exists

#### Scenario: No poster available
- **WHEN** TMDB returns no poster path for an item
- **THEN** `metadata.json` is written without `posterPath` and the client displays a placeholder

### Requirement: Manually added files without metadata.json trigger automatic TMDB lookup
The system SHALL attempt to resolve metadata for any library file found without a `metadata.json` by parsing the folder name. Movie folders matching `Title (Year)` SHALL trigger a TMDB search by title and year. TV episode files matching `SxxExx` within a show folder SHALL trigger a show search plus episode detail fetch. A 250ms delay between TMDB calls during startup scan SHALL prevent rate limiting.

#### Scenario: Manual movie with parseable folder name
- **WHEN** startup scan finds `library/movies/Inception (2010)/Inception (2010).mkv` with no `metadata.json`
- **THEN** the system queries TMDB for "Inception" (2010), writes `metadata.json`, and downloads `poster.jpg`

#### Scenario: Manual TV episode with parseable path
- **WHEN** startup scan finds `library/tv/Succession/Season 03/S03E04 - Lion in the Meadow.mkv` with no `metadata.json`
- **THEN** the system searches TMDB for "Succession", fetches Season 3 Episode 4 details, writes `metadata.json`, and downloads `poster.jpg`

### Requirement: TMDB API key is loaded from environment
The system SHALL read the TMDB API key from the `TMDB_API_KEY` environment variable. If the variable is not set, TMDB lookups SHALL be skipped and a warning logged at startup; all other library functionality SHALL continue to work normally.

#### Scenario: TMDB_API_KEY not set
- **WHEN** the server starts without `TMDB_API_KEY` in the environment
- **THEN** a warning is logged, TMDB lookups are disabled, and items are added to the library without poster or TMDB-resolved metadata
