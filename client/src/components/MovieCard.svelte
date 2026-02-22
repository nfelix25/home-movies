<script lang="ts">
  import { startStream } from '../lib/playerStore.svelte.js';

  let { movie }: { movie: { id: number; title: string; year: number; rating: number; poster: string | null; torrents: { quality: string; magnet: string }[] } } = $props();

  let streamError = $state<string | null>(null);

  async function handleQuality(magnet: string) {
    streamError = null;
    try {
      await startStream(magnet, movie.title);
    } catch {
      streamError = 'Failed to start stream';
    }
  }
</script>

<article class="movie-card">
  <div class="poster-wrap">
    {#if movie.poster}
      <img src={movie.poster} alt={movie.title} class="poster" loading="lazy" />
    {:else}
      <div class="poster poster-placeholder">No Image</div>
    {/if}
  </div>

  <div class="info">
    <h3 class="title">{movie.title}</h3>
    <p class="meta">{movie.year} · ⭐ {movie.rating}</p>

    <div class="qualities">
      {#each movie.torrents as torrent}
        <button class="quality-btn" onclick={() => handleQuality(torrent.magnet)}>
          {torrent.quality}
        </button>
      {/each}
    </div>

    {#if streamError}
      <p class="stream-error">{streamError}</p>
    {/if}
  </div>
</article>

<style>
  .movie-card {
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #2a2a2a;
    transition: border-color 0.15s;
  }

  .movie-card:hover {
    border-color: #444;
  }

  .poster-wrap {
    aspect-ratio: 2/3;
    overflow: hidden;
    background: #111;
  }

  .poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .poster-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #555;
    font-size: 0.8rem;
  }

  .info {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    margin: 0;
    font-size: 0.8rem;
    color: #888;
  }

  .qualities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.4rem;
  }

  .quality-btn {
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    border: 1px solid #444;
    border-radius: 3px;
    background: #222;
    color: #ccc;
    transition: all 0.15s;
  }

  .quality-btn:hover {
    background: #fff;
    color: #111;
    border-color: #fff;
  }

  .stream-error {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #e55;
  }
</style>
