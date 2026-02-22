<script lang="ts">
  import { playNow, addToQueue } from '../lib/queue.svelte.js';

  let { episode }: {
    episode: { title: string; episode: number | null; magnet: string; seeds: number };
  } = $props();
</script>

<div class="episode-row">
  <button
    class="ep-main"
    onclick={() => playNow({ title: episode.title, magnet: episode.magnet })}
    aria-label="Play {episode.title}"
  >
    <span class="ep-num">
      {episode.episode !== null ? `E${String(episode.episode).padStart(2, '0')}` : '?'}
    </span>
    <span class="ep-title">{episode.title}</span>
    <span class="ep-seeds" title="Seeds">{episode.seeds} seeds</span>
  </button>
  <button
    class="queue-btn"
    onclick={() => addToQueue({ title: episode.title, magnet: episode.magnet })}
    title="Add to queue"
    aria-label="Add to queue"
  >+</button>
</div>

<style>
  .episode-row {
    display: flex;
    align-items: stretch;
    width: 100%;
    color: #ddd;
    font-size: 0.875rem;
  }

  .episode-row:hover {
    background: #1a1a1a;
  }

  .ep-main {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    padding: 0.65rem 0.75rem;
    background: transparent;
    border: none;
    color: inherit;
    font-size: inherit;
    text-align: left;
    cursor: pointer;
  }

  .ep-num {
    min-width: 3rem;
    font-weight: 600;
    color: #aaa;
    font-family: monospace;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .ep-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ep-seeds {
    font-size: 0.75rem;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .queue-btn {
    flex-shrink: 0;
    padding: 0 1rem;
    background: transparent;
    border: none;
    border-left: 1px solid #2a2a2a;
    color: #555;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
  }

  .queue-btn:hover {
    color: #8f8;
    background: #1a2a1a;
  }
</style>
