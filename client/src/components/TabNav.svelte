<script lang="ts">
  let { active, ontabchange }: { active: string; ontabchange: (tab: string) => void } = $props();
</script>

<nav class="tab-nav">
  <button class:active={active === 'movies'} onclick={() => ontabchange('movies')}>
    Movies
  </button>
  <button class:active={active === 'tv'} onclick={() => ontabchange('tv')}>
    TV
  </button>
</nav>

<style>
  .tab-nav {
    display: flex;
    gap: 0.25rem;
  }

  button {
    padding: 0.4rem 1rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: transparent;
    color: #aaa;
    font-size: 0.9rem;
    transition: all 0.15s;
  }

  button:hover {
    border-color: #888;
    color: #eee;
  }

  button.active {
    background: #fff;
    border-color: #fff;
    color: #111;
    font-weight: 600;
  }
</style>
