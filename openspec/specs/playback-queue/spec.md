## ADDED Requirements

### Requirement: Queue holds an ordered list of playable items
The system SHALL maintain a client-side queue of items, each with a stable id, title, magnet link, and optional quality label. The queue SHALL persist for the lifetime of the page session and SHALL be cleared when the page is reloaded.

#### Scenario: Queue starts empty
- **WHEN** the app loads
- **THEN** the queue contains zero items and no stream is active

### Requirement: Play now inserts item at front and starts playback immediately
The system SHALL insert the given item at index 0 of the queue and begin streaming it immediately, regardless of what was previously playing or queued.

#### Scenario: Play now on empty queue
- **WHEN** user clicks "Play now" and the queue is empty
- **THEN** the item is added as the only queue item and streaming begins

#### Scenario: Play now with existing queue
- **WHEN** user clicks "Play now" with items already in the queue
- **THEN** the new item is inserted at position 0, existing items shift down, and streaming switches to the new item

### Requirement: Add to queue appends item to the end
The system SHALL append the given item to the end of the queue without interrupting the currently playing item.

#### Scenario: Add to queue with active playback
- **WHEN** user clicks "Add to queue" and something is already playing
- **THEN** the item is appended to the end of the queue and playback continues uninterrupted

#### Scenario: Add to queue on empty queue
- **WHEN** user clicks "Add to queue" and the queue is empty
- **THEN** the item is added and streaming begins immediately (same behavior as Play now)

### Requirement: Auto-advance to next item on video end
When the current video reaches its natural end, the system SHALL automatically advance to the next item in the queue and begin streaming it.

#### Scenario: Video ends with next item in queue
- **WHEN** the current video's `ended` event fires and there is a next item in the queue
- **THEN** the queue advances to the next index and streaming begins for that item

#### Scenario: Video ends on last item
- **WHEN** the current video's `ended` event fires and there is no next item
- **THEN** the player remains open showing the ended state; no auto-close occurs

### Requirement: User can navigate to previous and next queue items
The system SHALL allow the user to manually skip to the previous or next item in the queue at any time while the player is open.

#### Scenario: Skip to next item
- **WHEN** user clicks the next (⏭) button and a next item exists
- **THEN** the queue advances by one and the new item begins streaming

#### Scenario: Skip to previous item
- **WHEN** user clicks the previous (⏮) button and a previous item exists
- **THEN** the queue moves back by one and that item begins streaming

#### Scenario: Previous/next disabled at queue boundaries
- **WHEN** user is at the first item, the previous button SHALL be disabled
- **WHEN** user is at the last item, the next button SHALL be disabled

### Requirement: User can remove items from the queue
The system SHALL allow removing any item from the queue by index.

#### Scenario: Remove non-current item
- **WHEN** user removes an item that is not currently playing
- **THEN** the item is removed and playback is unaffected

#### Scenario: Remove current item
- **WHEN** user removes the item that is currently playing
- **THEN** the queue advances to the next item if one exists, otherwise the player closes

### Requirement: User can reorder queue items by drag-and-drop
The system SHALL allow the user to drag queue items to a new position. Reordering the currently-playing item SHALL update currentIndex to follow it.

#### Scenario: Reorder non-current items
- **WHEN** user drags an item to a new position
- **THEN** the queue reflects the new order and playback continues uninterrupted

#### Scenario: Current item moves during reorder
- **WHEN** the currently-playing item is dragged to a new index
- **THEN** currentIndex updates to the item's new position; playback is uninterrupted
