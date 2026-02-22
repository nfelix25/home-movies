## Why

The app currently plays one item at a time with no way to queue up content or maintain audio when the phone screen turns off. This makes it impractical for watching multiple episodes or listening while doing other things on Android.

## What Changes

- Add a persistent playback queue: items can be added, removed, and reordered via drag-and-drop
- Add two distinct play actions on MovieCard and EpisodeRow: "Play now" (insert at front of queue, play immediately) and "Add to queue" (append to end)
- Add prev/next queue navigation controls to the player
- Add a collapsible queue panel (sidebar on desktop, overlay on mobile) showing the queue with drag-to-reorder and per-item remove
- Integrate the Media Session API so Android lock screen shows playback controls (play/pause, next track, previous track) mapped to queue actions
- Auto-advance to the next queue item when the current video ends

## Capabilities

### New Capabilities

- `playback-queue`: Client-side queue store managing an ordered list of items; supports add-to-end, insert-at-front, remove, reorder, and index-based navigation (next/prev/jump); drives auto-advance and player state
- `queue-ui`: Collapsible queue panel with drag-and-drop reordering and item removal; queue toggle button in player controls; prev/next skip buttons in player
- `media-session`: Media Session API integration that registers current track metadata and wires play/pause/nexttrack/previoustrack action handlers to queue navigation; enables Android lock screen controls and background audio

### Modified Capabilities

- `torrent-streaming`: Player must respond to queue index changes (not just direct magnet POSTs); "ended" event triggers queue advance; stream lifecycle now managed by queue transitions

## Impact

- New dependency: `svelte-dnd-action` (drag-and-drop in Svelte with touch support)
- New file: `client/src/lib/queue.ts` (Svelte store)
- Modified files: `Player.svelte`, `MovieCard.svelte`, `EpisodeRow.svelte`, `App.svelte`
- New files: `QueuePanel.svelte`, `QueueItem.svelte`
- No server changes required
