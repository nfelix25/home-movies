import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * JSON-file cache for generated film insights, one file per TMDB id.
 * Entries carry their own `generatedAt` (ISO string) and expire `ttlMs` after it.
 */
export function createCache({ dir, ttlMs = DEFAULT_TTL_MS, now = Date.now }) {
  function fileFor(tmdbId) {
    if (!Number.isInteger(tmdbId)) {
      throw new TypeError(`Cache key must be an integer TMDB id, got ${String(tmdbId)}`);
    }
    return path.join(dir, `${tmdbId}.json`);
  }

  return {
    /** The fresh entry for this film, or null if missing, expired or unreadable. */
    get(tmdbId) {
      const file = fileFor(tmdbId);
      let entry;
      try {
        entry = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
      const age = now() - Date.parse(entry?.generatedAt);
      return age <= ttlMs ? entry : null;
    },

    /** Write atomically (temp file, then rename) so a reader never sees a partial entry. */
    set(tmdbId, entry) {
      const file = fileFor(tmdbId);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.${now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(entry, null, 2));
      fs.renameSync(tmp, file);
    },
  };
}

let shared;

/** The app-wide cache, at server/cache/insights (gitignored). Created on first use. */
export function defaultCache() {
  shared ??= createCache({
    dir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../cache/insights'),
  });
  return shared;
}
