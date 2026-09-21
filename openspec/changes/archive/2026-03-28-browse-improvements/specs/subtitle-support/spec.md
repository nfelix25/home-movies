## ADDED Requirements

### Requirement: Subtitle proxy endpoint
The system SHALL expose a `GET /api/subtitles?imdb_id=<id>` endpoint that searches OpenSubtitles for English subtitles matching the given IMDb ID, downloads the best result, converts it from SRT to WebVTT format, and returns the VTT content with `Content-Type: text/vtt`.

If the `OPENSUBTITLES_API_KEY` environment variable is not set, the endpoint SHALL return status 501.
If no English subtitles are found, the endpoint SHALL return status 404.
If the subtitle download or conversion fails, the endpoint SHALL return status 502.

The search SHALL select the subtitle file with the highest `download_count` among English results.

#### Scenario: Subtitles found and returned
- **WHEN** a request is made to `/api/subtitles?imdb_id=tt0133093`
- **THEN** the response SHALL be a valid WebVTT document with `Content-Type: text/vtt`

#### Scenario: No subtitles found
- **WHEN** OpenSubtitles returns no English results for the given IMDb ID
- **THEN** the endpoint SHALL return status 404

#### Scenario: API key not configured
- **WHEN** `OPENSUBTITLES_API_KEY` is not set
- **THEN** the endpoint SHALL return status 501

---

### Requirement: Subtitle track in video player
The player store SHALL accept an optional `imdbId` field. When `imdbId` is set and the stream URL is resolved, the player component SHALL fetch `/api/subtitles?imdb_id=<imdbId>` and, on success, add a `<track>` element to the `<video>` with `kind="subtitles"`, `label="English"`, and `srclang="en"`. The track SHALL be set as default.

If the subtitle fetch returns a non-200 status, the player SHALL continue without subtitles (no error shown to the user).

#### Scenario: Subtitles load successfully
- **WHEN** the player activates with a movie that has an IMDb ID and subtitles are available
- **THEN** an English subtitle track SHALL appear in the video player controls
- **THEN** the subtitle track SHALL be enabled by default

#### Scenario: Subtitles unavailable
- **WHEN** the subtitle endpoint returns 404 or 501
- **THEN** the player SHALL function normally without a subtitle track
- **THEN** no error message SHALL be shown to the user

#### Scenario: Player activated without imdbId
- **WHEN** the player is activated without an `imdbId` (e.g., for TV episodes)
- **THEN** no subtitle fetch SHALL be attempted
