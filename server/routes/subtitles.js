import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const OPENSUBTITLES_BASE = 'https://api.opensubtitles.com/api/v1';

function srtToVtt(srt) {
  // Normalise line endings
  const normalised = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Replace SRT timestamp commas with dots (00:00:00,000 → 00:00:00.000)
  const converted = normalised.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return 'WEBVTT\n\n' + converted.trim() + '\n';
}

router.get('/subtitles', async (req, res) => {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'Subtitle support is not configured.' });
  }

  const { imdb_id } = req.query;
  if (!imdb_id || typeof imdb_id !== 'string') {
    return res.status(400).json({ error: 'imdb_id query parameter is required.' });
  }

  const headers = {
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'home-movies/1.0',
  };

  try {
    // Step 1: search for English subtitles
    const searchRes = await fetch(
      `${OPENSUBTITLES_BASE}/subtitles?imdb_id=${encodeURIComponent(imdb_id)}&languages=en`,
      { headers }
    );

    if (!searchRes.ok) {
      throw new Error(`OpenSubtitles search responded with ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const results = Array.isArray(searchData.data) ? searchData.data : [];

    if (results.length === 0) {
      return res.status(404).json({ error: 'No English subtitles found.' });
    }

    // Pick best result by download_count
    const best = results.reduce((a, b) =>
      (b.attributes?.download_count ?? 0) > (a.attributes?.download_count ?? 0) ? b : a
    );

    const fileId = best.attributes?.files?.[0]?.file_id;
    if (!fileId) {
      return res.status(404).json({ error: 'No subtitle file available.' });
    }

    // Step 2: request download link
    const dlRes = await fetch(`${OPENSUBTITLES_BASE}/download`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file_id: fileId }),
    });

    if (!dlRes.ok) {
      throw new Error(`OpenSubtitles download responded with ${dlRes.status}`);
    }

    const dlData = await dlRes.json();
    const link = dlData.link;
    if (!link) {
      throw new Error('No download link in OpenSubtitles response');
    }

    // Step 3: fetch and convert SRT → VTT
    const srtRes = await fetch(link);
    if (!srtRes.ok) {
      throw new Error(`Failed to fetch subtitle file: ${srtRes.status}`);
    }

    const srtText = await srtRes.text();
    let vtt;
    try {
      vtt = srtToVtt(srtText);
    } catch (err) {
      return res.status(502).json({ error: 'Failed to convert subtitle format.' });
    }

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(vtt);
  } catch (err) {
    console.error('[subtitles] Error:', err.message);
    res.status(502).json({ error: 'Unable to fetch subtitles at this time.' });
  }
});

export default router;
