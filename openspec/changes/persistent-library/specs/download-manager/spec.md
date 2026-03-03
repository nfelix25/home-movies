## ADDED Requirements

### Requirement: Multiple torrents can download concurrently
The system SHALL maintain a map of active torrents keyed by infoHash, allowing multiple torrents to download simultaneously without interference. Adding a new torrent SHALL NOT stop or affect any existing download.

#### Scenario: Two downloads started in sequence
- **WHEN** client initiates two separate library additions with different magnet links
- **THEN** both torrents download concurrently and both appear in `GET /api/library` with accurate progress

#### Scenario: Streaming one item while another downloads
- **WHEN** a user streams item A while item B is downloading in the background
- **THEN** both operations proceed independently with no degradation to the stream

### Requirement: Torrent downloads directly into the library folder
The system SHALL add torrents to WebTorrent with the `path` option set to the item's library directory, so files are written directly to their permanent location and never moved or copied.

#### Scenario: Download writes to library path
- **WHEN** a magnet link is added for a movie titled "The Matrix (1999)"
- **THEN** WebTorrent writes the file to `library/movies/The Matrix (1999)/` as it downloads

### Requirement: Completed downloads update status and release the torrent
The system SHALL listen for the WebTorrent `done` event on each torrent. When fired, the system SHALL update the item's status to `complete` in the downloads map and in `metadata.json`, call `torrent.destroy()` without `destroyStore`, and set the torrent reference to null. The file remains on disk.

#### Scenario: Download completes
- **WHEN** a torrent fires its `done` event
- **THEN** the item's status is set to `complete`, the torrent object is destroyed, and the video file remains in the library folder

#### Scenario: Item accessible after torrent released
- **WHEN** the torrent has been destroyed after completion
- **THEN** `GET /api/library/:id/stream` continues to serve the file from disk via `fs.createReadStream`

### Requirement: In-progress downloads resume automatically on server restart
The system SHALL persist the magnet link and status in each item's `metadata.json`. On startup, the library scanner SHALL re-add any item with `status: "downloading"` to WebTorrent using the persisted magnet link and the same library directory path. WebTorrent SHALL resume downloading from the last verified piece.

#### Scenario: Server restarts during download
- **WHEN** the server process is stopped while a torrent is downloading and then restarted
- **THEN** the system re-adds the torrent to WebTorrent on startup, piece verification completes, and downloading resumes without re-downloading already-complete pieces

#### Scenario: Download completes before restart
- **WHEN** an item has `status: "complete"` in `metadata.json` at startup
- **THEN** the system adds it to the index only; no torrent is created

### Requirement: Download progress is tracked and exposed
The system SHALL track download progress (0.0–1.0) for each active torrent using WebTorrent's `progress` property, updated continuously. `GET /api/library` SHALL include the current `progress` value for all items with `status: "downloading"`.

#### Scenario: Progress reported during download
- **WHEN** a torrent is actively downloading and client polls `GET /api/library`
- **THEN** the item's `progress` field reflects the current download fraction (0.0 to 1.0)

#### Scenario: Progress for complete items
- **WHEN** an item has `status: "complete"`
- **THEN** its `progress` field is `1.0`
