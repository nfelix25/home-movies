<script lang="ts">
  import { startStream } from '../lib/playerStore.svelte.js';

  let { episode }: {
    episode: { title: string; episode: number | null; magnet: string; seeds: number };
  } = $props();

  let streamError = $state<string | null>(null);

  async function handleClick() {
    streamError = null;
    await startStream(episode.magnet, episode.title);
    if (episode.magnet && !episode.magnet.startsWith('magnet:')) {
      streamError = 'Invalid magnet link';
    }
  }
</script>

<button class="episode-row" onclick={handleClick}>
  <span class="ep-num">
    {episode.episode !== null ? `E${String(episode.episode).padStart(2, '0')}` : '?'}
  </span>
  <span class="ep-title">{episode.title}</span>
  <span class="ep-seeds" title="Seeds">{episode.seeds} seeds</span>
  {#if streamError}
    <span class="ep-error">{streamError}</span>
  {/if}
</button>

<style>
  .episode-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #ddd;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
    font-size: 0.875rem;
  }

  .episode-row:hover {
    background: #222;
  }

  .ep-num {
    min-width: 3rem;
    font-weight: 600;
    color: #aaa;
    font-family: monospace;
    font-size: 0.8rem;
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
  }

  .ep-error {
    font-size: 0.75rem;
    color: #e55;
  }
</style>
