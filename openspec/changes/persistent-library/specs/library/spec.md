## ADDED Requirements

### Requirement: Library uses a folder-per-item structure under the app root
The system SHALL store all media in a `library/` directory at the app root, with `library/movies/` and `library/tv/` subdirectories created automatically on startup if they do not exist. Each movie SHALL have its own subfolder named `Title (Year)` containing the video file, `metadata.json`, and `poster.jpg`. Each TV show SHALL have a subfolder named after the show, containing a `poster.jpg`, a show-level `metadata.json`, and per-season subdirectories named `Season XX` containing episode files.

#### Scenario: First server start
- **WHEN** the server starts and `library/` does not exist
- **THEN** the system creates `library/movies/` and `library/tv/` automatically

#### Scenario: Movie folder structure
- **WHEN** a movie is added to the library
- **THEN** the system creates `library/movies/Title (Year)/` containing the video file, `metadata.json`, and `poster.jpg`

#### Scenario: TV episode folder structure
- **WHEN** a TV episode is added to the library
- **THEN** the system creates `library/tv/Show Name/Season XX/` containing the episode file, with show-level `metadata.json` and `poster.jpg` under `library/tv/Show Name/`

### Requirement: Library index is built from disk on startup
The system SHALL scan `library/movies/` and `library/tv/` at startup and build an in-memory index of all discoverable items before the HTTP server accepts requests. Each item in the index SHALL include its library ID, metadata, file path, and status.

#### Scenario: Existing library on startup
- **WHEN** the server starts and `library/` contains previously downloaded items
- **THEN** all items with `metadata.json` are added to the in-memory index and available via the library API immediately

#### Scenario: Empty library on startup
- **WHEN** the server starts and `library/` contains no items
- **THEN** the index is empty and `GET /api/library` returns an empty array

### Requirement: Manually added files are discovered automatically
The system SHALL discover and index media files placed manually into the library folder structure, provided they follow the naming convention (`library/movies/Title (Year)/` for movies, `library/tv/Show Name/Season XX/SxxExx` for TV episodes). If no `metadata.json` is present, the system SHALL attempt a TMDB lookup using the parsed folder name and write `metadata.json` and `poster.jpg` before adding to the index.

#### Scenario: Manually added movie with correct folder name
- **WHEN** the server starts and finds a movie folder matching `Title (Year)` with no `metadata.json`
- **THEN** the system parses the title and year, queries TMDB, writes `metadata.json` and `poster.jpg`, and adds the item to the index

#### Scenario: Manually added file with unrecognisable folder name
- **WHEN** the server starts and finds a media folder that cannot be parsed for title and year
- **THEN** the system adds the item to the index with a `local-{slug}` ID and no poster

### Requirement: Library items can be listed
The system SHALL expose `GET /api/library` returning all indexed items as a JSON array, each including the item's ID, title, type (movie/tv), status (downloading/complete), progress (0–1 for downloading items), and poster URL.

#### Scenario: Library with mixed items
- **WHEN** client calls `GET /api/library`
- **THEN** server returns all items including both complete and in-progress downloads with accurate progress values

### Requirement: Library items can be removed
The system SHALL expose `DELETE /api/library/:id` which removes the item from the index, stops any active torrent for that item, and deletes the item's folder and all its contents from disk.

#### Scenario: Remove a complete item
- **WHEN** client calls `DELETE /api/library/:id` for a completed item
- **THEN** server removes the item from the index and deletes its folder from disk

#### Scenario: Remove a downloading item
- **WHEN** client calls `DELETE /api/library/:id` for an item currently downloading
- **THEN** server stops the torrent, removes the item from the downloads map and index, and deletes its folder from disk

#### Scenario: Remove a non-existent item
- **WHEN** client calls `DELETE /api/library/:id` with an unknown ID
- **THEN** server responds with HTTP 404
