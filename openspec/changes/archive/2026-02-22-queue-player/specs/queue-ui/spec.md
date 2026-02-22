## ADDED Requirements

### Requirement: MovieCard shows two play actions per quality tier
Each quality button on a MovieCard SHALL be split into two actions: "Play now" and "Add to queue".

#### Scenario: Play now from MovieCard
- **WHEN** user clicks "▶ Play" next to a quality tier
- **THEN** that torrent is inserted at the front of the queue and streaming begins immediately

#### Scenario: Add to queue from MovieCard
- **WHEN** user clicks "+ Queue" next to a quality tier
- **THEN** that torrent is appended to the end of the queue without interrupting current playback

### Requirement: EpisodeRow shows two play actions
Each episode row SHALL expose both a "Play now" and an "Add to queue" action.

#### Scenario: Play now from EpisodeRow
- **WHEN** user clicks the play button on an episode
- **THEN** that episode is inserted at the front of the queue and streaming begins immediately

#### Scenario: Add to queue from EpisodeRow
- **WHEN** user clicks the queue button on an episode
- **THEN** that episode is appended to the end of the queue without interrupting current playback

### Requirement: Player controls include prev, next, and queue toggle
The player header SHALL contain a previous (⏮) button, a next (⏭) button, and a queue toggle (≡) button, in addition to the existing close button.

#### Scenario: Prev and next visible in player
- **WHEN** the player is open
- **THEN** prev and next buttons are visible in the player header

#### Scenario: Prev disabled at start of queue
- **WHEN** the current index is 0
- **THEN** the previous button is visually disabled and non-interactive

#### Scenario: Next disabled at end of queue
- **WHEN** the current index is the last item in the queue
- **THEN** the next button is visually disabled and non-interactive

### Requirement: Queue panel is a collapsible panel within the player
The queue panel SHALL slide in from the right side of the player overlay when toggled. On narrow screens (mobile), it SHALL overlay the video as a full-width drawer.

#### Scenario: Toggle queue panel open
- **WHEN** user clicks the queue toggle button (≡) and the panel is closed
- **THEN** the queue panel becomes visible showing all queued items

#### Scenario: Toggle queue panel closed
- **WHEN** user clicks the queue toggle button again and the panel is open
- **THEN** the queue panel is hidden

### Requirement: Queue panel shows items with current item highlighted
The queue panel SHALL list all items in order. The currently-playing item SHALL be visually distinguished (e.g. highlighted background or play indicator).

#### Scenario: Current item highlighted
- **WHEN** the queue panel is open
- **THEN** the item at currentIndex has a distinct visual treatment from other items

### Requirement: Queue panel items support drag-to-reorder
Items in the queue panel SHALL be draggable to a new position via drag handle. Touch drag SHALL work on mobile.

#### Scenario: Drag item to new position
- **WHEN** user drags a queue item using its drag handle
- **THEN** the item moves to the dropped position and the list updates immediately

### Requirement: Queue panel items can be individually removed
Each queue item SHALL have a remove button (✕) that removes it from the queue.

#### Scenario: Remove item via button
- **WHEN** user clicks ✕ on a queue item
- **THEN** that item is removed from the queue
