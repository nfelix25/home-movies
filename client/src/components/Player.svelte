<script lang="ts">
  import { player, closePlayer } from '../lib/playerStore.svelte.js';
  import { queue, hasPrev, hasNext, prev, next } from '../lib/queue.svelte.js';
  // hasPrev and hasNext are getter functions - Svelte tracks them reactively in templates
  import QueuePanel from './QueuePanel.svelte';

  let queueOpen = $state(false);
  let videoEl = $state<HTMLVideoElement | null>(null);

  $effect(() => {
    if (!player.streamUrl || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: player.title,
    });

    navigator.mediaSession.setActionHandler('nexttrack', hasNext() ? next : null);
    navigator.mediaSession.setActionHandler('previoustrack', hasPrev() ? prev : null);
    navigator.mediaSession.setActionHandler('play', () => videoEl?.play());
    navigator.mediaSession.setActionHandler('pause', () => videoEl?.pause());
  });
</script>

<div class="player-overlay" role="dialog" aria-modal="true" aria-label="Video player">
  <div class="player-inner" class:queue-open={queueOpen}>
    <div class="player-main">
      <div class="player-header">
        <div class="nav-controls">
          <button
            class="nav-btn"
            onclick={prev}
            disabled={!hasPrev()}
            aria-label="Previous"
          >⏮</button>
          <button
            class="nav-btn"
            onclick={next}
            disabled={!hasNext()}
            aria-label="Next"
          >⏭</button>
        </div>

        <h2 class="player-title">{player.title}</h2>

        <div class="header-actions">
          <button
            class="queue-btn"
            class:active={queueOpen}
            onclick={() => queueOpen = !queueOpen}
            aria-label="Toggle queue"
          >☰ {queue.items.length}</button>
          <button class="close-btn" onclick={closePlayer} aria-label="Close player">✕</button>
        </div>
      </div>

      <div class="video-wrap">
        {#if player.loading}
          <div class="buffering">
            <div class="spinner"></div>
            <p>Loading torrent…</p>
          </div>
        {:else if player.error}
          <div class="player-error">
            <p>{player.error}</p>
            <button onclick={closePlayer}>Dismiss</button>
          </div>
        {:else if player.streamUrl}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            bind:this={videoEl}
            src={player.streamUrl}
            controls
            autoplay
            playsinline
            x-webkit-airplay="allow"
            class="video"
            onended={next}
            onplay={() => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; }}
            onpause={() => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; }}
          ></video>
        {/if}
      </div>
    </div>

    <QueuePanel open={queueOpen} />
  </div>
</div>

<style>
  .player-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .player-inner {
    display: flex;
    flex-direction: row;
    width: 100%;
    max-width: 1200px;
    max-height: 100%;
    gap: 0;
    height: 100%;
    max-height: 90vh;
  }

  .player-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.75rem;
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .nav-controls {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .nav-btn {
    padding: 0.35rem 0.5rem;
    border: 1px solid #555;
    border-radius: 4px;
    background: transparent;
    color: #ccc;
    font-size: 0.85rem;
    line-height: 1;
    transition: all 0.15s;
    cursor: pointer;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .nav-btn:not(:disabled):hover {
    background: #333;
    color: #fff;
  }

  .player-title {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #eee;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .queue-btn {
    padding: 0.35rem 0.65rem;
    border: 1px solid #555;
    border-radius: 4px;
    background: transparent;
    color: #ccc;
    font-size: 0.8rem;
    line-height: 1;
    transition: all 0.15s;
    cursor: pointer;
    white-space: nowrap;
  }

  .queue-btn:hover,
  .queue-btn.active {
    background: #333;
    color: #fff;
    border-color: #888;
  }

  .close-btn {
    flex-shrink: 0;
    padding: 0.35rem 0.65rem;
    border: 1px solid #555;
    border-radius: 4px;
    background: transparent;
    color: #ccc;
    font-size: 0.9rem;
    line-height: 1;
    transition: all 0.15s;
    cursor: pointer;
  }

  .close-btn:hover {
    background: #333;
    color: #fff;
  }

  .video-wrap {
    flex: 1;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 240px;
  }

  .video {
    width: 100%;
    max-height: 80vh;
    display: block;
  }

  .buffering {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: #888;
    font-size: 0.9rem;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #333;
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .player-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: #e55;
    text-align: center;
    padding: 2rem;
  }

  .player-error button {
    padding: 0.4rem 1.25rem;
    border: 1px solid #e55;
    border-radius: 4px;
    background: transparent;
    color: #e55;
    transition: all 0.15s;
    cursor: pointer;
  }

  .player-error button:hover {
    background: #e55;
    color: #fff;
  }
</style>
