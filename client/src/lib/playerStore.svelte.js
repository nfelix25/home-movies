export let player = $state({
  active: false,
  streamUrl: '',
  title: '',
  loading: false,
  error: null,
});

/** POST a magnet link to /api/stream and activate the player overlay */
export async function startStream(magnet, title) {
  player.active = true;
  player.loading = true;
  player.title = title;
  player.streamUrl = '';
  player.error = null;

  try {
    const res = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet }),
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

export function closePlayer() {
  player.active = false;
  player.streamUrl = '';
  player.title = '';
  player.loading = false;
  player.error = null;
}
