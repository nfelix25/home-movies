// Test-only: mount a router on a throwaway Express server so tests exercise real HTTP.

import express from 'express';

export async function startApp(mountPath, router) {
  const app = express();
  app.use(mountPath, router);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    /** GET a path and return { status, body } with the body parsed as JSON. */
    async get(pathAndQuery) {
      const res = await fetch(base + pathAndQuery);
      return { status: res.status, body: await res.json() };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
