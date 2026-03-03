export let player = $state({
  active: false,
  streamUrl: '',
  title: '',
  loading: false,
  error: null,
});

/**
 * Add item to library (or retrieve existing) and activate the player.
 * metadata should include: type, title, year/season/episode, imdbId, poster, showTitle etc.
 */
export async function startStream(magnet, title, metadata = {}) {
  player.active = true;
  player.loading = true;
  player.title = title;
  player.streamUrl = '';
  player.error = null;

  try {
    const res = await fetch('/api/library/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet, metadata }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to start stream');
    }

    player.streamUrl = data.streamUrl;
    player.loading = false;
  } catch (err) {
    player.loading = false;
    player.error = err.message || 'Failed to start stream';
  }
}

/** Activate player with a known stream URL (no library add needed) */
export function activateStream(streamUrl, title) {
  player.active = true;
  player.loading = false;
  player.title = title;
  player.streamUrl = streamUrl;
  player.error = null;
}

export function closePlayer() {
  player.active = false;
  player.streamUrl = '';
  player.title = '';
  player.loading = false;
  player.error = null;
}
