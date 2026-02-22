<script lang="ts">
  import { player, closePlayer } from '../lib/playerStore.svelte.js';
</script>

<div class="player-overlay" role="dialog" aria-modal="true" aria-label="Video player">
  <div class="player-inner">
    <div class="player-header">
      <h2 class="player-title">{player.title}</h2>
      <button class="close-btn" onclick={closePlayer} aria-label="Close player">✕</button>
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
          src={player.streamUrl}
          controls
          autoplay
          class="video"
        ></video>
      {/if}
    </div>
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
    flex-direction: column;
    width: 100%;
    max-width: 960px;
    max-height: 100%;
    gap: 0.75rem;
  }

  .player-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .player-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #eee;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  }

  .player-error button:hover {
    background: #e55;
    color: #fff;
  }
</style>
