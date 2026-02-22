## 1. Dependencies

- [x] 1.1 Install `svelte-dnd-action` in the client package (`cd client && npm install svelte-dnd-action`)
- [x] 1.2 Verify `svelte-dnd-action` works with Svelte 5 (check for any compatibility warnings at install or runtime)

## 2. Queue Store

- [x] 2.1 Create `client/src/lib/queue.svelte.ts` with `QueueItem` interface (`id`, `title`, `magnet`, `quality?`)
- [x] 2.2 Implement `$state` queue object: `{ items: QueueItem[], currentIndex: number }`
- [x] 2.3 Implement `playNow(item)`: insert at index 0, set `currentIndex = 0`, call `startStream`
- [x] 2.4 Implement `addToQueue(item)`: append to end; if queue was empty before, call `startStream` (auto-start)
- [x] 2.5 Implement `next()`: increment `currentIndex` if not at last item, call `startStream` for new item
- [x] 2.6 Implement `prev()`: decrement `currentIndex` if not at first item, call `startStream` for new item
- [x] 2.7 Implement `jumpTo(index)`: set `currentIndex`, call `startStream` for that item
- [x] 2.8 Implement `removeItem(id)`: remove item by id; if removed item was current, call `next()` or `closePlayer()` if queue becomes empty; adjust `currentIndex` if removed item was before current
- [x] 2.9 Implement `reorder(newItems)`: replace `items` array with reordered array from DnD; recalculate `currentIndex` to follow the currently-playing item's new position
- [x] 2.10 Export `$derived` helpers: `hasPrev` (currentIndex > 0), `hasNext` (currentIndex < items.length - 1)

## 3. Player Controls

- [x] 3.1 In `Player.svelte`, import queue store and add ⏮ (prev) and ⏭ (next) buttons to the player header
- [x] 3.2 Wire prev/next buttons to `queue.prev()` / `queue.next()`; disable when `!queue.hasPrev` / `!queue.hasNext`
- [x] 3.3 Add queue toggle button (≡) to player header; bind to local `queueOpen = $state(false)`
- [x] 3.4 Add `onended` handler to the `<video>` element that calls `queue.next()`
- [x] 3.5 Add `playsinline` attribute to the `<video>` element (improves mobile behavior)

## 4. Queue Panel

- [x] 4.1 Create `client/src/components/QueuePanel.svelte`; accept `open` prop; slide in from right using CSS transition (`transform: translateX`)
- [x] 4.2 Import queue store; render `{#each queue.items as item (item.id)}` list
- [x] 4.3 Apply `svelte-dnd-action` to the list container; on `finalize` event call `queue.reorder(newItems)`
- [x] 4.4 Highlight the item at `queue.currentIndex` with a distinct background or `▶` indicator
- [x] 4.5 Add a drag handle (` ⠿ ` or `≡`) per item for the DnD action
- [x] 4.6 Add ✕ remove button per item; call `queue.removeItem(item.id)` on click
- [x] 4.7 On mobile (narrow screen), panel overlays full-width on top of video via media query
- [x] 4.8 Import `QueuePanel` in `Player.svelte`; pass `open={queueOpen}`

## 5. MovieCard and EpisodeRow Updates

- [x] 5.1 In `MovieCard.svelte`, import `playNow` and `addToQueue` from queue store
- [x] 5.2 Replace the single quality button with two buttons per torrent: "▶" (play now) and "+" (add to queue)
- [x] 5.3 In `EpisodeRow.svelte`, import `playNow` and `addToQueue` from queue store
- [x] 5.4 Change episode row from a single clickable button to show two action buttons: play (▶) and queue (+)

## 6. Media Session Integration

- [x] 6.1 In `Player.svelte`, add a `$effect` that runs when `player.streamUrl` changes; set `navigator.mediaSession.metadata` to a `MediaMetadata` with the current `player.title`; guard with `if ('mediaSession' in navigator)`
- [x] 6.2 In the same effect, register `nexttrack` handler: call `queue.next()` if `queue.hasNext`, else set handler to `null`
- [x] 6.3 Register `previoustrack` handler: call `queue.prev()` if `queue.hasPrev`, else set handler to `null`
- [x] 6.4 Bind `play` and `pause` Media Session handlers to `video.play()` / `video.pause()` via a `$effect` that references the video element
- [x] 6.5 Add `play` and `pause` event listeners on the video element to update `navigator.mediaSession.playbackState`
