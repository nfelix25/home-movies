<script lang="ts">
  import { playNow, addToQueue } from '../lib/queue.svelte.js';

  let { episode }: {
    episode: { title: string; episode: number | null; magnet: string; seeds: number };
  } = $props();
</script>

<div class="episode-row">
  <span class="ep-num">
    {episode.episode !== null ? `E${String(episode.episode).padStart(2, '0')}` : '?'}
  </span>
  <span class="ep-title">{episode.title}</span>
  <span class="ep-seeds" title="Seeds">{episode.seeds} seeds</span>
  <div class="ep-actions">
    <button
      class="action-btn play-btn"
      onclick={() => playNow({ title: episode.title, magnet: episode.magnet })}
      title="Play now"
      aria-label="Play now"
    >▶</button>
    <button
      class="action-btn queue-btn"
      onclick={() => addToQueue({ title: episode.title, magnet: episode.magnet })}
      title="Add to queue"
      aria-label="Add to queue"
    >+</button>
  </div>
</div>

<style>
  .episode-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.4rem 0.75rem;
    color: #ddd;
    font-size: 0.875rem;
  }

  .episode-row:hover {
    background: #1a1a1a;
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

  .ep-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 0.2rem 0.45rem;
    font-size: 0.7rem;
    border-radius: 3px;
    background: #222;
    color: #ccc;
    border: 1px solid #3a3a3a;
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1;
  }

  .play-btn:hover {
    background: #fff;
    color: #111;
    border-color: #fff;
  }

  .queue-btn:hover {
    background: #2a4a2a;
    color: #8f8;
    border-color: #4a7a4a;
  }
</style>
