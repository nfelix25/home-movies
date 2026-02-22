<script lang="ts">
  import { playNow, addToQueue } from '../lib/queue.svelte.js';

  let { movie }: { movie: { id: number; title: string; year: number; rating: number; poster: string | null; torrents: { quality: string; magnet: string }[] } } = $props();
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
        <div class="torrent-row">
          <span class="quality-label">{torrent.quality}</span>
          <button
            class="action-btn play-btn"
            onclick={() => playNow({ title: movie.title, magnet: torrent.magnet, quality: torrent.quality })}
            title="Play now"
          >▶</button>
          <!-- <button
            class="action-btn queue-btn"
            onclick={() => addToQueue({ title: movie.title, magnet: torrent.magnet, quality: torrent.quality })}
            title="Add to queue"
          >+</button> -->
        </div>
      {/each}
    </div>
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
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.4rem;
  }

  .torrent-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .quality-label {
    font-size: 0.75rem;
    color: #888;
    min-width: 3rem;
  }

  .action-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 3px;
    background: #222;
    color: #ccc;
    border: 1px solid #444;
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1;
    min-height: 36px;
  }

  .play-btn:hover {
    background: #fff;
    color: #111;
    border-color: #fff;
  }

  .queue-btn:hover {
    background: #2a4a2a;
    color: #8f8;
    border-color: #4a7a4a;
  }
</style>
