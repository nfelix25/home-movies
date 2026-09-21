<script lang="ts">
  const GENRES = [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir', 'History',
    'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi',
    'Sport', 'Thriller', 'War', 'Western',
  ];

  const SORT_OPTIONS = [
    { value: 'download_count', label: 'Popularity' },
    { value: 'rating', label: 'Rating' },
    { value: 'year', label: 'Year' },
    { value: 'seeds', label: 'Seeds' },
    { value: 'like_count', label: 'Likes' },
    { value: 'date_added', label: 'Date Added' },
    { value: 'title', label: 'Title' },
  ];

  const RATING_OPTIONS = [
    { value: 0, label: 'Any' },
    { value: 6, label: '6+' },
    { value: 7, label: '7+' },
    { value: 8, label: '8+' },
    { value: 9, label: '9+' },
  ];

  let {
    selectedGenres,
    minRating,
    minYear,
    sortBy,
    orderBy,
    onchange,
  }: {
    selectedGenres: string[];
    minRating: number;
    minYear: number | null;
    sortBy: string;
    orderBy: string;
    onchange: (filters: {
      selectedGenres: string[];
      minRating: number;
      minYear: number | null;
      sortBy: string;
      orderBy: string;
    }) => void;
  } = $props();

  function toggleGenre(genre: string) {
    const next = selectedGenres.includes(genre)
      ? selectedGenres.filter((g) => g !== genre)
      : [...selectedGenres, genre];
    onchange({ selectedGenres: next, minRating, minYear, sortBy, orderBy });
  }

  function handleRating(e: Event) {
    onchange({ selectedGenres, minRating: Number((e.target as HTMLSelectElement).value), minYear, sortBy, orderBy });
  }

  function handleYear(e: Event) {
    const val = (e.target as HTMLInputElement).value.trim();
    const parsed = val ? parseInt(val, 10) : null;
    onchange({ selectedGenres, minRating, minYear: parsed && !isNaN(parsed) ? parsed : null, sortBy, orderBy });
  }

  function handleSort(e: Event) {
    onchange({ selectedGenres, minRating, minYear, sortBy: (e.target as HTMLSelectElement).value, orderBy });
  }

  function handleOrder(e: Event) {
    onchange({ selectedGenres, minRating, minYear, sortBy, orderBy: (e.target as HTMLSelectElement).value });
  }
</script>

<div class="filter-panel">
  <div class="filter-row">
    <span class="filter-label" id="filter-genres">Genres</span>
    <div class="genre-chips" role="group" aria-labelledby="filter-genres">
      {#each GENRES as genre}
        <button
          class="genre-chip"
          class:active={selectedGenres.includes(genre)}
          aria-pressed={selectedGenres.includes(genre)}
          onclick={() => toggleGenre(genre)}
        >{genre}</button>
      {/each}
    </div>
  </div>

  <div class="filter-row filter-row--inline">
    <div class="filter-field">
      <label class="filter-label" for="filter-rating">Min Rating</label>
      <select id="filter-rating" class="filter-select" value={minRating} onchange={handleRating}>
        {#each RATING_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="filter-field">
      <label class="filter-label" for="filter-year">From Year</label>
      <input
        id="filter-year"
        type="number"
        class="filter-input"
        placeholder="e.g. 2010"
        value={minYear ?? ''}
        min="1900"
        max={new Date().getFullYear()}
        oninput={handleYear}
      />
    </div>

    <div class="filter-field">
      <label class="filter-label" for="filter-sort">Sort By</label>
      <select id="filter-sort" class="filter-select" value={sortBy} onchange={handleSort}>
        {#each SORT_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="filter-field">
      <label class="filter-label" for="filter-order">Order</label>
      <select id="filter-order" class="filter-select" value={orderBy} onchange={handleOrder}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  </div>
</div>

<style>
  .filter-panel {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .filter-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-row--inline {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .filter-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .genre-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .genre-chip {
    padding: 0.25rem 0.6rem;
    font-size: 0.78rem;
    border-radius: 3px;
    border: 1px solid #444;
    background: #1a1a1a;
    color: #ccc;
    cursor: pointer;
    transition: all 0.12s;
  }

  .genre-chip:hover {
    border-color: #666;
    color: #fff;
  }

  .genre-chip.active {
    background: #2a3a4a;
    border-color: #4a8abf;
    color: #adf;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .filter-select,
  .filter-input {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
    border-radius: 4px;
    border: 1px solid #444;
    background: #222;
    color: #ccc;
    min-width: 8rem;
  }

  .filter-input {
    min-width: 7rem;
  }

  .filter-select:focus,
  .filter-input:focus {
    outline: none;
    border-color: #4a8abf;
  }
</style>
