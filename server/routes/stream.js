import { Router } from 'express';
import WebTorrent from 'webtorrent';

const router = Router();
const client = new WebTorrent();

router.post('/api/stream', (req, res) => {
  res.status(501).json({ error: 'Stream start not implemented yet' });
});

router.get('/stream/:infoHash/:fileIndex', (req, res) => {
  res.status(501).json({ error: 'Stream delivery not implemented yet' });
});

export default router;
