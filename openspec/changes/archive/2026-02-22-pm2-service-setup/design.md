## Context

The app is a Node.js/Express server serving a pre-built Svelte frontend. Currently it must be started manually. The goal is to make it run persistently as a user-level macOS service that auto-starts on login, auto-restarts on server code changes, and requires zero manual intervention during normal use.

## Goals / Non-Goals

**Goals:**
- Auto-start on macOS login via launchd (user-level LaunchAgent)
- Auto-restart when files in `server/` change
- Single `ecosystem.config.js` as the source of truth for process configuration
- Client updates (after `npm run build`) reflected immediately without server restart

**Non-Goals:**
- Cross-platform service support (Linux systemd, Windows services)
- Auto-rebuilding the client on change (out of scope; user runs `npm run build` manually)
- Containerization or remote deployment

## Decisions

### Use PM2 as the process manager

**Decision**: Use PM2 (global npm package) rather than raw launchd plist + nodemon.

**Rationale**: PM2 handles three concerns in one tool — file watching, crash recovery, and startup registration via `pm2 startup` (which generates the launchd plist automatically). A raw plist approach would require composing nodemon + launchd separately, with more manual config.

**Alternatives considered**:
- `launchd plist only`: No file watching, manual plist authoring, harder to manage.
- `nodemon + launchd`: Two separate tools to configure and keep in sync.

### Watch only `server/` directory

**Decision**: PM2 watch targets `server/` only, not the full project.

**Rationale**: `client/dist/` is served as static files read off disk per-request — no server restart is needed when the client is rebuilt. Watching `node_modules/` or `client/` would cause unnecessary restarts and churn.

### `ecosystem.config.js` at project root

**Decision**: All PM2 config lives in `ecosystem.config.js` rather than CLI flags.

**Rationale**: Keeps config in version control, reproducible, and readable. Anyone cloning the repo sees exactly how the service is configured.

## Risks / Trade-offs

- **PM2 is a global dependency**: Not in `package.json`, so onboarding requires `npm install -g pm2` manually. Mitigated by documenting it clearly in README.
- **Watch restarts on partial saves**: Some editors write files in stages; PM2 may restart mid-edit. Mitigated by PM2's default debounce and the fact this is a personal dev machine.
- **launchd runs as user, not root**: Service only starts after login, not at boot. Acceptable for a personal local tool.

## Migration Plan

One-time setup (documented in README):
1. `npm install -g pm2`
2. `npm run build` (build client once)
3. `pm2 start ecosystem.config.js`
4. `pm2 startup` → copy/run the printed sudo command
5. `pm2 save`

After that: no action needed. Service is persistent across reboots.
