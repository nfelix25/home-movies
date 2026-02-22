## ADDED Requirements

### Requirement: Start streaming from magnet link
The system SHALL accept a magnet link via POST /api/stream and begin downloading the torrent via WebTorrent. The response SHALL include a stream URL and the torrent's infoHash.

#### Scenario: Valid magnet link submitted
- **WHEN** client sends POST /api/stream with a valid magnet link
- **THEN** server adds the torrent to WebTorrent and responds with { streamUrl, infoHash }

#### Scenario: Invalid or missing magnet link
- **WHEN** client sends POST /api/stream with no magnet or a malformed value
- **THEN** server responds with HTTP 400 and an error message

### Requirement: Serve file as HTTP range-request stream
The system SHALL serve the selected torrent file at GET /stream/:infoHash/:fileIndex with full HTTP range request support so a browser `<video>` element can seek and buffer.

#### Scenario: Client requests stream with range header
- **WHEN** browser sends GET /stream/:infoHash/:fileIndex with a Range header
- **THEN** server responds with HTTP 206 and the requested byte range of the file

#### Scenario: Client requests stream without range header
- **WHEN** browser sends GET /stream/:infoHash/:fileIndex without a Range header
- **THEN** server responds with HTTP 200 and begins streaming the full file

### Requirement: Auto-select video file from multi-file torrent
The system SHALL automatically select the largest file in a torrent as the stream target when a fileIndex is not specified or when the torrent contains multiple files.

#### Scenario: Torrent contains multiple files
- **WHEN** a torrent is added that contains more than one file
- **THEN** the system identifies and streams the largest file by byte size

#### Scenario: Torrent contains a single file
- **WHEN** a torrent contains exactly one file
- **THEN** that file is streamed without size comparison

### Requirement: Clean up temp files after stream ends
The system SHALL delete downloaded temp files and remove the torrent from WebTorrent after the streaming connection closes. A 30-second grace period SHALL be observed before deletion to tolerate brief network interruptions.

#### Scenario: Client closes the video player
- **WHEN** the HTTP streaming connection closes (req close event fires)
- **THEN** after a 30-second grace period, server removes the torrent and deletes its temp directory

#### Scenario: Client reconnects within grace period
- **WHEN** a new streaming request for the same infoHash arrives within 30 seconds of the previous connection closing
- **THEN** the grace period is cancelled and streaming resumes without re-downloading

#### Scenario: Inactivity timeout
- **WHEN** a streaming connection is open but no bytes have been read for 10 minutes
- **THEN** server closes the connection and begins the cleanup grace period

### Requirement: Limit concurrent active torrents
The system SHALL allow at most one active torrent at a time. Starting a new stream while one is active SHALL stop the previous torrent and clean up its temp files immediately.

#### Scenario: New stream requested while one is active
- **WHEN** client sends POST /api/stream while another torrent is currently streaming
- **THEN** server stops the existing torrent, deletes its temp files, and starts the new one
