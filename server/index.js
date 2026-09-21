import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import searchRouter from './routes/search.js';
import libraryRouter from './routes/library.js';
import subtitlesRouter from './routes/subtitles.js';
import { scanLibrary } from './library/scanner.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');
const libraryRoot = path.resolve(__dirname, '../library');

// Make library root available to routes
process.env.LIBRARY_ROOT = libraryRoot;

app.use(cors());
app.use(express.json());

app.use('/api', searchRouter);
app.use('/api', libraryRouter);
app.use('/api', subtitlesRouter);

// Serve library files (posters etc.) as static assets
app.use('/library', express.static(libraryRoot));

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api') ||
    req.path.startsWith('/library') ||
    req.path.includes('.')
  ) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Scan library before accepting requests
await scanLibrary(libraryRoot);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
