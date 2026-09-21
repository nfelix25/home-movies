// Load the repo-root .env no matter which directory the server was started from.
// `dotenv/config` only reads ./.env, and `npm run dev` runs the server from server/,
// where it found nothing, so no API key was visible in dev mode.
// Import this first: other modules read process.env when they are imported.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
