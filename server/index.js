import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import searchRouter from './routes/search.js';
import streamRouter from './routes/stream.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

app.use(cors());
app.use(express.json());

app.use('/api', searchRouter);
app.use('/', streamRouter);

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api') ||
    req.path.startsWith('/stream') ||
    req.path.includes('.')
  ) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
