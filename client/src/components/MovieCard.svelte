<script lang="ts">
  import { activateStream } from '../lib/playerStore.svelte.js';
  import { playNow, addToQueue } from '../lib/queue.svelte.js';

  let {
    movie,
    libraryItem = null,
    onmoreLikeThis = null,
  }: {
    movie: {
      id: number;
      imdbId: string | null;
      title: string;
      year: number;
      rating: number;
      poster: string | null;
      torrents: { quality: string; magnet: string }[];
      inLibrary: boolean;
    };
    libraryItem?: { id: string; streamUrl: string } | null;
    onmoreLikeThis?: ((id: number, title: string) => void) | null;
  } = $props();

  function buildMetadata(quality?: string) {
    return {
      type: 'movie',
      title: movie.title,
      year: movie.year,
      imdbId: movie.imdbId,
      poster: movie.poster,
      quality,
    };
  }

  function handlePlay(torrent: { quality: string; magnet: string }) {
    if (movie.inLibrary && libraryItem) {
      activateStream(libraryItem.streamUrl, movie.title, movie.imdbId);
    } else {
      playNow({ title: movie.title, magnet: torrent.magnet, metadata: buildMetadata(torrent.quality) });
    }
  }

  function handleQueue(torrent: { quality: string; magnet: string }) {
    addToQueue({ title: movie.title, magnet: torrent.magnet, metadata: buildMetadata(torrent.quality) });
  }
</script>

<article class="movie-card">
  <div class="poster-wrap">
    {#if movie.poster}
      <img src={movie.poster} alt={movie.title} class="poster" loading="lazy" />
    {:else}
      <div class="poster poster-placeholder">No Image</div>
    {/if}
    {#if movie.inLibrary}
      <span class="in-library-badge">In Library</span>
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
            onclick={() => handlePlay(torrent)}
            title="Play now"
          >▶</button>
          <button
            class="action-btn queue-btn"
            onclick={() => handleQueue(torrent)}
            title="Add to queue"
          >+</button>
        </div>
      {/each}
    </div>

    {#if onmoreLikeThis}
      <button
        class="more-like-btn"
        onclick={() => onmoreLikeThis!(movie.id, movie.title)}
        title="More like this"
      >More like this</button>
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
    position: relative;
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

  .in-library-badge {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    background: rgba(0, 180, 100, 0.9);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
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

  .more-like-btn {
    margin-top: 0.4rem;
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
    border-radius: 3px;
    border: 1px solid #333;
    background: transparent;
    color: #666;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .more-like-btn:hover {
    color: #adf;
    border-color: #4a8abf;
    background: #1a2a3a;
  }
</style>
