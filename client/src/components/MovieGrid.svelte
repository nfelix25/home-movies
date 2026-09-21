<script lang="ts">
  import { onMount } from 'svelte';
  import SearchBar from './SearchBar.svelte';
  import MovieCard from './MovieCard.svelte';
  import FilterPanel from './FilterPanel.svelte';
  import MovieDetails from './MovieDetails.svelte';

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

  // ── Defaults ──────────────────────────────────────────────────────────────
  const DEFAULTS = {
    q: '',
    selectedGenres: [] as string[],
    minRating: 0,
    minYear: null as number | null,
    sortBy: 'download_count',
    orderBy: 'desc',
    pageSize: 20,
  };

  // ── Search & pagination state ─────────────────────────────────────────────
  let movies = $state<Movie[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentQuery = $state(DEFAULTS.q);
  let currentPage = $state(1);
  let hasMore = $state(true);

  // ── Filter state ──────────────────────────────────────────────────────────
  let showFilters = $state(false);
  let selectedGenres = $state<string[]>(DEFAULTS.selectedGenres);
  let minRating = $state(DEFAULTS.minRating);
  let minYear = $state<number | null>(DEFAULTS.minYear);
  let sortBy = $state(DEFAULTS.sortBy);
  let orderBy = $state(DEFAULTS.orderBy);
  let pageSize = $state(DEFAULTS.pageSize);

  // ── Suggestions state ─────────────────────────────────────────────────────
  let suggestionsContext = $state<{ movieId: number; movieTitle: string } | null>(null);
  let suggestionMovies = $state<Movie[]>([]);
  let suggestionsLoading = $state(false);
  let suggestionsError = $state<string | null>(null);
  let savedMovies = $state<Movie[]>([]);

  const hasActiveFilters = $derived(
    selectedGenres.length > 0 || minRating > 0 || minYear !== null ||
    sortBy !== DEFAULTS.sortBy || orderBy !== DEFAULTS.orderBy || pageSize !== DEFAULTS.pageSize
  );

  // ── URL state sync ────────────────────────────────────────────────────────

  function readFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const q = params.get('q') ?? DEFAULTS.q;
    const genreParam = params.get('genre');
    const selectedGenresFromUrl = genreParam ? genreParam.split(',').filter(Boolean) : DEFAULTS.selectedGenres;
    const ratingParam = parseInt(params.get('rating') ?? '', 10);
    const minRatingFromUrl = [6, 7, 8, 9].includes(ratingParam) ? ratingParam : DEFAULTS.minRating;
    const yearParam = parseInt(params.get('year') ?? '', 10);
    const minYearFromUrl = !isNaN(yearParam) && yearParam > 1900 ? yearParam : DEFAULTS.minYear;
    const sortByFromUrl = params.get('sort') ?? DEFAULTS.sortBy;
    const orderByParam = params.get('order') ?? '';
    const orderByFromUrl = orderByParam === 'asc' || orderByParam === 'desc' ? orderByParam : DEFAULTS.orderBy;
    const limitParam = parseInt(params.get('limit') ?? '', 10);
    const pageSizeFromUrl = [20, 50, 100, 250, 500, 1000].includes(limitParam) ? limitParam : DEFAULTS.pageSize;

    return {
      q,
      selectedGenres: selectedGenresFromUrl,
      minRating: minRatingFromUrl,
      minYear: minYearFromUrl,
      sortBy: sortByFromUrl,
      orderBy: orderByFromUrl,
      pageSize: pageSizeFromUrl,
    };
  }

  function syncToUrl() {
    const params = new URLSearchParams();
    if (currentQuery) params.set('q', currentQuery);
    if (selectedGenres.length > 0) params.set('genre', selectedGenres.join(','));
    if (minRating !== DEFAULTS.minRating) params.set('rating', String(minRating));
    if (minYear !== null) params.set('year', String(minYear));
    if (sortBy !== DEFAULTS.sortBy) params.set('sort', sortBy);
    if (orderBy !== DEFAULTS.orderBy) params.set('order', orderBy);
    if (pageSize !== DEFAULTS.pageSize) params.set('limit', String(pageSize));

    const search = params.toString();
    history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }

  // ── Fetch logic ───────────────────────────────────────────────────────────

  async function fetchSinglePage(q: string, page: number, genre: string | null, limit: number): Promise<Movie[]> {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    if (genre) params.set('genre', genre);
    if (sortBy !== DEFAULTS.sortBy) params.set('sort', sortBy);
    if (orderBy !== DEFAULTS.orderBy) params.set('order_by', orderBy);
    if (minRating > 0) params.set('minimum_rating', String(minRating));
    // Larger result limits are assembled from multiple API pages of at most 50
    const effectiveLimit = Math.min(limit, 50);
    if (effectiveLimit !== 20) params.set('limit', String(effectiveLimit));

    const res = await fetch(`/api/movies?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load movies');
    return data.movies ?? [];
  }

  async function fetchMovies(q: string, page: number, append = false) {
    loading = true;
    error = null;

    try {
      const apiLimit = Math.min(pageSize, 50);
      const pagesPerLoad = Math.ceil(pageSize / apiLimit);
      const firstPage = (page - 1) * pagesPerLoad + 1;
      const genres = selectedGenres.length > 0 ? selectedGenres : [null];

      // Fetch consecutive API pages for each genre, preserving OR matching.
      const results = await Promise.all(
        genres.flatMap((genre) =>
          Array.from({ length: pagesPerLoad }, (_, offset) =>
            fetchSinglePage(q, firstPage + offset, genre, apiLimit)
          )
        )
      );

      // Genres and API pages can overlap, including with previously loaded movies.
      const seen = new Set<number>(append ? movies.map((movie) => movie.id) : []);
      let fetched: Movie[] = [];
      for (const batch of results) {
        for (const movie of batch) {
          if (!seen.has(movie.id)) {
            seen.add(movie.id);
            fetched.push(movie);
          }
        }
      }

      // Client-side year filter
      if (minYear !== null) {
        fetched = fetched.filter((m) => m.year >= minYear!);
      }

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
    syncToUrl();
  }

  function loadMore() {
    currentPage += 1;
    fetchMovies(currentQuery, currentPage, true);
  }

  function handleFilterChange(filters: {
    selectedGenres: string[];
    minRating: number;
    minYear: number | null;
    sortBy: string;
    orderBy: string;
  }) {
    selectedGenres = filters.selectedGenres;
    minRating = filters.minRating;
    minYear = filters.minYear;
    sortBy = filters.sortBy;
    orderBy = filters.orderBy;
    currentPage = 1;
    fetchMovies(currentQuery, 1);
    syncToUrl();
  }

  function handlePageSizeChange(e: Event) {
    pageSize = Number((e.target as HTMLSelectElement).value);
    currentPage = 1;
    fetchMovies(currentQuery, 1);
    syncToUrl();
  }

  async function handleMoreLikeThis(movieId: number, movieTitle: string) {
    savedMovies = movies;
    suggestionsContext = { movieId, movieTitle };
    suggestionMovies = [];
    suggestionsError = null;
    suggestionsLoading = true;

    try {
      const res = await fetch(`/api/movies/${movieId}/suggestions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load suggestions');
      suggestionMovies = data.movies ?? [];
    } catch (err: any) {
      suggestionsError = err.message || 'Failed to load suggestions';
    } finally {
      suggestionsLoading = false;
    }
  }

  function handleBackFromSuggestions() {
    movies = savedMovies;
    suggestionsContext = null;
    suggestionMovies = [];
    suggestionsError = null;
  }

  // ── Film details popup ────────────────────────────────────────────────────
  // The popup only needs what a card already knows, not the torrents or library id.
  type DetailsTarget = Pick<Movie, 'title' | 'year' | 'imdbId' | 'poster' | 'rating'>;
  let detailsMovie = $state<DetailsTarget | null>(null);

  function openDetails(movie: DetailsTarget) {
    detailsMovie = movie;
  }

  function closeDetails() {
    detailsMovie = null;
  }

  /** A recommended film was clicked in the popup: look it up in the grid. */
  function handleRecommendationSearch(title: string) {
    detailsMovie = null;
    // Leave suggestions mode without restoring the saved grid; the search replaces it.
    suggestionsContext = null;
    suggestionMovies = [];
    suggestionsError = null;
    // A leftover filter (say, 8+ rating) could hide the very film being looked up.
    selectedGenres = [];
    minRating = DEFAULTS.minRating;
    minYear = DEFAULTS.minYear;
    handleSearch(title);
    window.scrollTo({ top: 0 });
  }

  onMount(() => {
    const fromUrl = readFromUrl();
    currentQuery = fromUrl.q;
    selectedGenres = fromUrl.selectedGenres;
    minRating = fromUrl.minRating;
    minYear = fromUrl.minYear;
    sortBy = fromUrl.sortBy;
    orderBy = fromUrl.orderBy;
    pageSize = fromUrl.pageSize;
    fetchMovies(currentQuery, 1);
  });
</script>

<div class="movie-grid-page">
  {#if suggestionsContext}
    <!-- Suggestions view -->
    <div class="suggestions-header">
      <button class="back-btn" onclick={handleBackFromSuggestions}>← Back</button>
      <h2 class="suggestions-title">More like <em>{suggestionsContext.movieTitle}</em></h2>
    </div>

    {#if suggestionsError}
      <p class="error-msg">{suggestionsError}</p>
    {:else if suggestionsLoading}
      <p class="status-msg">Loading…</p>
    {:else if suggestionMovies.length === 0}
      <p class="status-msg">No similar movies found.</p>
    {:else}
      <div class="grid">
        {#each suggestionMovies as movie (movie.id)}
          <MovieCard
            {movie}
            libraryItem={movie.libraryId ? { id: movie.libraryId, streamUrl: `/api/library/${movie.libraryId}/stream` } : null}
            onmoreLikeThis={handleMoreLikeThis}
            onopen={openDetails}
          />
        {/each}
      </div>
    {/if}
  {:else}
    <!-- Normal browse view -->
    <div class="search-row">
      <SearchBar onsearch={handleSearch} placeholder="Search movies…" value={currentQuery} />
      <select class="page-size-select" value={pageSize} onchange={handlePageSizeChange} title="Results per page">
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={250}>250</option>
        <option value={500}>500</option>
        <option value={1000}>1000</option>
      </select>
      <button
        class="filter-toggle"
        class:active={showFilters}
        onclick={() => (showFilters = !showFilters)}
      >
        Filters{#if hasActiveFilters}<span class="filter-dot"></span>{/if}
      </button>
    </div>

    {#if showFilters}
      <FilterPanel
        {selectedGenres}
        {minRating}
        {minYear}
        {sortBy}
        {orderBy}
        onchange={handleFilterChange}
      />
    {/if}

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
            onmoreLikeThis={handleMoreLikeThis}
            onopen={openDetails}
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
  {/if}

  {#if detailsMovie}
    <MovieDetails movie={detailsMovie} onclose={closeDetails} onsearch={handleRecommendationSearch} />
  {/if}
</div>

<style>
  .movie-grid-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .search-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .page-size-select {
    padding: 0.6rem 0.5rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #ccc;
    font-size: 0.85rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .page-size-select:hover {
    border-color: #666;
  }

  .filter-toggle {
    position: relative;
    padding: 0.6rem 1rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #ccc;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    background: #2a2a2a;
    border-color: #666;
  }

  .filter-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4a8abf;
    margin-left: 0.4rem;
    vertical-align: middle;
    position: relative;
    top: -1px;
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

  .suggestions-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .back-btn {
    padding: 0.5rem 0.9rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #ccc;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: #2a2a2a;
    border-color: #666;
  }

  .suggestions-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: #ddd;
  }

  .suggestions-title em {
    font-style: normal;
    color: #adf;
  }
</style>
