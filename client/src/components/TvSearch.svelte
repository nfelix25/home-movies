<script lang="ts">
  import SearchBar from './SearchBar.svelte';
  import SeasonGroup from './SeasonGroup.svelte';

  type Episode = { title: string; episode: number | null; magnet: string; seeds: number; inLibrary?: boolean; libraryId?: string | null };
  type Season = { season: number | string; episodes: Episode[] };

  let seasons = $state<Season[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let hasSearched = $state(false);
  let lastQuery = $state('');

  async function handleSearch(q: string) {
    loading = true;
    error = null;
    hasSearched = true;
    lastQuery = q;

    try {
      const res = await fetch(`/api/tv?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load TV results');

      seasons = data.seasons ?? [];
    } catch (err: any) {
      error = err.message || 'Failed to load TV results';
      seasons = [];
    } finally {
      loading = false;
    }
  }
</script>

<div class="tv-search">
  <SearchBar onsearch={handleSearch} placeholder="Search TV shows…" />

  {#if !hasSearched}
    <p class="prompt">Search for a TV show to see episodes.</p>
  {:else if error}
    <p class="error-msg">{error}</p>
  {:else if loading}
    <p class="status-msg">Loading…</p>
  {:else if seasons.length === 0}
    <p class="status-msg">No results found for "{lastQuery}"</p>
  {:else}
    <div class="seasons">
      {#each seasons as seasonGroup, i}
        <SeasonGroup
          season={seasonGroup.season}
          episodes={seasonGroup.episodes}
          defaultOpen={i === 0}
          showName={lastQuery}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tv-search {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .prompt {
    color: #666;
    margin: 2rem 0;
  }

  .status-msg {
    color: #888;
    margin: 1rem 0;
  }

  .error-msg {
    color: #e55;
    margin: 1rem 0;
  }

  .seasons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 800px;
  }
</style>
