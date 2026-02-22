module.exports = {
  apps: [
    {
      name: 'home-movies',
      script: './server/index.js',
      watch: ['server'],
      ignore_watch: ['node_modules', 'client'],
      env: {
        PORT: 8765,
      },
    },
  ],
};
