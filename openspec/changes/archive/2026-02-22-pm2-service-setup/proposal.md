## Why

The app currently requires manual startup every session. Running it as a persistent macOS background service with file-watching means it's always available at `localhost:3000` and automatically restarts when server code changes.

## What Changes

- Add `ecosystem.config.js` at the project root to configure PM2 (watch settings, env, process name)
- Add a `Makefile` or `scripts/service.sh` with commands for installing/starting/stopping the service
- Document the one-time PM2 setup (install PM2 globally, run `pm2 startup`, run `pm2 save`)

## Capabilities

### New Capabilities

- `service-management`: Configure and manage the app as a persistent macOS background service using PM2; auto-starts on login via launchd, watches `server/` for changes and restarts automatically

### Modified Capabilities

None.

## Impact

- **New files**: `ecosystem.config.js` at project root
- **New dependency**: PM2 (global, not in package.json)
- **No code changes**: server and client code are unchanged
- **macOS only**: Uses `pm2 startup` which integrates with launchd (LaunchAgents)
