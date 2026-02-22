### Requirement: Auto-start on macOS login
The service SHALL start automatically when the user logs into macOS, without any manual intervention, by registering with launchd via `pm2 startup`.

#### Scenario: Service starts after reboot
- **WHEN** the macOS user logs in after a reboot
- **THEN** the home-movies server SHALL be running and accessible at `localhost:8765` within 30 seconds

#### Scenario: Service survives without terminal
- **WHEN** no terminal window is open
- **THEN** the server SHALL continue to respond to requests normally

### Requirement: Auto-restart on server code change
The service SHALL automatically restart the Node.js process when any file within the `server/` directory is modified.

#### Scenario: Server file edited
- **WHEN** a file in `server/` is saved
- **THEN** PM2 SHALL detect the change and restart the Node.js process
- **THEN** the server SHALL be accessible at `localhost:8765` again within 5 seconds

#### Scenario: Client files do not trigger restart
- **WHEN** files in `client/dist/` are updated (e.g., after `npm run build`)
- **THEN** PM2 SHALL NOT restart the server process
- **THEN** the updated client files SHALL be served on the next browser request without restart

### Requirement: Crash recovery
The service SHALL automatically restart the Node.js process if it exits unexpectedly.

#### Scenario: Process crashes
- **WHEN** the Node.js process exits with a non-zero code
- **THEN** PM2 SHALL restart the process automatically

### Requirement: Process configuration in version control
All PM2 process configuration SHALL be defined in `ecosystem.config.js` at the project root, committed to the repository.

#### Scenario: Config is present in repo
- **WHEN** the repository is cloned
- **THEN** `ecosystem.config.js` SHALL exist and contain all configuration needed to start the service via `pm2 start ecosystem.config.js`
