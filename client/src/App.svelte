<script lang="ts">
  import TabNav from './components/TabNav.svelte';
  import MovieGrid from './components/MovieGrid.svelte';
  import TvSearch from './components/TvSearch.svelte';
  import Player from './components/Player.svelte';
  import { player } from './lib/playerStore.svelte.js';

  let activeTab = $state('movies');
</script>

<div class="app">
  <header>
    <h1>home-movies</h1>
    <TabNav active={activeTab} ontabchange={(tab) => (activeTab = tab)} />
  </header>

  <main>
    {#if activeTab === 'movies'}
      <MovieGrid />
    {:else}
      <TvSearch />
    {/if}
  </main>

  {#if player.active}
    <Player />
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 0.75rem 2rem;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    gap: 2rem;
    background: #0d0d0d;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  h1 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #ccc;
  }

  main {
    flex: 1;
    padding: 2rem;
  }
</style>
