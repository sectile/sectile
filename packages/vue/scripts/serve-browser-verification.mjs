import { createServer as createHTTPServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp } from 'vue';
import { createServer as createViteServer } from 'vite';
import { createHydrationFixture } from '../tests/browser/hydration-fixture.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = resolve(packageRoot, 'tests/browser');
const port = Number.parseInt(process.env['SECTILE_BROWSER_PORT'] ?? '4178', 10);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
  throw new TypeError('SECTILE_BROWSER_PORT must be a valid TCP port.');

const vite = await createViteServer({
  root: fixtureRoot,
  appType: 'custom',
  logLevel: 'error',
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
  },
  server: { middlewareMode: true },
});
const rendered = await renderToString(createSSRApp(createHydrationFixture()));
const template = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
  <body>
    <div id="app">${rendered}</div>
    <div id="external-form-control"></div>
    <pre id="result">pending</pre>
    <script type="module" src="/client.mjs?wi=46"></script>
  </body>
</html>`;

const server = createHTTPServer(async (request, response) => {
  if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/') {
    vite.middlewares(request, response);
    return;
  }
  try {
    const html = await vite.transformIndexHtml('/', template);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.stack : String(error));
  }
});

await new Promise((resolveListen) => server.listen(port, '127.0.0.1', resolveListen));
console.log(`browser verification ready: http://127.0.0.1:${port}/`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await vite.close();
    server.close(() => process.exit(0));
  });
}
