## MODIFIED Requirements

### Requirement: Start streaming from magnet link
The system SHALL accept a magnet link and associated metadata via `POST /api/library/add`. The server SHALL create the item's library folder, write `metadata.json`, fetch metadata and poster from TMDB, and add the torrent to the download manager. The response SHALL include the item's library ID which the client uses to construct the stream URL.

#### Scenario: Valid magnet link submitted with metadata
- **WHEN** client sends `POST /api/library/add` with a valid magnet link and metadata object
- **THEN** server creates the library folder, writes `metadata.json`, starts the torrent download, and responds with `{ id, streamUrl }` where `streamUrl` is `/api/library/:id/stream`

#### Scenario: Invalid or missing magnet link
- **WHEN** client sends `POST /api/library/add` with no magnet or a malformed value
- **THEN** server responds with HTTP 400 and an error message

#### Scenario: Item already in library
- **WHEN** client sends `POST /api/library/add` for an item whose ID is already in the library index
- **THEN** server responds with the existing item's `{ id, streamUrl }` without creating a duplicate

### Requirement: Serve file as HTTP range-request stream
The system SHALL serve the selected file at `GET /api/library/:id/stream` with full HTTP range request support. During download, the file is streamed via WebTorrent's `file.createReadStream()`. Once the download is complete, the file is served directly via `fs.createReadStream()`. Both paths support the same range request interface.

#### Scenario: Client requests stream with range header while downloading
- **WHEN** browser sends `GET /api/library/:id/stream` with a Range header and the item is still downloading
- **THEN** server responds with HTTP 206 and the requested byte range via WebTorrent's read stream

#### Scenario: Client requests stream with range header when complete
- **WHEN** browser sends `GET /api/library/:id/stream` with a Range header and the item is complete
- **THEN** server responds with HTTP 206 and the requested byte range served from the local file via `fs.createReadStream`

#### Scenario: Unknown library ID
- **WHEN** browser sends `GET /api/library/:id/stream` with an ID not in the library index
- **THEN** server responds with HTTP 404

### Requirement: Auto-select video file from multi-file torrent
The system SHALL automatically select the largest file in a torrent as the stream target when the torrent contains multiple files.

#### Scenario: Torrent contains multiple files
- **WHEN** a torrent is added that contains more than one file
- **THEN** the system identifies and streams the largest file by byte size

#### Scenario: Torrent contains a single file
- **WHEN** a torrent contains exactly one file
- **THEN** that file is streamed without size comparison

## REMOVED Requirements

### Requirement: Clean up temp files after stream ends
**Reason**: Files are now kept permanently in the library. There is no cleanup — the library is persistent by design.
**Migration**: Remove all grace-period and cleanup logic from the stream route. The `destroyStore: true` option is no longer passed to `torrent.destroy()`.

### Requirement: Limit concurrent active torrents
**Reason**: Replaced by the download-manager capability which supports unlimited concurrent downloads.
**Migration**: Remove the `active` singleton and `destroyActive()` function. All torrent lifecycle is managed by `server/library/manager.js`.
