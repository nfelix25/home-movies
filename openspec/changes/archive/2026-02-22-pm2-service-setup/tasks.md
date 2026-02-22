## 1. PM2 Configuration

- [x] 1.1 Create `ecosystem.config.js` at project root with process name, entry point (`server/index.js`), watch enabled for `server/` directory, ignore patterns for `client/` and `node_modules/`, and `env: { PORT: 8765 }` to override the default port
- [x] 1.2 Verify `ecosystem.config.js` correctly excludes `client/dist/` and `node_modules/` from watch

## 2. Documentation

- [x] 2.1 Add a "Running as a Service" section to README.md with one-time setup steps: install PM2 globally, build client, `pm2 start`, `pm2 startup`, `pm2 save`; note that the app runs on port 8765
- [x] 2.2 Document day-to-day usage: how to check logs (`pm2 logs`), restart manually (`pm2 restart home-movies`), and update client (`npm run build`)
