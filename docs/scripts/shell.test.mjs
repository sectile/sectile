import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  areas,
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
  assert.ok(!paths.includes('/components'));
  assert.ok(!paths.includes('/packages'));
});

test('Editor is a first-class documented area with runnable Vue and DOM examples', async () => {
  const editorArea = areas.find((area) => area.id === 'editor');
  assert.ok(editorArea);
  assert.equal(editorArea.principles.length, 3);
  assert.equal(areas.at(-1)?.id, 'editor');

  const vueEditorExamples = examples.filter(
    (example) => example.host === 'vue' && example.area === 'editor',
  );
  const domEditorExamples = examples.filter(
    (example) => example.host === 'dom' && example.area === 'editor',
  );
  assert.equal(vueEditorExamples.length, 2);
  assert.equal(domEditorExamples.length, 2);
  assert.equal(vueEditorExamples.filter((example) => example.featured).length, 1);
  assert.equal(domEditorExamples.filter((example) => example.featured).length, 1);

  const packageJSON = JSON.parse(await read('package.json'));
  assert.equal(packageJSON.dependencies['@sectile/content'], 'workspace:*');
  assert.equal(packageJSON.dependencies['@sectile/editor'], 'workspace:*');

  const app = await read('src/App.vue');
  assert.match(app, /docs-area-principles/u);
  assert.match(app, /Ownership model/u);
  assert.match(app, /docs-featured-example/u);
  assert.match(app, /featuredAreaRuntime/u);
  assert.match(app, /More examples/u);
  assert.doesNotMatch(app, /docs-example-card__thumbnail/u);
  assert.doesNotMatch(app, /<p>\{\{ example\.subject \}\}<\/p>/u);

  const vueArticle = await read('src/examples/vue/editor/basic-authoring/Preview.vue');
  assert.match(vueArticle, /componentRef\('docs\/callout'\)/u);
  assert.match(vueArticle, /EditorAuthoringMount/u);
  assert.match(vueArticle, /selectedInlineRange/u);
  assert.match(vueArticle, /setTypingMark/u);
  assert.match(vueArticle, /typingMarks/u);
  assert.match(vueArticle, /toggleMark\('strong'\)/u);
  assert.match(vueArticle, /toggleMark\('emphasis'\)/u);
  assert.match(vueArticle, /toggleMark\('code'\)/u);
  assert.match(vueArticle, /@mousedown\.prevent/u);
  assert.match(vueArticle, /baseRef\('blockquote'\)/u);
  assert.match(vueArticle, /baseRef\('list'\)/u);
  assert.match(vueArticle, /baseRef\('code-block'\)/u);
  assert.match(vueArticle, /component: 'docs\/media'/u);
  assert.match(vueArticle, /data-example-editor-media/u);
  assert.match(vueArticle, /data-example-editor-code/u);
  assert.doesNotMatch(vueArticle, /Append sentence|Strong intro/u);

  const vueReview = await read('src/examples/vue/editor/read-only/Preview.vue');
  assert.match(vueReview, /EditorIsolatedFrame/u);
  assert.match(vueReview, /component: 'docs\/comparison'/u);
  assert.doesNotMatch(vueReview, /Add review detail/u);

  const domArticle = await read('src/examples/dom/editor/application-owned/example.ts');
  assert.match(domArticle, /markEditorAuthoringMount/u);
  assert.match(domArticle, /selectedInlineRange/u);
  assert.match(domArticle, /setTypingMark/u);
  assert.match(domArticle, /typingMarks/u);
  assert.match(domArticle, /markButtons\.emphasis/u);
  assert.match(domArticle, /markButtons\.code/u);
  assert.match(domArticle, /preventToolbarFocus/u);
  assert.match(domArticle, /baseRef\('blockquote'\)/u);
  assert.match(domArticle, /baseRef\('list'\)/u);
  assert.match(domArticle, /baseRef\('code-block'\)/u);
  assert.match(domArticle, /component: 'docs\/dom-media'/u);
  assert.match(domArticle, /exampleEditorMedia/u);
  assert.match(domArticle, /exampleEditorCode/u);
  assert.doesNotMatch(domArticle, /Append sentence|Toggle strong/u);

  const domHistory = await read('src/examples/dom/editor/session-history/example.ts');
  assert.match(domHistory, /Approve release/u);
  assert.match(domHistory, /operations: \[/u);
  assert.doesNotMatch(domHistory, /Run transaction/u);
});

test('the design shell keeps fixed navigation geometry in tokens', async () => {
  const tokens = await read('src/styles/tokens.css');
  const shell = await read('src/styles/shell.css');

  assert.match(tokens, /--docs-header-height: 56px/u);
  assert.match(tokens, /--docs-sidebar-width: 256px/u);
  assert.match(tokens, /--docs-content-width: 1040px/u);
  assert.match(shell, /grid-template-columns: var\(--docs-sidebar-width\) minmax\(0, 1fr\)/u);
  assert.doesNotMatch(shell, /docs-example-card__thumbnail/u);
  assert.doesNotMatch(shell, /--vp-/u);
});

test('the example catalog rejects host mixing and duplicate focused routes', () => {
  const vueExample = examples.find((example) => example.host === 'vue');
  assert.ok(vueExample);

  const hostMixed = { ...vueExample, sourceOwner: 'dom' };
  assert.ok(validateExampleCatalog([hostMixed]).some((issue) => issue.code === 'host-source-mismatch'));

  const duplicate = { ...vueExample, id: 'duplicate-example' };
  assert.ok(validateExampleCatalog([vueExample, duplicate]).some((issue) => issue.code === 'duplicate-path'));

  const duplicateFeatured = {
    ...vueExample,
    id: 'duplicate-featured-example',
    slug: 'duplicate-featured-example',
    featured: true,
  };
  assert.ok(
    validateExampleCatalog([
      { ...vueExample, featured: true },
      duplicateFeatured,
    ]).some((issue) => issue.code === 'duplicate-featured'),
  );

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
  const app = await read('src/App.vue');
  const featuredPreviewIndex = app.indexOf('class="docs-preview docs-preview--featured"');
  const featuredCodeIndex = app.indexOf('class="docs-code-disclosure"', featuredPreviewIndex);
  assert.ok(featuredPreviewIndex >= 0 && featuredCodeIndex > featuredPreviewIndex);

  const detailIndex = app.indexOf('class="docs-example-detail"');
  const detailPreviewIndex = app.indexOf('class="docs-preview"', detailIndex);
  const detailCodeIndex = app.indexOf('class="docs-code-disclosure"', detailPreviewIndex);
  assert.ok(detailPreviewIndex > detailIndex && detailCodeIndex > detailPreviewIndex);

  assert.match(app, /<details class="docs-code-disclosure">/u);
  assert.doesNotMatch(app, /<details class="docs-code-disclosure"\s+open/u);
});
