## ADDED Requirements

### Requirement: Media Session metadata is set when a stream becomes active
When a new stream URL is set, the system SHALL update `navigator.mediaSession.metadata` with the title of the currently-playing item, if the Media Session API is available in the browser.

#### Scenario: Metadata set on stream start
- **WHEN** a new streamUrl is assigned (new torrent loaded)
- **THEN** `navigator.mediaSession.metadata` is updated with the item title as the track title

#### Scenario: Media Session API not available
- **WHEN** `navigator.mediaSession` is undefined (unsupported browser)
- **THEN** no error is thrown and playback continues normally

### Requirement: Lock screen play and pause actions control the video element
The system SHALL register `play` and `pause` Media Session action handlers that call `video.play()` and `video.pause()` respectively.

#### Scenario: Play from lock screen
- **WHEN** user taps the play button on the Android lock screen
- **THEN** the video element resumes playback

#### Scenario: Pause from lock screen
- **WHEN** user taps the pause button on the Android lock screen
- **THEN** the video element pauses

### Requirement: Lock screen next and previous actions navigate the queue
The system SHALL register `nexttrack` and `previoustrack` Media Session action handlers that call `queue.next()` and `queue.prev()` respectively.

#### Scenario: Next track from lock screen
- **WHEN** user taps the next button on the Android lock screen and a next item exists
- **THEN** the queue advances and the next item begins streaming

#### Scenario: Previous track from lock screen
- **WHEN** user taps the previous button on the Android lock screen and a previous item exists
- **THEN** the queue moves back and the previous item begins streaming

#### Scenario: Next track disabled at end of queue
- **WHEN** the current item is the last in the queue
- **THEN** the `nexttrack` handler SHALL be set to `null` to signal unavailability to the OS

#### Scenario: Previous track disabled at start of queue
- **WHEN** the current item is the first in the queue
- **THEN** the `previoustrack` handler SHALL be set to `null` to signal unavailability to the OS

### Requirement: Media Session playback state tracks video play/pause
The system SHALL update `navigator.mediaSession.playbackState` to `"playing"` or `"paused"` in response to the video element's `play` and `pause` events.

#### Scenario: Playback state reflects video state
- **WHEN** the video element emits a `play` event
- **THEN** `navigator.mediaSession.playbackState` is set to `"playing"`
- **WHEN** the video element emits a `pause` event
- **THEN** `navigator.mediaSession.playbackState` is set to `"paused"`
