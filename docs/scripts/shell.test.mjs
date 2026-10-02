import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';
import {
  areas,
  components,
  componentPath,
  examplePath,
  examples,
  hosts,
  validateExampleCatalog,
} from '../src/examples/catalog.ts';
import { routes } from '../src/routes.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the active documentation package is a Vue and Vite shell', async () => {
  const packageJSON = JSON.parse(await read('package.json'));
  const dependencySurface = JSON.stringify({
    dependencies: packageJSON.dependencies,
    devDependencies: packageJSON.devDependencies,
    scripts: packageJSON.scripts,
  });

  assert.equal(packageJSON.dependencies.vue, '^3.5.22');
  assert.equal(packageJSON.scripts.dev, 'vite --host 127.0.0.1');
  assert.equal(packageJSON.scripts.build, 'vite build && node scripts/materialize-routes.mjs');
  assert.doesNotMatch(dependencySurface, /vitepress/u);
});

test('the shell derives separate Vue and DOM package and example routes', () => {
  const paths = routes.map((route) => route.path);

  assert.equal(paths[0], '/');
  assert.equal(new Set(paths).size, paths.length);
  for (const host of hosts) {
    assert.ok(paths.includes(`/${host.id}`));
    for (const area of areas) assert.ok(paths.includes(`/${host.id}/${area.id}`));
  }
  for (const example of examples) assert.ok(paths.includes(examplePath(example)));
  for (const component of components) assert.ok(paths.includes(componentPath(component.subject)));
  assert.throws(() => componentPath('Unknown'), /Unknown documented component/u);
  assert.ok(!paths.includes('/components'));
  assert.ok(!paths.includes('/packages'));
});

test('the design shell keeps fixed navigation geometry in tokens', async () => {
  const tokens = await read('src/styles/tokens.css');
  const shell = await read('src/styles/shell.css');

  assert.match(tokens, /--docs-header-height: 56px/u);
  assert.match(tokens, /--docs-sidebar-width: 256px/u);
  assert.match(tokens, /--docs-reading-width: 760px/u);
  assert.match(shell, /grid-template-columns: var\(--docs-sidebar-width\) minmax\(0, 1fr\)/u);
  assert.doesNotMatch(shell, /--vp-/u);
});

test('documentation palette maintains readable text and identifiable control edges', async () => {
  const tokens = await read('src/styles/tokens.css');
  const palette = Object.fromEntries([...tokens.matchAll(/--docs-([\w-]+):\s*(#[\da-f]{6});/gu)].map(([, name, value]) => [name, value]));
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [foreground, background, minimum] of [
    ['text', 'bg', 4.5], ['text-muted', 'bg-muted', 4.5],
    ['bg', 'accent', 4.5], ['bg', 'accent-hover', 4.5],
    ['code-text', 'code-bg', 4.5], ['code-muted', 'code-bg', 4.5],
    ['control-border', 'bg', 3], ['control-border', 'bg-muted', 3],
    ['checkbox-border', 'bg', 3], ['error', 'bg', 4.5],
  ]) {
    const levels = [luminance(palette[foreground]), luminance(palette[background])].sort((a, b) => b - a);
    const ratio = (levels[0] + 0.05) / (levels[1] + 0.05);
    assert.ok(ratio >= minimum, `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
  }
});

test('the example catalog rejects host mixing and duplicate focused routes', () => {
  const vueExample = examples.find((example) => example.host === 'vue');
  assert.ok(vueExample);

  const hostMixed = { ...vueExample, sourceOwner: 'dom' };
  assert.ok(validateExampleCatalog([hostMixed]).some((issue) => issue.code === 'host-source-mismatch'));

  const duplicate = { ...vueExample, id: 'duplicate-example' };
  assert.ok(validateExampleCatalog([vueExample, duplicate]).some((issue) => issue.code === 'duplicate-path'));

  const unfocused = { ...vueExample, id: 'unfocused-example', slug: 'checkbox/unfocused', focus: '   ' };
  assert.ok(validateExampleCatalog([unfocused]).some((issue) => issue.code === 'empty-focus'));
});

test('behavior example sources stay inside their host and omit presentation styling', async () => {
  for (const example of examples) {
    assert.equal(example.sourceOwner, example.host);
    assert.match(example.previewPath, new RegExp(`^\\./${example.host}/`, 'u'));
    assert.ok(example.focus.trim().length > 0);

    await read(`src/examples/${example.previewPath.slice(2)}`);
    for (const section of example.code) {
      assert.match(section.path, new RegExp(`^\\./${example.host}/`, 'u'));
      const source = await read(`src/examples/${section.path.slice(2)}`);
      if (example.host === 'vue') assert.doesNotMatch(source, /@sectile\/dom/u);
      else assert.doesNotMatch(source, /@sectile\/vue|from ['"]vue['"]/u);
      if (example.kind === 'behavior') assert.doesNotMatch(source, /<style\b|\.css['"]|style\s*=/u);
    }
  }
});

test('vue checkbox preview keeps a persistent visual box around the conditional indicator', async () => {
  const preview = await read('src/examples/vue/components/checkbox/controlled-state/Preview.vue');
  const shell = await read('src/styles/shell.css');
  const boxIndex = preview.indexOf('data-example-checkbox-box');
  const indicatorIndex = preview.indexOf('<CheckboxIndicator>');

  assert.ok(boxIndex >= 0 && indicatorIndex > boxIndex);
  assert.match(shell, /\[data-example-checkbox-box\]/u);
  assert.match(shell, /\[data-state="checked"\].*\[data-example-checkbox-box\]/u);
});

test('runtime modules are resolved from catalog paths instead of a second example registry', async () => {
  const runtime = await read('src/examples/runtime.ts');
  assert.match(runtime, /import\.meta\.glob/u);
  for (const example of examples) assert.doesNotMatch(runtime, new RegExp(example.id, 'u'));
});

test('preview is primary and relevant code stays collapsed by default', async () => {
  const app = await read('src/components/ExamplePage.vue');
  const previewIndex = app.indexOf('class="docs-preview"');
  const codeIndex = app.indexOf('class="docs-code-disclosure"');

  assert.ok(previewIndex >= 0 && codeIndex > previewIndex);
  assert.match(app, /<details class="docs-code-disclosure">/u);
  assert.doesNotMatch(app, /<details class="docs-code-disclosure"\s+open/u);
});

test('Vue readers have a complete introduction and representative component destinations', () => {
  for (const path of ['/vue/getting-started', '/vue/guides/styling', '/vue/guides/state', '/vue/components/checkbox', '/vue/components/dialog', '/vue/form/native-submission']) {
    const route = routes.find((candidate) => candidate.path === path);
    assert.ok(route, path);
    assert.equal(route.host, 'vue');
  }
  assert.ok(examples.some((example) => example.subject === 'Dialog'));
  assert.ok(examples.some((example) => example.area === 'form'));
  assert.ok(examples.some((example) => example.kind === 'styling'));
});

test('every shipped route renders and all internal page links resolve', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  });
  // The client router reads location at import time. This fixture supplies only
  // that boundary; rendering is real Vue SSR, not a browser-behavior assertion.
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = {
    location: { pathname: '/sectile/' },
    addEventListener() {},
    history: { pushState() {} },
    scrollTo() {},
  };
  globalThis.document = { title: '' };
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.vue');
    const { currentPath } = await server.ssrLoadModule('/src/router.ts');
    const paths = new Set(routes.map((route) => route.path));
    for (const route of routes) {
      currentPath.value = route.path;
      const html = await renderToString(createSSRApp(App));
      assert.match(html, /<h1(?:\s[^>]*)?>[^<]/u, route.path);
      assert.ok(!html.includes('Page not found'), route.path);
      for (const [, href] of html.matchAll(/href="([^"#]+)"/gu)) {
        assert.ok(href.startsWith('/sectile/'), `${route.path}: ${href}`);
        const path = href.slice('/sectile'.length).replace(/\/$/u, '') || '/';
        assert.ok(paths.has(path), `${route.path}: unresolved link ${href}`);
      }
      if (route.kind === 'example') {
        assert.match(html, /class="docs-preview/u);
        assert.match(html, /<details class="docs-code-disclosure">/u);
        const preview = html.slice(html.indexOf('class="docs-preview'), html.indexOf('<details class="docs-code-disclosure">'));
        const initialStates = {
          'vue-components-switch-controlled-state': [/role="switch"/u, /aria-checked="false"/u, /Enabled: false/u],
          'vue-components-toggle-button-pressed-state': [/aria-pressed="false"/u, /Pinned: false/u],
          'vue-components-toggle-group-multiple-selection': [/aria-pressed="true"/u, /Selected: bold/u, /aria-disabled="true"/u],
          'vue-components-radio-group-disabled-options': [/role="radiogroup"/u, /aria-checked="true"/u, /Delivery: Standard/u, /aria-disabled="true"/u],
          'vue-components-tabs-manual-activation': [/role="tablist"/u, /aria-selected="true"/u, /Selected: Overview/u, /aria-disabled="true"/u],
          'vue-components-popover-positioned-dismissal': [/aria-expanded="false"/u, /Open: false/u],
        };
        for (const state of initialStates[route.exampleId] ?? []) assert.match(preview, state, route.path);
        if (route.exampleId === 'vue-components-disclosure-exit-transition') {
          assert.match(html, /<output[^>]*aria-live="polite"[^>]*>Open: true · Present<\/output>/u);
          assert.match(html, /aria-expanded="true"/u);
        }
      } else {
        assert.doesNotMatch(html, /class="docs-preview/u, 'Galleries do not mount live previews');
      }
      if (route.host === 'dom') assert.doesNotMatch(html, /Vue documentation/u);
    }
    currentPath.value = '/missing';
    assert.match(await renderToString(createSSRApp(App)), /Page not found/u);
  } finally {
    await server.close();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
