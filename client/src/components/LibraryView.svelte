<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activateStream } from '../lib/playerStore.svelte.js';

  type LibraryItem = {
    id: string;
    title: string;
    showTitle: string | null;
    season: number | null;
    episode: number | null;
    year: number | null;
    type: 'movie' | 'tv';
    status: 'downloading' | 'complete';
    progress: number;
    posterUrl: string | null;
    streamUrl: string;
  };

  let items = $state<LibraryItem[]>([]);
  let loading = $state(true);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchLibrary() {
    try {
      const res = await fetch('/api/library');
      if (!res.ok) return;
      const data = await res.json();
      items = data.items ?? [];

      // Stop polling when everything is complete
      if (pollInterval && items.every((item) => item.status === 'complete')) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    } catch {}
  }

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(fetchLibrary, 2000);
  }

  function playItem(item: LibraryItem) {
    activateStream(item.streamUrl, item.showTitle ? `${item.showTitle} · ${item.title}` : item.title);
  }

  function cardLabel(item: LibraryItem): string {
    if (item.type === 'tv' && item.showTitle) {
      const s = item.season != null ? `S${String(item.season).padStart(2, '0')}` : '';
      const e = item.episode != null ? `E${String(item.episode).padStart(2, '0')}` : '';
      return `${item.showTitle} ${s}${e}`.trim();
    }
    return item.year ? `${item.title} (${item.year})` : item.title;
  }

  onMount(async () => {
    await fetchLibrary();
    loading = false;
    if (items.some((item) => item.status === 'downloading')) {
      startPolling();
    }
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  // Start polling whenever a downloading item appears
  $effect(() => {
    if (items.some((item) => item.status === 'downloading')) {
      startPolling();
    }
  });
</script>

<div class="library-view">
  {#if loading}
    <p class="status-msg">Loading library…</p>
  {:else if items.length === 0}
    <div class="empty-state">
      <p class="empty-title">Your library is empty</p>
      <p class="empty-hint">Search for a movie or TV show to start watching. Everything you watch is saved here.</p>
    </div>
  {:else}
    <div class="grid">
      {#each items as item (item.id)}
        <button class="library-card" onclick={() => playItem(item)} title={cardLabel(item)}>
          <div class="poster-wrap">
            {#if item.posterUrl}
              <img src={item.posterUrl} alt={item.title} class="poster" loading="lazy" />
            {:else}
              <div class="poster-placeholder">{item.type === 'tv' ? 'TV' : '🎬'}</div>
            {/if}

            {#if item.status === 'downloading'}
              <div class="progress-overlay">
                <div class="progress-bar" style="width: {Math.round(item.progress * 100)}%"></div>
                <span class="progress-label">{Math.round(item.progress * 100)}%</span>
              </div>
            {/if}
          </div>

          <div class="card-info">
            <span class="card-title">{cardLabel(item)}</span>
            {#if item.status === 'downloading'}
              <span class="card-status downloading">Downloading…</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .library-view {
    min-height: 200px;
  }

  .status-msg {
    color: #888;
    margin: 2rem 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #888;
    margin: 0;
  }

  .empty-hint {
    font-size: 0.9rem;
    color: #555;
    margin: 0;
    max-width: 360px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .library-card {
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    padding: 0;
    transition: border-color 0.15s;
  }

  .library-card:hover {
    border-color: #555;
  }

  .poster-wrap {
    aspect-ratio: 2/3;
    background: #111;
    position: relative;
    overflow: hidden;
  }

  .poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .poster-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    font-size: 1.5rem;
  }

  .progress-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.75);
    height: 28px;
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 100%;
    background: rgba(80, 200, 120, 0.35);
    transition: width 0.3s;
  }

  .progress-label {
    position: relative;
    z-index: 1;
    font-size: 0.75rem;
    font-weight: 700;
    color: #8f8;
    padding: 0 0.5rem;
  }

  .card-info {
    padding: 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .card-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .card-status {
    font-size: 0.7rem;
  }

  .card-status.downloading {
    color: #8f8;
  }
</style>
