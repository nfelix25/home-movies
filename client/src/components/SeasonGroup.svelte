<script lang="ts">
  import EpisodeRow from './EpisodeRow.svelte';

  let { season, episodes, defaultOpen = false, showName = '' }: {
    season: number | string;
    episodes: { title: string; episode: number | null; magnet: string; seeds: number; inLibrary?: boolean; libraryId?: string | null }[];
    defaultOpen?: boolean;
    showName?: string;
  } = $props();

  let open = $state(defaultOpen);

  const label = season === 'Unknown' ? 'Unknown Season' : `Season ${season}`;
</script>

<section class="season-group">
  <button class="season-header" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="season-label">{label}</span>
    <span class="episode-count">{episodes.length} episodes</span>
    <span class="chevron">{open ? '▲' : '▼'}</span>
  </button>

  {#if open}
    <div class="episode-list">
      {#each episodes as episode}
        <EpisodeRow
          {episode}
          {showName}
          {season}
          libraryItem={episode.libraryId ? { id: episode.libraryId, streamUrl: `/api/library/${episode.libraryId}/stream` } : null}
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .season-group {
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    overflow: hidden;
  }

  .season-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: #1a1a1a;
    border: none;
    color: #eee;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .season-header:hover {
    background: #222;
  }

  .season-label {
    font-weight: 600;
    font-size: 0.95rem;
    flex: 1;
  }

  .episode-count {
    font-size: 0.8rem;
    color: #888;
  }

  .chevron {
    font-size: 0.7rem;
    color: #666;
  }

  .episode-list {
    border-top: 1px solid #2a2a2a;
    padding: 0.25rem 0;
  }
</style>
