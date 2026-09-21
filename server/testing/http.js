// Test-only helpers. Nothing in production code imports this file.

const realFetch = globalThis.fetch;

/**
 * Replace globalThis.fetch with a small router so tests run the real code paths
 * against canned upstream responses.
 *
 * routes: [{ match(url: URL, init) => boolean,
 *            respond(url: URL, init) => { status?: number, body: any } | Promise<...> }]
 *
 * A request that matches no route throws, so an unexpected upstream call fails the
 * test instead of silently reaching the network. Requests to 127.0.0.1 (a test's own
 * server) pass through to the real fetch.
 */
export function stubFetch(routes) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input?.url ?? input));
    if (url.hostname === '127.0.0.1') return realFetch(input, init);
    calls.push({ url, init });
    const route = routes.find((r) => r.match(url, init));
    if (!route) throw new Error(`Unexpected fetch: ${init.method || 'GET'} ${url}`);
    const { status = 200, body } = await route.respond(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = realFetch;
    },
  };
}
