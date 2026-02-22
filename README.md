# home-movies

A minimal local tool to search for movies and TV shows and stream them directly in the browser via torrent.

## Setup

```bash
npm install
```

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
