## Context

The app uses Svelte 5 with the runes API (`$state`, `$props`, `$derived`). The player is driven by `playerStore.svelte.js` which holds reactive state and exposes imperative functions (`startStream`, `closePlayer`). The player renders as a full-screen overlay in `App.svelte`.

Currently, clicking a quality button or episode immediately calls `startStream(magnet, title)` — there is no queue concept. The queue feature needs to sit between the UI and the player, intercepting "play" actions and routing them through ordered state.

## Goals / Non-Goals

**Goals:**
- Queue store that manages an ordered list of playable items with navigation (next/prev/jump)
- Two distinct actions: "Play now" (insert at front, play immediately) and "Add to queue" (append, no interruption)
- Auto-advance on `video.ended`
- Collapsible queue panel with drag-to-reorder and per-item remove
- Prev/next buttons in the player controls
- Media Session API integration for Android lock screen controls

**Non-Goals:**
- Persisting the queue across page reloads
- Server-side queue or session management
- iOS background video (browser limitation — audio-only background is not supported from `<video>` on iOS)
- Queue reorder by anything other than drag-and-drop

## Decisions

### 1. Queue store as a Svelte 5 rune module (`.svelte.ts`)

The existing `playerStore.svelte.js` uses Svelte 5 `$state` at module level. The queue store follows the same pattern: a `$state` object exported from a `.svelte.ts` file, with imperative functions alongside it.

The queue store owns: `items[]`, `currentIndex`. It calls `startStream` from playerStore when the current item changes (index changes or item is inserted at front).

**Alternative considered**: Merging queue state into playerStore. Rejected — playerStore is already responsible for stream lifecycle; queue is a higher-level concept. Separation keeps each store focused.

### 2. "Play now" inserts at index 0 and sets currentIndex = 0

When queue already has items, "Play now" prepends the new item and starts it. Existing items shift down. This preserves the queue.

When queue is empty, "Play now" and "Add to queue" have the same observable effect (item added, stream starts), but "Play now" always starts streaming immediately.

### 3. "Add to queue" auto-starts if queue was empty

If the queue is empty and user clicks "Add to queue", it behaves like "Play now" — starts the stream immediately. This avoids a confusing state where something is in the queue but nothing is playing.

### 4. `svelte-dnd-action` for drag-and-drop

Svelte-native library with first-class touch support (required for Android). API is a Svelte action applied to the list container — fits naturally into `{#each}` loops without wrapper components.

**Alternative considered**: SortableJS — better known but requires manual DOM sync with Svelte state. `svelte-dnd-action` integrates with Svelte reactivity directly.

### 5. Queue panel as a slide-in overlay within the player

The player is a full-screen overlay (`position: fixed; inset: 0`). The queue panel slides in from the right side within that overlay — a right-aligned column that the player video shrinks to accommodate. On narrow screens (mobile), the panel takes full width as a drawer on top of the video.

Toggle button (`≡`) in the player header. No separate route or modal.

### 6. Media Session API called from Player.svelte when streamUrl changes

`navigator.mediaSession` is set up in a Svelte `$effect` that runs whenever `player.streamUrl` or `player.title` changes. Action handlers (`nexttrack`, `previoustrack`, `play`, `pause`) are wired to queue/player functions. This keeps Media Session concerns in the player component where the video element lives.

### 7. QueueItem shape includes a stable `id`

Each item gets a `crypto.randomUUID()` id at insertion time. Used as the key in `{#each}` and required by `svelte-dnd-action` for stable identity during reorder.

```ts
interface QueueItem {
  id: string;         // stable UUID
  title: string;
  magnet: string;
  quality?: string;   // e.g. "1080p", for display only
}
```

## Risks / Trade-offs

- **iOS background audio**: Media Session API does not enable background video on iOS Safari. Documented limitation — no mitigation without a native app wrapper.
- **Torrent swap latency**: Switching to the next queue item requires a new POST to `/api/stream` and waiting for torrent metadata. There will be a loading gap between items. The existing buffering spinner covers this.
- **svelte-dnd-action + Svelte 5**: The library was written for Svelte 4. Svelte 5 compatibility exists but may require pinning a specific version or using a community fork. Should be verified at install time.
- **Single active torrent**: The server's WebTorrent instance stops the current torrent before starting the next. Gapless playback is not possible — this is a server constraint, not a client one.
