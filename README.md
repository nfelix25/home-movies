# home-movies

A minimal local tool to search for movies and TV shows and stream them directly in the browser via torrent.

## Setup

```bash
npm install
```

## Environment

Copy `.env.example` to `.env` in the repo root and fill in:

| Variable | Used for |
| --- | --- |
| `TMDB_API_KEY` | Posters, library metadata, and the facts in the film details popup |
| `OPEN_AI_API_KEY` | The popup's spoiler-free premise, review consensus and recommendations (OpenAI Responses API with web search) |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-5.4-mini` |

Click a poster in the movie grid to open the popup. Without `OPEN_AI_API_KEY` it still shows the TMDB facts.
Generated details are cached for 30 days in `server/cache/` (delete a file there, or use Regenerate in the popup, to redo one).

## Development

```bash
npm run dev
```

Starts the Express API server and the Vite dev server concurrently. Open http://localhost:5173.

## Production

```bash
npm run build   # compile the Svelte client to client/dist/
npm start       # serve API + static files on http://localhost:3000
```

## Running as a Service

Runs the app persistently on port **8765**, auto-starting on login and auto-restarting when server code changes.

**One-time setup:**

```bash
npm install -g pm2          # install PM2 globally
npm run build               # build the client
pm2 start ecosystem.config.cjs
pm2 startup                 # prints a command — run it to register with macOS
pm2 save                    # persist the process list across reboots
```

After setup, the app is available at http://localhost:8765 and survives reboots automatically.

**Day-to-day:**

```bash
pm2 logs home-movies        # view server logs
pm2 restart home-movies     # restart manually
npm run build               # update the frontend (no restart needed)
```
