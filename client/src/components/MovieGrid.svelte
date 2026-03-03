<script lang="ts">
  import { onMount } from 'svelte';
  import SearchBar from './SearchBar.svelte';
  import MovieCard from './MovieCard.svelte';

  type Movie = {
    id: number;
    imdbId: string | null;
    title: string;
    year: number;
    rating: number;
    poster: string | null;
    torrents: { quality: string; magnet: string }[];
    inLibrary: boolean;
    libraryId: string | null;
  };

  let movies = $state<Movie[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentQuery = $state('');
  let currentPage = $state(1);
  let hasMore = $state(true);

  async function fetchMovies(q: string, page: number, append = false) {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);

      const res = await fetch(`/api/movies?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to load movies');

      const fetched: Movie[] = data.movies ?? [];
      movies = append ? [...movies, ...fetched] : fetched;
      hasMore = fetched.length > 0;
    } catch (err: any) {
      error = err.message || 'Failed to load movies';
    } finally {
      loading = false;
    }
  }

  function handleSearch(q: string) {
    currentQuery = q;
    currentPage = 1;
    fetchMovies(q, 1);
  }

  function loadMore() {
    currentPage += 1;
    fetchMovies(currentQuery, currentPage, true);
  }

  onMount(() => fetchMovies('', 1));
</script>

<div class="movie-grid-page">
  <SearchBar onsearch={handleSearch} placeholder="Search movies…" />

  {#if error}
    <p class="error-msg">{error}</p>
  {:else if loading && movies.length === 0}
    <p class="status-msg">Loading…</p>
  {:else if movies.length === 0}
    <p class="status-msg">
      {currentQuery ? `No movies found for "${currentQuery}"` : 'No movies available.'}
    </p>
  {:else}
    <div class="grid">
      {#each movies as movie (movie.id)}
        <MovieCard
          {movie}
          libraryItem={movie.libraryId ? { id: movie.libraryId, streamUrl: `/api/library/${movie.libraryId}/stream` } : null}
        />
      {/each}
    </div>

    {#if hasMore}
      <div class="load-more">
        <button onclick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .movie-grid-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }

  .status-msg {
    color: #888;
    margin: 2rem 0;
  }

  .error-msg {
    color: #e55;
    margin: 1rem 0;
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .load-more button {
    padding: 0.6rem 2rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #ccc;
    font-size: 0.9rem;
    transition: background 0.15s;
  }

  .load-more button:hover:not(:disabled) {
    background: #2a2a2a;
    border-color: #666;
  }

  .load-more button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
