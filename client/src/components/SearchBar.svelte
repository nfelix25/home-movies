<script lang="ts">
  let { onsearch, placeholder = 'Search…', value = '' }: { onsearch: (q: string) => void; placeholder?: string; value?: string } = $props();

  let query = $state(value);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (query.trim()) onsearch(query.trim());
  }
</script>

<form class="search-bar" onsubmit={handleSubmit}>
  <input
    type="text"
    bind:value={query}
    {placeholder}
    aria-label="Search"
  />
  <button type="submit">Search</button>
</form>

<style>
  .search-bar {
    display: flex;
    gap: 0.5rem;
    max-width: 480px;
  }

  input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a1a;
    color: #eee;
    font-size: 0.95rem;
  }

  input:focus {
    outline: none;
    border-color: #888;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #555;
    border-radius: 4px;
    background: #222;
    color: #eee;
    font-size: 0.95rem;
    transition: background 0.15s;
  }

  button:hover {
    background: #333;
  }
</style>
