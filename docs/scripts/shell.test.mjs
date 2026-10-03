import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { getEventListeners } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createRenderer, createSSRApp, defineComponent, h, nextTick, shallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { compileScript, parse } from 'vue/compiler-sfc';
import { createServer, transformWithEsbuild } from 'vite';
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
import { highlightCode } from '../src/code-highlighting.ts';
import { componentAccessibility, domainAccessibility } from '../src/accessibility.ts';
import { codePresentation } from '../src/code-disclosure.ts';
import { collectOutline, connectOutline, outlineIndex, outlineWindow, outlineRailOffset, outlineRailPath } from '../src/page-outline.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const countButtons = (html, label) => [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gu)]
  .filter(([, content]) => content.replace(/<!--[\s\S]*?-->|<[^>]*>/gu, '').trim() === label).length;
const componentStyles = async () => {
  const files = await readdir(new URL('../src/components/', import.meta.url));
  return Promise.all(files.filter(file => file.endsWith('.vue')).map(async file =>
    parse(await read(`src/components/${file}`)).descriptor.styles.map(style => style.content).join('\n')));
};

test('page outline derives stable heading anchors and owns bounded scroll resources', () => {
  const headings = [
    { tagName: 'H2', textContent: 'Usage', id: '', top: 100 },
    { tagName: 'H3', textContent: 'Size', id: 'existing-size', top: 250 },
    { tagName: 'H2', textContent: 'Usage', id: '', top: 500 },
    { tagName: 'H2', textContent: 'Preview internals', id: '', top: 600, excluded: true },
    { tagName: 'H2', textContent: '한글 제목', id: '', top: 700 },
  ];
  let reads = 0;
  let queries = 0;
  let observer;
  let mutations;
  let nextFrame = 1;
  const frames = new Map();
  const listeners = new Map();
  const view = {
    scrollY: 0,
    innerHeight: 800,
    getComputedStyle: () => ({ getPropertyValue: () => '56px' }),
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name, handler) => { assert.equal(listeners.get(name), handler); listeners.delete(name); },
    requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class {
      targets = new Set();
      constructor(callback) { this.callback = callback; observer = this; }
      observe(target) { this.targets.add(target); }
      disconnect() { this.targets.clear(); }
    },
    MutationObserver: class {
      targets = new Set();
      constructor(callback) { this.callback = callback; mutations = this; }
      observe(target) { this.targets.add(target); }
      disconnect() { this.targets.clear(); }
    },
  };
  headings.forEach(heading => {
    heading.closest = () => heading.excluded ? {} : null;
    heading.getBoundingClientRect = () => { reads++; return { top: heading.top - view.scrollY }; };
  });
  const root = {
    getBoundingClientRect: () => { reads++; return { bottom: 1600 - view.scrollY }; },
    querySelectorAll: () => { queries++; return headings; },
    ownerDocument: { defaultView: view, getElementById: id => headings.find(heading => heading.id === id) },
    parentElement: {},
  };
  const first = collectOutline(root).entries;
  assert.deepEqual(first.map(entry => [entry.id, entry.depth]), [['section-usage', 0], ['existing-size', 1], ['section-usage-2', 0], ['section-한글-제목', 0]]);
  assert.deepEqual(collectOutline(root).entries, first, 'recollection preserves generated anchors');
  assert.equal(outlineIndex([], 100), -1);
  assert.equal(outlineIndex([100, 100, 250], 100), 1);
  assert.equal(outlineIndex([100, 250], 99), -1);
  assert.equal(outlineIndex([100, 250], 900), 1);
  let indexedReads = 0;
  const positions = Array.from({ length: 4096 }, (_, index) => index * 10);
  positions.forEach((value, index) => Object.defineProperty(positions, index, { get: () => { indexedReads++; return value; } }));
  assert.equal(outlineIndex(positions, 20001), 2000);
  assert.ok(indexedReads <= 13, 'scroll lookup has a logarithmic read bound');
  for (let iteration = 0; iteration < 3; iteration++) {
    let published;
    const active = [];
    const dispose = connectOutline(root, entries => { published = entries; }, id => active.push(id));
    assert.deepEqual(published, first);
    assert.equal(listeners.size, 2);
    assert.equal(observer.targets.size, first.length + 2);
    assert.equal(mutations.targets.size, 1);
    const before = { reads, queries };
    view.scrollY = 460;
    listeners.get('scroll')();
    listeners.get('scroll')();
    assert.equal(frames.size, 1);
    const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); };
    flush();
    assert.deepEqual([active.at(-1).first, active.at(-1).last], [2, 3]);
    assert.deepEqual({ reads, queries }, before, 'ordinary scroll neither measures nor recollects headings');
    headings[2].top = 900;
    headings[4].top = 1100;
    observer.callback();
    flush();
    assert.equal(reads, before.reads + first.length + 1);
    assert.deepEqual([active.at(-1).first, active.at(-1).last], [1, 3], 'layout changes refresh the offset cache');
    headings[1].top = 600;
    mutations.callback();
    flush();
    assert.equal(active.at(-1).first, 0, 'internal heading movement refreshes with unchanged article size');
    listeners.get('scroll')();
    const staleFrame = [...frames.values()][0];
    const staleResize = observer.callback;
    const staleMutation = mutations.callback;
    const count = active.length;
    dispose();
    dispose();
    staleFrame();
    staleResize();
    staleMutation();
    assert.equal(active.length, count);
    assert.equal(listeners.size, 0);
    assert.equal(observer.targets.size, 0);
    assert.equal(mutations.targets.size, 0);
    assert.equal(frames.size, 0);
    headings[2].top = 500;
    headings[1].top = 250;
    headings[4].top = 700;
    view.scrollY = 0;
  }
});

test('outline projects the full viewport continuously through nested row geometry and the article end', () => {
  const positions = [100, 350, 550, 750, 950];
  // Finite document: scrollY=400 is the bottom of a 1200px page in an 800px viewport.
  const bottom = outlineWindow(positions, 1100, 480, 1200);
  assert.deepEqual([bottom.first, bottom.last, bottom.end], [1, 4, 5]);
  assert.equal(bottom.start, 1.65);
  const moved = outlineWindow(positions, 1100, 481, 1201);
  assert.ok(moved.start > bottom.start && moved.start < 1.66, 'the rail edge follows sub-row scroll progress');
  assert.deepEqual(outlineWindow(positions, 1100, 0, 99), { start: 0, end: 0, first: -1, last: -1 });
  assert.deepEqual(outlineWindow(positions, 1100, 1100, 1600), { start: 5, end: 5, first: -1, last: -1 });
  assert.deepEqual(outlineWindow([], 0, 0, 800), { start: 0, end: 0, first: -1, last: -1 });
  assert.deepEqual(outlineWindow([100, 100, 200], 300, 100, 200), { start: 1, end: 2, first: 1, last: 1 });
  const boundaries = [0, 32, 64, 116, 148, 180]; // wrapped labels have real measured heights
  assert.equal(outlineRailOffset(boundaries, bottom.start), 52.8);
  assert.equal(outlineRailOffset(boundaries, bottom.end), 180);
  assert.equal(outlineRailOffset(boundaries, 2.5), 90);
  assert.equal(outlineRailOffset([], 1), 0);
  const entries = [0, 1, 1, 0, 0].map((depth, index) => ({ id: String(index), label: String(index), depth }));
  assert.equal(outlineRailPath(entries, boundaries, 12), 'M 1 0 L 1 26 L 13 38 L 13 110 L 1 122 L 1 180');
  let reads = 0;
  const large = Array.from({ length: 4096 }, (_, index) => index * 10);
  large.forEach((value, index) => Object.defineProperty(large, index, { get: () => { reads++; return value; } }));
  assert.deepEqual([outlineWindow(large, 40960, 20001, 20801).first, outlineWindow(large, 40960, 20001, 20801).last], [2000, 2080]);
  assert.ok(reads <= 72, 'two viewport queries have logarithmic coordinate-read bounds');
});

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
  assert.match(tokens, /--docs-reading-width: 720px/u);
  assert.match(shell, /grid-template-columns: var\(--docs-sidebar-width\) minmax\(0, 1fr\)/u);
  assert.doesNotMatch(shell, /--vp-/u);
  const preview = await read('src/styles/preview.css');
  assert.match(preview, /\[data-highlighted\]/u);
  assert.doesNotMatch(preview, /\[data-highlighted="true"\]/u, 'highlight is a presence attribute, not a string boolean');
  for (const file of ['src/App.vue', ...(await readdir(new URL('../src/components/', import.meta.url))).filter(file => file.endsWith('.vue')).map(file => `src/components/${file}`)]) {
    assert.doesNotMatch(await read(file), /<(?:button|a|details|summary)\b/u, `${file}: documentation controls compose shared Sectile-backed UI`);
  }
  assert.match(await read('src/components/DocsButton.vue'), /from '@sectile\/vue\/primitive'/u);
  assert.match(await read('src/components/DocsLink.vue'), /from '@sectile\/vue\/primitive'/u);
  assert.match(await read('src/components/DocsDisclosure.vue'), /from '@sectile\/vue\/disclosure'/u);
  const buttonStyles = parse(await read('src/components/DocsButton.vue')).descriptor.styles.map(style => style.content).join('\n');
  assert.match(buttonStyles, /\.docs-button--quiet\s*\{[^}]*border-color:\s*transparent/u);
  assert.match(buttonStyles, /\.docs-button--quiet:focus\s*\{[^}]*outline:\s*none/u);
  assert.match(buttonStyles, /\.docs-button--quiet:focus-visible\s*\{[^}]*text-decoration:\s*underline/u);
  assert.doesNotMatch(shell, /\.docs-(?:button|sidebar|breadcrumb|example-card|disclosure)\b/u, 'shared UI styles belong to their components, not the page shell');
  const styleSources = [tokens, shell, preview, await read('src/styles/base.css'), ...await componentStyles()];
  const declarations = new Set(styleSources.flatMap(source => [...source.matchAll(/(--docs-[\w-]+)\s*:/gu)].map(([, name]) => name)));
  for (const source of styleSources) {
    for (const [, name] of source.matchAll(/var\((--docs-[\w-]+)/gu)) {
      assert.ok(declarations.has(name), `${name} must have a declaration; missing tokens silently drop CSS rules`);
    }
  }
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
    ['text', 'hover-bg', 4.5], ['text-muted', 'hover-bg', 4.5],
    ['bg', 'accent', 4.5], ['bg', 'accent-hover', 4.5],
    ['code-text', 'code-bg', 4.5], ['code-muted', 'code-bg', 4.5],
    ...['keyword', 'string', 'constant', 'function', 'tag', 'attribute', 'punctuation'].map(role => [`code-${role}`, 'code-bg', 4.5]),
    ['control-border', 'bg', 3], ['control-border', 'bg-muted', 3],
    ['checkbox-border', 'bg', 3], ['error', 'bg', 4.5],
    ['accent', 'accent-soft', 4.5], ['focus', 'bg-muted', 3],
    ['disabled-text', 'disabled-bg', 4.5], ['disabled-border', 'disabled-bg', 3],
    ['error', 'error-soft', 4.5], ['success', 'success-soft', 4.5],
    ['warning', 'warning-soft', 4.5], ['on-accent', 'accent', 4.5],
  ]) {
    const levels = [luminance(palette[foreground]), luminance(palette[background])].sort((a, b) => b - a);
    const ratio = (levels[0] + 0.05) / (levels[1] + 0.05);
    assert.ok(ratio >= minimum, `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
  }
});

test('documentation presentation uses the shared palette and preserves distinct control and panel geometry', async () => {
  const tokens = await read('src/styles/tokens.css');
  const values = Object.fromEntries([...tokens.matchAll(/(--docs-[\w-]+):\s*([^;]+);/gu)].map(([, name, value]) => [name, value.trim()]));
  for (const path of ['src/styles/example-presence.css']) {
    const source = await read(path);
    for (const [, name, fallback] of source.matchAll(/var\((--docs-[\w-]+),\s*(#[\da-f]{6}|\d+px)\)/gu)) {
      assert.equal(fallback, values[name], `${path}: ${name} fallback matches its shared token`);
    }
  }
  const shell = await read('src/styles/preview.css');
  assert.match(shell, /\[data-example-text-fields\] textarea \{ border-radius: var\(--docs-item-radius\)/u);
  assert.match(tokens, /--docs-inner-radius: max\(0px, calc\(var\(--docs-radius\) - var\(--docs-border-width\) - var\(--docs-surface-inset\)\)\)/u);
});

test('shared fields derive equal insets, line boxes and compound allocation from tokens', async () => {
  const tokens = await read('src/styles/tokens.css');
  const values = Object.fromEntries([...tokens.matchAll(/(--docs-[\w-]+):\s*([^;]+);/gu)].map(([, name, value]) => [name, value.trim()]));
  const numeric = (name) => {
    const value = values[name];
    const reference = /^var\((--docs-[\w-]+)\)$/u.exec(value);
    if (reference) return numeric(reference[1]);
    assert.match(value, /^\d+px$/u, name);
    return Number.parseFloat(value);
  };
  const height = numeric('--docs-field-height');
  const inset = numeric('--docs-field-inset');
  const border = numeric('--docs-border-width');
  const content = height - 2 * border - 2 * inset;
  assert.equal(height, 44);
  assert.equal(content, 18);
  assert.ok(content >= numeric('--docs-field-icon-size'));
  assert.ok(content >= numeric('--docs-field-font-size'));
  assert.equal(numeric('--docs-field-value-width') + numeric('--docs-field-gap') + height, 252);
  assert.equal(height - 2 * border, 42);
  assert.equal(numeric('--docs-field-value-width') + numeric('--docs-field-unit-width') + 2 * border, 306);
  assert.equal(values['--docs-field-group-content-height'], 'calc(var(--docs-field-height) - 2 * var(--docs-border-width))');
  assert.equal(values['--docs-field-group-width'], 'calc(var(--docs-field-value-width) + var(--docs-field-unit-width) + 2 * var(--docs-border-width))');
  assert.equal(inset + numeric('--docs-field-icon-size') + numeric('--docs-field-gap'), 36);
  assert.equal(values['--docs-field-content-height'], 'calc(var(--docs-field-height) - 2 * var(--docs-border-width) - 2 * var(--docs-field-inset))');
  assert.equal(values['--docs-field-select-reserve'], 'calc(var(--docs-field-inset) + var(--docs-field-icon-size) + var(--docs-field-gap))');
  const fields = await read('src/styles/example-fields.css');
  const styles = await read('src/styles/preview.css');
  assert.match(styles, /@import ['"]\.\/example-fields\.css['"]/u);
  assert.match(fields, /block-size: var\(--docs-field-height\)/u);
  assert.match(fields, /padding: var\(--docs-field-inset\)/u);
  assert.match(fields, /line-height: var\(--docs-field-content-height\)/u);
  assert.match(fields, /padding-inline-end: var\(--docs-field-select-reserve\)/u);
  assert.match(fields, /background-position: right var\(--docs-field-inset\) center/u);
  assert.match(fields, /:dir\(rtl\)[\s\S]*background-position: left var\(--docs-field-inset\) center/u);
  assert.match(fields, /forced-colors: active[\s\S]*appearance: auto/u);
  const group = /\[data-example-field-group\] \{([^}]+)\}/u.exec(fields)?.[1];
  assert.ok(group);
  assert.match(group, /display: grid/u);
  assert.match(group, /grid-template-columns: minmax\(0, 1fr\) min\(var\(--docs-field-unit-width\), 40%\)/u);
  assert.match(group, /grid-template-rows: var\(--docs-field-group-content-height\)/u);
  assert.match(group, /gap: 0/u);
  assert.match(fields, /\[data-example-field-group\] > \[data-part\] \{\s*grid-row: 1/u);
});

test('Shiki highlights each documented language without changing source text or inventing colors', async () => {
  const palette = await read('src/styles/tokens.css');
  const samples = [
    ['ts', '// comment\r\nconst message: string = "<script>alert(1)</script>";\r\n\r\nconsole.log(message);'],
    ['vue', '<script setup lang="ts">\nconst count = 1;\n</script>\n<template><button :disabled="false">{{ count }}</button></template>\n<style>.demo { color: red; }</style>'],
    ['css', ':root { --demo: #123456; }\n/* comment */\n.demo { color: var(--demo); }'],
    ['bash', '# install\npnpm add @sectile/vue\necho "$HOME"'],
    ['ts', ''], ['vue', '\n'], ['ts', 'const 한글 = "한글";\r\n'],
  ];
  for (const example of examples) {
    for (const section of example.code) samples.push([section.language, (await read(`src/examples/${section.path.slice(2)}`)).trim()]);
  }
  for (const [language, source] of samples) {
    const tokens = await highlightCode(source, language);
    assert.equal(tokens.map(token => token.content).join(''), source, language);
    if (source.trim()) assert.ok(tokens.some(token => token.color && token.color !== 'var(--docs-code-text)'), `${language} has syntax coloring`);
    for (const token of tokens) {
      if (!token.color) continue;
      const match = /^var\((--docs-code-[\w-]+)\)$/u.exec(token.color);
      assert.ok(match, token.color);
      assert.ok(palette.includes(`${match[1]}:`), `${token.color} resolves to the documentation palette`);
    }
  }
});

test('source geometry determines initial disclosure at line and character boundaries', () => {
  const eighteen = Array.from({ length: 18 }, () => 'const value = 1;').join('\n');
  assert.deepEqual(codePresentation(eighteen), { lineCount: 18, initiallyOpen: true });
  assert.deepEqual(codePresentation(`${eighteen}\nconst last = 1;`), { lineCount: 19, initiallyOpen: false });
  assert.deepEqual(codePresentation(eighteen.replaceAll('\n', '\r\n')), codePresentation(eighteen));
  assert.equal(codePresentation('x'.repeat(100)).initiallyOpen, true);
  assert.equal(codePresentation('x'.repeat(101)).initiallyOpen, false);
  assert.equal(codePresentation('한'.repeat(100)).initiallyOpen, true);
  assert.equal(codePresentation('😀'.repeat(100)).initiallyOpen, true);
  assert.deepEqual(codePresentation('  \n  '), { lineCount: 0, initiallyOpen: true });
  assert.deepEqual(codePresentation('first\n\nlast\n'), { lineCount: 3, initiallyOpen: true });
  assert.equal(codePresentation(`first${'\n'.repeat(18)}last`).initiallyOpen, false);
});

test('CodeBlock keeps SSR safe, uses automatic disclosure, highlights on demand, copies full source and disposes pending work', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  });
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let mounted;
  try {
    const { default: CodeBlock } = await server.ssrLoadModule('/src/components/CodeBlock.vue');
    const unsafe = '<script>alert("unsafe")</script>';
    const html = await renderToString(createSSRApp({ render: () => h(CodeBlock, { source: unsafe, language: 'vue' }) }));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('tabindex="0"'));
    const short = 'const short = 1;';
    const long = Array.from({ length: 19 }, (_, index) => `const value${index} = ${index};`).join('\n');
    const mixed = await renderToString(createSSRApp({ render: () => h('div', [
      h(CodeBlock, { source: short, language: 'ts', label: 'Template' }),
      h(CodeBlock, { source: long, language: 'ts', label: 'Data' }),
    ]) }));
    const disclosures = [...mixed.matchAll(/<div\b([^>]*class="[^"]*\bdocs-code-disclosure\b[^"]*"[^>]*)>/gu)];
    assert.equal(disclosures.length, 2);
    assert.match(disclosures[0][1], /data-state="open"/u);
    assert.match(disclosures[1][1], /data-state="closed"/u);
    assert.ok(mixed.includes('Hide code · 1 line'));
    assert.ok(mixed.includes('Show code · 19 lines'));

    // Compile the same SFC for the client renderer. Vite's SSR module includes
    // SSR-only setup instrumentation and cannot stand in for client mounting.
    const clientModules = new Map();
    async function clientModule(file) {
      if (clientModules.has(file)) return clientModules.get(file);
      const { descriptor } = parse(await read(`src/components/${file}`));
      const compiled = compileScript(descriptor, { id: `docs-${file}-test`, inlineTemplate: true });
      const { code } = await transformWithEsbuild(compiled.content, `${file}.ts`, { loader: 'ts' });
      let clientCode = code.replaceAll('from "vue"', `from ${JSON.stringify(import.meta.resolve('vue'))}`)
      .replaceAll("'../code-highlighting.js'", JSON.stringify(new URL('../src/code-highlighting.ts', import.meta.url).href))
      .replaceAll('"../code-highlighting.js"', JSON.stringify(new URL('../src/code-highlighting.ts', import.meta.url).href))
      .replaceAll("'../code-disclosure.js'", JSON.stringify(new URL('../src/code-disclosure.ts', import.meta.url).href))
      .replaceAll('"../code-disclosure.js"', JSON.stringify(new URL('../src/code-disclosure.ts', import.meta.url).href))
      .replaceAll("'../page-outline.js'", JSON.stringify(new URL('../src/page-outline.ts', import.meta.url).href))
      .replaceAll('"../page-outline.js"', JSON.stringify(new URL('../src/page-outline.ts', import.meta.url).href));
      for (const [, quote, dependency] of clientCode.matchAll(/from (["'])(\.\/[^"']+\.vue)\1/gu)) {
        clientCode = clientCode.replaceAll(`${quote}${dependency}${quote}`, JSON.stringify(await clientModule(dependency.slice(2))));
      }
      for (const [, quote, dependency] of clientCode.matchAll(/from (["'])(@sectile\/vue\/[^"']+)\1/gu)) {
        clientCode = clientCode.replaceAll(`${quote}${dependency}${quote}`, JSON.stringify(import.meta.resolve(dependency)));
      }
      const url = `data:text/javascript;base64,${Buffer.from(clientCode).toString('base64')}`;
      clientModules.set(file, url);
      return url;
    }
    const { default: ClientCodeBlock } = await import(await clientModule('CodeBlock.vue'));

    // A non-DOM Vue host exercises the component, not native browser behavior.
    const node = (type, text = '') => ({ type, text, children: [], props: {}, parent: null });
    let mutations = 0;
    const host = createRenderer({
      createElement: type => node(type), createText: text => node('#text', text), createComment: text => node('#comment', text),
      insert(child, parent, anchor) {
        mutations++;
        if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
        const index = anchor ? parent.children.indexOf(anchor) : -1;
        parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
        child.parent = parent;
      },
      remove(child) { mutations++; child.parent?.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
      setText(child, text) { mutations++; child.text = text; },
      setElementText(child, text) { mutations++; child.text = text; child.children = []; },
      parentNode: child => child.parent,
      nextSibling: child => child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null,
      patchProp(child, key, previous, value) { mutations++; child.props[key] = value; },
    });
    const root = node('root');
    const find = (parent, type) => parent.type === type ? parent : parent.children.map(child => find(child, type)).find(Boolean);
    const findWhere = (parent, predicate) => predicate(parent) ? parent : parent.children.map(child => findWhere(child, predicate)).find(Boolean);
    const copyButton = () => findWhere(root, node => String(node.props.class ?? '').split(/\s/u).includes('docs-copy-button'));
    const disclosure = () => findWhere(root, node => String(node.props.class ?? '').split(/\s/u).includes('docs-code-disclosure'));
    const disclosureTrigger = () => findWhere(root, node => node.type === 'button' && node.props['aria-expanded'] !== undefined);
    const text = parent => (parent.type === '#comment' ? '' : parent.text) + parent.children.map(text).join('');
    const waitFor = async predicate => {
      const deadline = Date.now() + 10_000;
      while (!predicate()) {
        assert.ok(Date.now() < deadline, 'component update completed');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };
    const props = shallowRef({ source: '  const value = "original";\n', language: 'ts', active: false });
    const identity = shallowRef(0);
    mounted = host.createApp({ render: () => h(ClientCodeBlock, { ...props.value, key: identity.value }) });
    mounted.mount(root);
    await nextTick();
    assert.equal(text(find(root, 'code')), props.value.source.trim());
    assert.equal(find(find(root, 'code'), 'span'), undefined);
    props.value = { ...props.value, active: true };
    await waitFor(() => find(find(root, 'code'), 'span'));
    assert.equal(text(find(root, 'code')), props.value.source.trim());
    assert.ok(find(find(root, 'code'), 'span').props.style.color.startsWith('var(--docs-code-'));
    props.value = { source: unsafe, language: 'vue', active: true };
    await nextTick();
    props.value = { source: '  .new { color: red; }  ', language: 'css', active: true };
    await waitFor(() => find(root, 'pre').props['data-language'] === 'css' && find(find(root, 'code'), 'span'));
    assert.equal(text(find(root, 'code')), props.value.source.trim());
    let copied;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { async writeText(value) { copied = value; } } } });
    let copyPropagationStopped = false;
    const copyEvent = { stopPropagation() { copyPropagationStopped = true; } };
    await copyButton().props.onClick(copyEvent);
    await nextTick();
    assert.equal(copied, '.new { color: red; }');
    assert.equal(copyPropagationStopped, true, 'copy is independent of the disclosure action');
    assert.equal(text(copyButton()), 'Copied');
    assert.equal(find(root, 'p'), undefined, 'successful copy feedback stays in the button');
    navigator.clipboard.writeText = async () => { throw new Error('Permission denied'); };
    await copyButton().props.onClick(copyEvent);
    await nextTick();
    assert.ok(text(root).includes('Copy unavailable. Select the code to copy it.'));
    assert.equal(text(copyButton()), 'Copy failed');

    props.value = { source: long, language: 'ts' };
    identity.value++;
    await nextTick();
    assert.equal(disclosure().props['data-state'], 'closed', 'client agrees with SSR for long source');
    assert.equal(find(find(root, 'code'), 'span'), undefined, 'closed source remains plain');
    navigator.clipboard.writeText = async value => { copied = value; };
    await copyButton().props.onClick(copyEvent);
    assert.equal(copied, long, 'header copy includes all collapsed lines');
    disclosureTrigger().props.onClick({ defaultPrevented: false });
    await waitFor(() => find(find(root, 'code'), 'span'));
    assert.equal(disclosure().props['data-state'], 'open');
    assert.equal(text(find(root, 'code')), long);
    disclosureTrigger().props.onClick({ defaultPrevented: false });
    await nextTick();
    props.value = { ...props.value, source: short };
    await nextTick();
    assert.equal(disclosure().props['data-state'], 'closed', 'reader choice persists through source updates');
    assert.equal(find(find(root, 'code'), 'span'), undefined);
    identity.value++;
    await nextTick();
    assert.equal(disclosure().props['data-state'], 'open', 'new source identity receives its automatic initial state');
    await waitFor(() => find(find(root, 'code'), 'span'));
    assert.equal(text(find(root, 'code')), short);
    props.value = { source: 'const late = 1;', language: 'ts', active: true };
    await nextTick();
    mounted.unmount();
    mounted = undefined;
    const afterUnmount = mutations;
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(mutations, afterUnmount, 'pending highlight does not render after unmount');

    const { default: ClientCopyButton } = await import(await clientModule('CopyButton.vue'));
    const copySource = shallowRef('original');
    const outcomes = [];
    mounted = host.createApp({ render: () => h(ClientCopyButton, {
      source: copySource.value, onCopied: () => outcomes.push('copied'), onError: error => outcomes.push(error),
    }) });
    mounted.mount(root);
    assert.equal(text(copyButton()), 'Copy code', 'copy defaults need no caller-authored feedback');
    navigator.clipboard.writeText = async value => { copied = value; };
    await copyButton().props.onClick(copyEvent);
    await nextTick();
    assert.equal(copied, 'original');
    assert.equal(text(copyButton()), 'Copied');
    copySource.value = 'updated';
    await nextTick();
    assert.equal(text(copyButton()), 'Copy code', 'new source resets the default feedback');
    let resolveCopy;
    navigator.clipboard.writeText = () => new Promise(resolve => { resolveCopy = resolve; });
    const pendingCopy = copyButton().props.onClick(copyEvent);
    copySource.value = 'replacement';
    await nextTick();
    resolveCopy();
    await pendingCopy;
    await nextTick();
    assert.equal(text(copyButton()), 'Copy code', 'stale success cannot label a new source as copied');
    assert.deepEqual(outcomes, ['copied']);
    const pendingUnmountCopy = copyButton().props.onClick(copyEvent);
    mounted.unmount();
    mounted = undefined;
    const copyUnmountMutations = mutations;
    resolveCopy();
    await pendingUnmountCopy;
    await nextTick();
    assert.equal(mutations, copyUnmountMutations);
    assert.deepEqual(outcomes, ['copied'], 'unmounted copy emits no completion');

    const { default: ClientDisclosure } = await import(await clientModule('DocsDisclosure.vue'));
    mounted = host.createApp({ render: () => h(ClientDisclosure, {}, {
      label: () => 'Disclosure witness', default: () => h('p', 'Retained content'),
    }) });
    mounted.mount(root);
    assert.equal(disclosureTrigger().props['aria-expanded'], 'false');
    const targetID = disclosureTrigger().props['aria-controls'];
    assert.ok(findWhere(root, node => node.props.id === targetID));
    disclosureTrigger().props.onClick({ defaultPrevented: false });
    await nextTick();
    assert.equal(disclosureTrigger().props['aria-expanded'], 'true', 'uncontrolled disclosure delegates changes to Sectile');
    assert.equal(findWhere(root, node => node.props.id === targetID).props['aria-hidden'] ?? undefined, undefined);
    disclosureTrigger().props.onClick({ defaultPrevented: false });
    await nextTick();
    assert.equal(disclosureTrigger().props['aria-expanded'], 'false');
    assert.equal(findWhere(root, node => node.props.id === targetID).props['aria-hidden'], 'true');
    mounted.unmount();
    const { default: ClientOutline } = await import(await clientModule('DocsTableOfContents.vue'));
    const content = shallowRef(null);
    const outlineListeners = new Map();
    let outlineFrame;
    const outlineView = { scrollY: 0, innerHeight: 800, getComputedStyle: () => ({ getPropertyValue: () => '56px' }), addEventListener: (name, handler) => outlineListeners.set(name, handler), removeEventListener: name => outlineListeners.delete(name), requestAnimationFrame: callback => { outlineFrame = callback; return 1; }, cancelAnimationFrame: () => { outlineFrame = undefined; } };
    const outlineHeadings = [100, 350, 700].map((top, index) => ({ id: index ? `public-child-${index}` : 'public-section', tagName: index ? 'H3' : 'H2', textContent: `Public section ${index}`, closest: () => null, getBoundingClientRect: () => ({ top: top - outlineView.scrollY }) }));
    mounted = host.createApp({ render: () => h(ClientOutline, { content: content.value }) });
    mounted.mount(root);
    assert.equal(find(root, 'nav'), undefined);
    content.value = { getBoundingClientRect: () => ({ bottom: 1100 - outlineView.scrollY }), querySelectorAll: () => outlineHeadings, ownerDocument: { defaultView: outlineView, getElementById: id => outlineHeadings.find(heading => heading.id === id) } };
    await nextTick();
    assert.equal(find(root, 'nav').props['aria-label'], 'On this page');
    assert.equal(find(root, 'a').props.href, '#public-section');
    assert.equal(find(root, 'a').props['aria-current'], 'location');
    assert.equal(find(root, 'a').props['data-visible'], true);
    const outlineLinks = () => find(root, 'ul').children.flatMap(child => child.type === 'li' ? [find(child, 'a')] : []);
    assert.equal(outlineLinks().filter(link => link.props['data-visible']).length, 3, 'all intersecting sections are highlighted together');
    assert.equal(outlineLinks().filter(link => link.props['aria-current']).length, 1, 'accessible location stays singular');
    outlineView.scrollY = 400;
    outlineListeners.get('scroll')();
    outlineFrame();
    await nextTick();
    assert.deepEqual(outlineLinks().map(link => Boolean(link.props['data-visible'])), [false, true, true]);
    assert.equal(outlineLinks()[1].props['aria-current'], 'location');
    assert.equal(outlineListeners.size, 2);
    content.value = null;
    await nextTick();
    assert.equal(find(root, 'nav'), undefined);
    assert.equal(outlineListeners.size, 0, 'component replacement disposes the previous page connection');
  } finally {
    mounted?.unmount();
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    await server.close();
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

test('accessibility reference covers every documented Vue component and each domain family', () => {
  assert.deepEqual(Object.keys(componentAccessibility).sort(), components.map(component => component.subject).sort());
  const entries = [...Object.values(componentAccessibility), ...Object.values(domainAccessibility).flat()];
  for (const entry of entries) {
    assert.ok(entry.semantics.length > 0);
    assert.ok(entry.focus.trim());
    assert.ok(entry.authoring.length > 0);
    assert.equal(new Set(entry.keyboard.map(([keys]) => keys)).size, entry.keyboard.length, 'key rows are unambiguous');
    for (const [keys, action] of entry.keyboard) { assert.ok(keys.trim()); assert.ok(action.trim()); }
  }
  assert.deepEqual(Object.keys(domainAccessibility).sort(), areas.filter(area => area.id !== 'components').map(area => area.id).sort());
  for (const entries of Object.values(domainAccessibility)) assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  assert.ok(routes.some(route => route.path === '/vue/guides/accessibility' && route.host === 'vue'));
});

test('example sources stay inside their host and presentation belongs to documentation owners', async () => {
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
      assert.doesNotMatch(source, /<style\b|\.css['"]|style\s*=/u);
      const { descriptor } = parse(source);
      if (section.language === 'vue') assert.equal(descriptor.styles.length, 0);
    }
  }
});

test('vue checkbox preview keeps a persistent visual box around the conditional indicator', async () => {
  const preview = await read('src/examples/vue/components/checkbox/controlled-state/Preview.vue');
  const shell = await read('src/styles/preview.css');
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

test('preview is primary and example files use independent automatic code blocks', async () => {
  const app = await read('src/components/ExamplePage.vue');
  const previewIndex = app.indexOf('<DocsPreview');
  const codeIndex = app.indexOf('class="docs-code-stack"');

  assert.ok(previewIndex >= 0 && codeIndex > previewIndex);
  assert.match(app, /<CodeBlock[^>]*section\.path[^>]*\/>/u);
});

test('preview fixtures own explicit canvas roles and retain example transitions outside feature source', async () => {
  const preview = await read('src/components/DocsPreview.vue');
  const styles = await read('src/styles/preview.css');
  const data = await read('src/styles/example-data.css');
  const presence = await read('src/styles/example-presence.css');
  const tokens = await read('src/styles/tokens.css');
  assert.match(preview, /grid-template-columns:\s*minmax\(0, 1fr\)/u);
  assert.match(preview, /width:\s*100%;\s*min-width:\s*0;\s*max-width:\s*var\(--docs-preview-width\)/u);
  for (const fixture of ['control', 'surface', 'form']) {
    assert.match(tokens, new RegExp(`--docs-preview-${fixture}-width:`, 'u'));
  }
  assert.match(styles, /@import ['"]\.\/example-data\.css['"]/u);
  assert.match(styles, /@import ['"]\.\/example-presence\.css['"]/u);
  assert.match(data, /\[data-part="disclosure"\]\[data-state="open"\]/u);
  assert.match(data, /\[data-part="sort-trigger"\]/u);
  for (const recipe of ['presence-demo__panel', 'transition-dialog-demo__content', 'crossfade-demo__slide']) {
    assert.ok(presence.includes(recipe), recipe);
  }
  assert.match(presence, /prefers-reduced-motion:\s*reduce/u);
});

test('Vue readers have a complete introduction and representative component destinations', () => {
  assert.deepEqual(routes.filter(route => route.kind === 'guide').map(route => route.guide), ['getting-started', 'styling', 'state', 'accessibility']);
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
  // Keep document absent: a title-only fake incorrectly selects browser-only
  // component setup paths during server rendering.
  delete globalThis.document;
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.vue');
    const { currentPath } = await server.ssrLoadModule('/src/router.ts');
    const { HostProvider } = await server.ssrLoadModule('@sectile/vue/host-provider');
    const { PopoverPortal } = await server.ssrLoadModule('@sectile/vue/popover');
    for (const override of [undefined, '#override-destination']) {
      const context = {};
      await renderToString(createSSRApp({ render: () => h(HostProvider, { portalTarget: '#application-destination' }, () => h(PopoverPortal, override === undefined ? {} : { to: override }, () => h('p', 'Portal destination witness'))) }), context);
      assert.match(context.teleports[override ?? '#application-destination'], /Portal destination witness/u);
    }
    const { validateEmailAvailability } = await server.ssrLoadModule('/src/examples/vue/form/async-availability/example.ts');
    const asyncContext = signal => ({ trigger: 'input', intent: 'interaction', changedFieldId: 'email', signal });
    const canceled = new AbortController();
    const pending = validateEmailAvailability({ email: 'reserved@example.com' }, asyncContext(canceled.signal));
    assert.equal(getEventListeners(canceled.signal, 'abort').length, 1);
    const rejection = assert.rejects(pending, { name: 'AbortError' });
    canceled.abort();
    await rejection;
    assert.equal(getEventListeners(canceled.signal, 'abort').length, 0);
    await assert.rejects(validateEmailAvailability({ email: 'user@example.com' }, asyncContext(canceled.signal)), { name: 'AbortError' });
    await Promise.all(['reserved@example.com', 'user@example.com'].map(async email => {
      const completed = new AbortController();
      const result = await validateEmailAvailability({ email }, asyncContext(completed.signal));
      assert.equal(result.issues.length, email.startsWith('reserved') ? 1 : 0);
      assert.equal(getEventListeners(completed.signal, 'abort').length, 0);
    }));
    const { useChart } = await server.ssrLoadModule('@sectile/vue/chart');
    const history = useChart({
      definition: {
        coordinate: { kind: 'cartesian', axes: [
          { id: 'day', orientation: 'x', scale: 'linear', field: 'day', domain: { kind: 'numeric', minimum: 1, maximum: 10 } },
          { id: 'count', orientation: 'y', scale: 'linear', field: 'count', domain: { kind: 'numeric', minimum: 0, maximum: 30 } },
        ] },
        layers: [{ id: 'deliveries', kind: 'line', data: [{ id: 'first', day: 1, count: 12 }, { id: 'last', day: 10, count: 20 }], xAxis: 'day', yAxis: 'count' }],
      },
      viewCapabilities: [{ axisID: 'day', initial: { kind: 'continuous', minimum: 1, maximum: 5 }, minimumSpan: 1 }],
    });
    try {
      const visible = () => history.snapshot.value.state.view.axes[0].visible;
      assert.deepEqual(visible(), { kind: 'continuous', minimum: 1, maximum: 5 });
      assert.equal(history.dispatch({ type: 'pan-axis-view', axisID: 'day', fraction: 0.5, phase: 'settled' }).ok, true);
      assert.deepEqual(visible(), { kind: 'continuous', minimum: 3, maximum: 7 });
      assert.equal(history.dispatch({ type: 'zoom-axis-view', axisID: 'day', factor: 100, anchor: 0.5, phase: 'settled' }).ok, true);
      assert.ok(visible().maximum - visible().minimum >= 1);
      assert.equal(history.dispatch({ type: 'pan-axis-view', axisID: 'day', fraction: 100, phase: 'settled' }).ok, true);
      assert.ok(visible().maximum <= 10);
      assert.equal(history.dispatch({ type: 'reset-axis-view', axisID: 'day', to: 'initial', phase: 'settled' }).ok, true);
      assert.deepEqual(visible(), { kind: 'continuous', minimum: 1, maximum: 5 });
    } finally { history.dispose(); }
    for (const [kind, batchType] of [['line', 'polyline'], ['scatter', 'point'], ['bar', 'rectangle'], ['heatmap', 'cell'], ['pie', 'arc'], ['donut', 'arc']]) {
      const radial = kind === 'pie' || kind === 'donut';
      const data = [{ id: 'mon', day: 1, count: 12 }, { id: 'tue', day: 2, count: 18 }];
      const definition = shallowRef({
        coordinate: radial ? { kind: 'radial' } : { kind: 'cartesian', axes: [
          kind === 'bar' || kind === 'heatmap'
            ? { id: 'day', orientation: 'x', scale: 'categorical', field: 'day', domain: { kind: 'categorical', values: [1, 2] } }
            : { id: 'day', orientation: 'x', scale: 'linear', field: 'day', domain: { kind: 'numeric', minimum: 0.5, maximum: 5.5 } },
          kind === 'heatmap'
            ? { id: 'count', orientation: 'y', scale: 'categorical', getValue: () => 'Week', domain: { kind: 'categorical', values: ['Week'] } }
            : { id: 'count', orientation: 'y', scale: 'linear', field: 'count', domain: { kind: 'numeric', minimum: 0, maximum: 30 } },
        ] },
        layers: [{ id: 'deliveries', kind, data, ...(radial ? { valueField: 'count', ...(kind === 'donut' ? { innerRadius: 0.6 } : {}) } : { xAxis: 'day', yAxis: 'count', ...(kind === 'heatmap' ? { valueField: 'count' } : {}) }) }],
      });
      const chart = useChart({ definition });
      try {
        const projected = chart.controller.project({ viewport: { width: 360, height: 220 }, insets: { top: 16, right: 16, bottom: 16, left: 16 } });
        assert.equal(projected.ok, true);
        assert.equal(projected.value.batches[0].type, batchType);
        const batch = projected.value.batches[0];
        assert.equal(batch.identityIndices.length, 2);
        const readGeometry = (value) => Array.from(value.type === 'rectangle' ? value.rectangles : value.type === 'cell' ? value.cells : value.type === 'arc' ? value.arcs : value.positions);
        const originalGeometry = readGeometry(batch);
        assert.ok(originalGeometry.every(Number.isFinite));
        if (batch.type === 'polyline') assert.deepEqual(Array.from(batch.offsets), [0, 2]);
        definition.value = { ...definition.value, layers: [{ ...definition.value.layers[0], data: data.map(row => row.id === 'mon' ? { ...row, count: 26 } : row) }] };
        await nextTick();
        const updated = chart.controller.project({ viewport: { width: 360, height: 220 }, insets: { top: 16, right: 16, bottom: 16, left: 16 } });
        assert.equal(updated.ok, true);
        assert.notDeepEqual(readGeometry(updated.value.batches[0]), originalGeometry, `${kind} responds to a new definition`);
      } finally { chart.dispose(); }
    }
    const { validateNotificationEmail, submitNotificationEmail } = await server.ssrLoadModule('/src/examples/vue/form/validation-and-server-issues/example.ts');
    const validationContext = { trigger: 'submit', intent: 'submission', changedFieldId: null, signal: new AbortController().signal };
    assert.deepEqual(await validateNotificationEmail({ email: 'USER@example.com', confirmation: 'user@example.com' }, validationContext), { issues: [] });
    const mismatch = await validateNotificationEmail({ email: 'first@example.com', confirmation: 'second@example.com' }, validationContext);
    assert.equal(mismatch.issues[0].path, 'confirmation');
    assert.deepEqual(mismatch.issues[0].relatedPaths, ['email']);
    const abortedValidation = new AbortController();
    abortedValidation.abort();
    assert.throws(() => validateNotificationEmail({}, { ...validationContext, signal: abortedValidation.signal }), { name: 'AbortError' });
    for (const [email, accepted] of [['blocked@example.com', false], ['user@example.com', true]]) {
      let prevented = false;
      const formData = new FormData();
      formData.set('email', email);
      const result = await submitNotificationEmail({ formData, preventDefault: () => { prevented = true; } });
      assert.equal(result.ok, accepted);
      assert.equal(prevented, true);
      if (!accepted) assert.equal(result.issues[0].path, 'email');
    }
    const { resolveMembers, createMemberSource, createMemberInitialView } = await server.ssrLoadModule('/src/examples/vue/tabular/local-source/example.ts');
    const { createTabularQuery } = await server.ssrLoadModule('@sectile/tabular/query');
    const { useDataGrid } = await server.ssrLoadModule('@sectile/vue/data-grid');
    const { useDataTreeGrid } = await server.ssrLoadModule('@sectile/vue/data-tree-grid');
    const { createRecoverableMemberSource } = await server.ssrLoadModule('/src/examples/vue/tabular/page-and-retry/example.ts');
    const recoverable = createRecoverableMemberSource();
    const pagedAccess = { kind: 'page', page: 1, itemsPerPage: 2, visibleRowCount: null, pagination: null };
    // A non-DOM Vue host exercises the composable's real mounted source
    // lifecycle, not the grid's native browser rendering or input behavior.
    const host = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp() {} });
    let paged;
    const mounted = host.createApp(defineComponent({ setup() {
      paged = useDataGrid({ source: recoverable.source, defaultAccessState: pagedAccess, initialView: createMemberInitialView(recoverable.source, undefined, pagedAccess) });
      return () => null;
    } }));
    mounted.mount({});
    const settleSource = () => new Promise(resolve => setImmediate(resolve));
    try {
      assert.deepEqual(paged.getProjection().rows.map(row => row.rowID), ['ada', 'grace']);
      paged.reload();
      await settleSource();
      assert.equal(paged.status.value, 'success');
      const moved = paged.dispatch({ type: 'set-access', accessState: { ...paged.snapshot.value.tabular.state.accessState, page: 2, pagination: { page: 2, itemsPerPage: 2 } } });
      assert.equal(moved.ok, true, JSON.stringify(moved));
      await settleSource();
      assert.equal(paged.status.value, 'success');
      assert.deepEqual(paged.getProjection().rows.map(row => row.rowID), ['linus']);
      recoverable.failNextRequest();
      paged.reload();
      await settleSource();
      assert.equal(paged.status.value, 'error');
      assert.match(paged.error.value.message, /simulated member request failed/u);
      assert.deepEqual(paged.getProjection().rows.map(row => row.rowID), ['linus']);
      paged.reload();
      await settleSource();
      assert.equal(paged.status.value, 'success');
      assert.equal(paged.error.value, null);
      assert.deepEqual(paged.getProjection().rows.map(row => row.rowID), ['linus']);
    } finally { mounted.unmount(); }
    for (const grouped of [false, true]) {
      const source = createMemberSource();
      const profile = grouped
        ? useDataTreeGrid({ source, initialView: createMemberInitialView(source) })
        : useDataGrid({ source, initialView: createMemberInitialView(source) });
      const acceptPending = async () => {
        const request = profile.requestState.value.pendingRequest;
        assert.ok(request);
        const response = await source(request, { signal: new AbortController().signal });
        const accepted = profile.synchronizeView(response);
        assert.equal(accepted.ok, true, JSON.stringify(accepted));
        return response;
      };
      try {
        assert.equal(profile.requestView().ok, true);
        let initial = await acceptPending();
        const columns = profile.getProjection().columns;
        assert.deepEqual([...columns.start, ...columns.center, ...columns.end], ['name', 'role']);
        if (grouped) {
          assert.equal(profile.dispatch({ type: 'set-query', query: createTabularQuery({ groups: [{ id: 'member-role', columnID: 'role', policy: 'role' }] }) }).ok, true);
          initial = await acceptPending();
          assert.equal(initial.rows.length, 2);
          assert.ok(initial.rows.every(row => row.kind === 'group'));
          assert.equal(profile.dispatch({ type: 'set-row-expanded', rowID: initial.rows[0].id, open: true }).ok, true);
          const expanded = await acceptPending();
          assert.ok(expanded.rows.some(row => row.kind === 'leaf'));
          assert.equal(expanded.matchingLeafCount.value, 3);
        } else {
          assert.deepEqual(initial.rows.map(row => row.id), ['ada', 'grace', 'linus']);
          const query = createTabularQuery({ sort: [{ id: 'member-name', columnID: 'name', direction: 'descending', comparator: 'text' }] });
          const sorted = profile.dispatch({ type: 'set-query', query });
          assert.equal(sorted.ok, true, JSON.stringify(sorted));
          assert.deepEqual((await acceptPending()).rows.map(row => row.id), ['linus', 'grace', 'ada']);
          assert.equal(profile.dispatch({ type: 'set-query', query: createTabularQuery({ filters: [{ id: 'member-search', scope: 'global', predicate: 'contains', value: 'designer' }] }) }).ok, true);
          assert.deepEqual((await acceptPending()).rows.map(row => row.id), ['grace']);
        }
      } finally {
        profile.dispose();
      }
    }
    const { useDataTable } = await server.ssrLoadModule('@sectile/vue/data-table');
    const table = useDataTable({ source: resolveMembers });
    try {
      const request = table.requestState.value.pendingRequest;
      assert.ok(request, 'table supplies its public source request');
      const response = await resolveMembers(request, { signal: new AbortController().signal });
      const accepted = table.synchronizeView(response);
      assert.equal(accepted.ok, true, 'the actual example resolver produces an accepted view');
      assert.deepEqual(table.getProjection().rows.map((row) => row.id), ['ada', 'grace', 'linus']);
      const aborted = new AbortController();
      aborted.abort();
      assert.throws(() => resolveMembers(request, { signal: aborted.signal }), { name: 'AbortError' });
    } finally {
      table.dispose();
    }
    const paths = new Set(routes.map((route) => route.path));
    const renderedIDs = new Map();
    const crossPageAnchors = [];
    for (const route of routes) {
      currentPath.value = route.path;
      const html = await renderToString(createSSRApp(App));
      assert.match(html, /<h1(?:\s[^>]*)?>[^<]/u, route.path);
      assert.ok(!html.includes('Page not found'), route.path);
      const pageIDs = new Set([...html.matchAll(/\sid="([^"]+)"/gu)].map(([, id]) => id));
      renderedIDs.set(route.path, pageIDs);
      for (const [, target] of html.matchAll(/href="#([^"]+)"/gu)) {
        assert.ok(pageIDs.has(target), `${route.path}: unresolved section ${target}`);
      }
      for (const [, href] of html.matchAll(/href="([^"]+)"/gu)) {
        if (href.startsWith('#')) continue;
        if (href.startsWith('https://')) { assert.doesNotThrow(() => new URL(href)); continue; }
        assert.ok(href.startsWith('/sectile/'), `${route.path}: ${href}`);
        const [pathname, fragment] = href.split('#');
        const path = pathname.slice('/sectile'.length).replace(/\/$/u, '') || '/';
        assert.ok(paths.has(path), `${route.path}: unresolved link ${href}`);
        if (fragment) crossPageAnchors.push([route.path, path, fragment]);
      }
      if (route.kind === 'component') {
        const component = components.find(component => component.subject === route.subject);
        const reference = componentAccessibility[route.subject];
        assert.ok(pageIDs.has(`accessibility-${component.slug}`), route.path);
        assert.ok(html.includes('Focus behavior') && html.includes('Application responsibilities'), route.path);
        for (const [keys, action] of reference.keyboard) {
          const renderedKeys = [...html.matchAll(/<kbd\b[^>]*>([\s\S]*?)<\/kbd>/gu)].map(([, content]) => content.replace(/<!--[\s\S]*?-->/gu, ''));
          assert.ok(renderedKeys.includes(keys), `${route.path}: ${keys}`);
          const escapedAction = action.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
          assert.ok(html.includes(escapedAction), `${route.path}: ${action}`);
        }
        if (!reference.keyboard.length) assert.ok(html.includes('no custom keyboard commands'), route.path);
      }
      if (route.kind === 'area' && route.host === 'vue' && route.area !== 'components') {
        assert.ok(pageIDs.has('accessibility'));
        for (const entry of domainAccessibility[route.area]) assert.ok(pageIDs.has(`accessibility-${entry.id}`), entry.title);
      }
      if (route.guide === 'accessibility') {
        for (const id of ['names', 'keyboard', 'feedback', 'motion', 'composition', 'testing', 'component-index']) assert.ok(pageIDs.has(id), id);
        assert.ok(html.includes('accessibility certification'));
      }
      if (route.kind === 'example') {
        assert.match(html, /class="docs-preview/u);
        assert.match(html, /class="[^"]*\bdocs-code-disclosure\b/u);
        const preview = html.slice(html.indexOf('class="docs-preview'), html.indexOf('class="docs-code-stack"'));
        const initialStates = {
          'vue-tabular-sortable-data-grid': [/Sortable project members/u, /Search members/u, /evaluates the query/u],
          'vue-tabular-page-and-retry': [/Page 1 of 2/u, /Paged project members/u, /Simulate failed reload/u, /last accepted rows/u],
          'vue-components-host-provider-local-portal': [/Open local details/u, /Application portal destination/u, /Open: false/u, /Floating positioning is disabled/u],
          'vue-tabular-grouped-data-tree-grid': [/Project members grouped by role/u, /Expansion requests a new source view/u],
          'vue-form-validation-and-server-issues': [/No accepted submission yet/u, /Confirm email/u, /does not contact a server/u],
          'vue-components-primitive-element-adoption': [/Activations: 0/u, /data-example-adopted-button/u],
          'vue-components-host-provider-rtl-tabs': [/Direction: rtl/u, /dir="rtl"/u, /Switch to LTR/u],
          'vue-components-cascade-list-visible-columns': [/Delivery city: Seoul/u, /Country/u, /Busan/u],
          'vue-components-cascade-select-hierarchical-choice': [/Delivery city: Seoul/u, /Korea \/ Seoul/u],
          'vue-components-color-picker-native-and-text': [/Committed color: #4659d4/u, /native-input/u],
          'vue-components-reorder-delivery-sequence': [/Order: Reception → Warehouse → Office/u, /Alt\+ArrowUp/u],
          'vue-components-tree-grid-editable-parcels': [/Selected cell: Parcel A/u, /data-example-column-headings/u, /aria-label="Parcel: Parcel A"/u, /data-example-disclosure-icon/u, /data-expanded/u],
          'vue-temporal-date-popover': [/Selected: 2026-10-03/u, /Choose date/u],
          'vue-temporal-date-range-popover': [/Selected: 2026-10-03 → 2026-10-08/u, /Range start/u, /Range end/u],
          'vue-temporal-inline-range-calendar': [/Selected: 2026-10-03 → 2026-10-08/u, /data-in-range/u],
          'vue-temporal-month-selection': [/Selected: 2026-10-01/u, />Oct<\/button>/u],
          'vue-temporal-month-range-selection': [/Selected: 2026-10-01 → 2026-12-01/u, />Dec<\/button>/u],
          'vue-temporal-year-selection': [/Selected: 2026-01-01/u, /year page/u],
          'vue-temporal-year-range-selection': [/Selected: 2026-01-01 → 2028-01-01/u, /Choose years/u],
          'vue-temporal-date-time-selection': [/Selected: 2026-10-03T09:00/u, /without a time zone/u],
          'vue-temporal-date-time-range-selection': [/Selected: 2026-10-03T09:00.*2026-10-08T17:00/u, /Range end/u],
          'vue-components-meter-group-storage-budget': [/60 \/ 100/u, /40 units remaining/u, /Documents/u, /Media/u],
          'vue-components-quantity-field-unit-conversion': [/Canonical value: 1\.5 metre/u, /Display unit/u, /data-example-field-group/u],
          'vue-components-window-splitter-bounded-panes': [/First pane: 50%/u, /Resize delivery panels/u],
          'vue-virtual-measured-list': [/Delivery 1/u, /Mounted content establishes/u],
          'vue-virtual-responsive-grid': [/Parcel 1/u, /64px tall/u],
          'vue-virtual-masonry-notes': [/Delivery 1/u, /120px estimate/u],
          'vue-virtual-spatial-rectangles': [/Parcel 1/u, /surface-local rectangles/u],
          'vue-virtual-core-composition': [/Delivery 1/u, /Delivery 150/u, /outside the item domain/u],
          'vue-chart-projected-svg': [/Weekday deliveries/u, /<polyline/u, /Wednesday/u, /color tokens/u],
          'vue-chart-view-controls': [/Earlier/u, /Zoom in/u, /Reset range/u, /Control\+wheel/u],
          'vue-components-grid-two-dimensional-selection': [/Selected slot: Monday 09:00/u, /Monday/u, /data-part="cell"/u],
          'vue-components-tree-view-expanded-selection': [/Selected: Standard/u, /Home delivery/u, /Collection points/u, /data-example-disclosure-icon/u, /data-expanded/u],
          'vue-components-feed-window-request': [/3 updates · Revision 0/u, /Load newer updates/u],
          'vue-components-menu-nested-actions': [/Invoked: none/u, /Share/u],
          'vue-components-menubar-nested-actions': [/Invoked: none/u, /File/u, /Help/u],
          'vue-components-navigation-menu-link-destinations': [/Destination: none/u, /<a /u],
          'vue-components-tooltip-focus-hover': [/Archive message/u],
          'vue-components-alert-dialog-explicit-confirmation': [/Request: active/u],
          'vue-components-drawer-side-panel': [/Drawer open: false/u],
          'vue-components-toast-transient-feedback': [/0 notifications/u, /Show saved notification/u],
          'vue-components-menu-button-action-menu': [/Invoked: none/u, /Message actions/u],
          'vue-components-dialog-exit-transition': [/Open: false/u, /Open transition dialog/u],
          'vue-components-toolbar-action-navigation': [/role="toolbar"/u, /Last action: none/u],
          'vue-components-pagination-page-selection': [/Page 1 of 6/u, /Previous/u, /Next/u],
          'vue-components-stepper-manual-steps': [/Step: Address/u, /Confirm your delivery address./u],
          'vue-components-checkbox-group-selected-values': [/Channels: Email/u, /aria-checked="true"/u],
          'vue-components-multi-thumb-slider-interval-selection': [/Interval: 20 – 80/u, /--sectile-thumb-percentage:20%/u],
          'vue-components-carousel-presence-crossfade': [/Active service: Standard/u, /data-state="active"/u],
          'vue-temporal-date-field-bounded-date': [/Date: 2026-10-03/u, /Delivery date/u],
          'vue-temporal-time-field-native-time': [/Time: 09:30/u, /Collection time/u],
          'vue-temporal-date-time-field-local-date-time': [/Appointment: 2026-10-03T09:30/u],
          'vue-temporal-date-range-field-travel-dates': [/Stay: 2026-10-03 – 2026-10-07/u, /Arrival/u, /Departure/u],
          'vue-form-async-availability': [/Available notification email/u, /Validation: idle/u, /reserved@example.com/u, /600ms/u],
          'vue-temporal-time-range-field-collection-window': [/Window: 09:00 – 12:00/u],
          'vue-components-select-disabled-options': [/Delivery: Standard/u, /aria-disabled="true"/u],
          'vue-components-combobox-search-results': [/role="combobox"/u, /Member: none/u],
          'vue-components-listbox-multiple-selection': [/aria-multiselectable="true"/u, /Destinations: Email/u],
          'vue-components-tags-input-edit-tags': [/Tags: priority/u, /data-part="item-delete"/u],
          'vue-components-pin-input-verification-code': [/Code incomplete/u, /data-part="input"/u],
          'vue-components-editable-commit-cancel': [/Saved name: Reception delivery/u, /Cancel edit/u],
          'vue-components-number-field-decimal-value': [/value="12.5"/u, /Committed weight: 12.5/u],
          'vue-components-spin-button-bounded-quantity': [/role="spinbutton"/u, /Quantity: 3/u],
          'vue-components-slider-stepped-value': [/role="slider"/u, /aria-valuenow="40"/u, /--sectile-slider-percentage:40%/u],
          'vue-components-progress-determinate-value': [/role="progressbar"/u, /aria-valuenow="25"/u, /--sectile-progress-percentage:\s*25%/u],
          'vue-components-meter-threshold-zones': [/role="meter"/u, /data-zone="optimum"/u, /Storage: 40%/u],
          'vue-components-rating-clearable-score': [/role="radiogroup"/u, /aria-checked="true"/u, /Rating: 3/u],
          'vue-components-timer-countdown-controls': [/Paused/u, /Start/u, /Reset/u],
          'vue-temporal-calendar-selection': [/role="grid"/u, /aria-selected="true"/u, /Selected date: 2026-10-03/u],
          'vue-virtual-fixed-list': [/Delivery 1/u, /500 items/u],
          'vue-tabular-local-source': [/<table/u, /Project members/u, /Status: idle/u],
          'vue-chart-line-series': [/<canvas/u, /drawn after mounting/u],
          'vue-components-checkbox-default-state': [/aria-checked="true"/u, /Weekly summary · enabled/u],
          'vue-components-checkbox-indeterminate-state': [/aria-checked="mixed"/u, /Value: indeterminate/u],
          'vue-components-checkbox-readonly-disabled': [/aria-readonly="true"/u, /<button[^>]*\sdisabled(?:=""|\s|>)/u, /Read-only notifications/u, /Disabled notifications/u],
          'vue-components-switch-readonly-disabled': [/aria-readonly="true"/u, /<button[^>]*\sdisabled(?:=""|\s|>)/u, /Read-only delivery/u, /Disabled delivery/u],
          'vue-components-toggle-group-single-selection': [/aria-pressed="true"/u, /Alignment: Left/u],
          'vue-components-tabs-automatic-activation': [/role="tablist"/u, /aria-selected="true"/u, /Selected: Overview/u],
          'vue-components-accordion-single-panel': [/aria-expanded="true"/u, /Open panel: Delivery/u],
          'vue-components-accordion-multiple-panels': [/aria-expanded="true"/u, /Open panels: Delivery/u],
          'vue-components-text-multiline-value': [/<textarea/u, /Delivery notes/u, /Value: Leave the parcel at reception./u],
          'vue-components-text-lazy-value': [/<input/u, /Display name/u, /Committed name: Ada/u],
          'vue-components-switch-controlled-state': [/role="switch"/u, /aria-checked="false"/u, /Enabled: false/u],
          'vue-components-toggle-button-pressed-state': [/aria-pressed="false"/u, /Pinned: false/u],
          'vue-components-toggle-group-multiple-selection': [/aria-pressed="true"/u, /Selected: bold/u, /aria-disabled="true"/u],
          'vue-components-radio-group-disabled-options': [/role="radiogroup"/u, /aria-checked="true"/u, /Delivery: Standard/u, /aria-disabled="true"/u],
          'vue-components-tabs-manual-activation': [/role="tablist"/u, /aria-selected="true"/u, /Selected: Overview/u, /aria-disabled="true"/u],
          'vue-components-popover-positioned-dismissal': [/aria-expanded="false"/u, /Open: false/u],
        };
        for (const state of initialStates[route.exampleId] ?? []) assert.match(preview, state, route.path);
        if (route.exampleId === 'vue-components-quantity-field-unit-conversion') {
          const label = /<label[^>]*for="([^"]+)"[^>]*>Parcel length<\/label>/u.exec(preview);
          assert.ok(label, 'quantity specimen has a visible label');
          const inputs = [...preview.matchAll(/<input\b[^>]*>/gu)].map(([element]) => element);
          assert.ok(inputs.some(element => element.includes(`id="${label[1]}"`) && element.includes('aria-label="Parcel length"')), 'label targets the quantity input');
        }
        if (route.exampleId === 'vue-components-disclosure-exit-transition') {
          assert.match(html, /<output[^>]*aria-live="polite"[^>]*>\s*Open: true · Present\s*<\/output>/u);
          assert.match(html, /aria-expanded="true"/u);
        }
      } else if (route.kind === 'component') {
        const subjectExamples = examples.filter((example) => example.host === route.host && example.subject === route.subject);
        assert.equal([...html.matchAll(/class="[^"]*\bdocs-preview(?:\s|")/gu)].length, subjectExamples.length, route.path);
        assert.equal([...html.matchAll(/<div\b[^>]*class="[^"]*\bdocs-code-disclosure\b[^"]*"[^>]*>/gu)].length, subjectExamples.reduce((count, example) => count + example.code.length, 0), route.path);
        assert.equal(countButtons(html, 'Reset example'), subjectExamples.length, route.path);
        for (const example of subjectExamples) assert.ok(html.includes(`id="${example.id}-preview"`));
        const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map(([, id]) => id);
        assert.equal(new Set(ids).size, ids.length, `${route.path}: unique element IDs`);
      } else if (route.kind === 'area' && route.host === 'vue' && route.area !== 'components') {
        const domainExamples = examples.filter((example) => example.host === 'vue' && example.area === route.area);
        assert.equal([...html.matchAll(/class="[^"]*\bdocs-preview(?:\s|")/gu)].length, domainExamples.length, route.path);
        assert.equal(countButtons(html, 'Reset example'), domainExamples.length, route.path);
      } else {
        assert.doesNotMatch(html, /class="docs-preview/u, 'Galleries do not mount live previews');
        if (route.path === '/vue/components') {
          assert.equal([...html.matchAll(/class="docs-example-card"/gu)].length, components.length);
          for (const component of components) assert.ok(html.includes(`href="/sectile${componentPath(component.subject)}/"`));
        }
      }
      if (route.host === 'dom') assert.doesNotMatch(html, /Vue documentation/u);
    }
    for (const [source, target, fragment] of crossPageAnchors) {
      assert.ok(renderedIDs.get(target)?.has(fragment), `${source}: unresolved ${target}#${fragment}`);
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
