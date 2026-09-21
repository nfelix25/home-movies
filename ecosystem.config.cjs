module.exports = {
  apps: [
    {
      name: 'home-movies',
      script: './server/index.js',
      watch: ['server'],
      // server/cache is written at runtime (generated film details); watching it would
      // restart the server, and any active torrents with it, on every new entry.
      ignore_watch: ['node_modules', 'client', 'server/cache'],
      env: {
        PORT: 8765,
      },
    },
  ],
};
