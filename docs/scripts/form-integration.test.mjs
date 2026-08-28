import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../', import.meta.url);
const repositoryRoot = new URL('../../', import.meta.url);
const readDocs = (path) => readFile(new URL(path, docsRoot), 'utf8');
const readRepository = (path) => readFile(new URL(path, repositoryRoot), 'utf8');

test('Form documentation exposes the optional package and host boundaries in both locales', async () => {
  const [english, korean, dom, koDom, vue, koVue, terminal, koTerminal, config] = await Promise.all([
    readDocs('packages/form.md'),
    readDocs('ko/packages/form.md'),
    readDocs('packages/dom.md'),
    readDocs('ko/packages/dom.md'),
    readDocs('packages/vue.md'),
    readDocs('ko/packages/vue.md'),
    readDocs('packages/terminal.md'),
    readDocs('ko/packages/terminal.md'),
    readDocs('.vitepress/config.ts'),
  ]);

  for (const source of [english, korean]) {
    assert.match(source, /pnpm add @sectile\/form/u);
    assert.match(source, /@sectile\/dom\/form/u);
    assert.match(source, /@sectile\/vue\/form/u);
    assert.match(source, /defineFormSubmission/u);
    assert.match(source, /useTemplateRef/u);
    assert.match(source, /shallowRef/u);
    assert.match(source, /Terminal/u);
    assert.doesNotMatch(source, /createFormComponents|useFormComponents/u);
  }
  for (const source of [dom, koDom, vue, koVue]) {
    assert.match(source, /@sectile\/form/u);
    assert.match(source, /optional/iu);
  }
  for (const source of [terminal, koTerminal]) {
    assert.match(source, /no Form adapter|Form 어댑터[^\n]+없/u);
    assert.match(source, /@sectile\/form\/state/u);
  }
  assert.match(config, /const packageIds = \['core', 'form'/u);
  assert.match(config, /\/packages\/form/u);
  assert.match(config, /\/ko\/packages\/form/u);
});

test('Form examples use static components and a single submission definition', async () => {
  const [catalog, preview, sources, generated, generatedKo, generator, componentData] = await Promise.all([
    readDocs('.vitepress/theme/catalog-code.ts'),
    readDocs('.vitepress/theme/components/FormCase.vue'),
    readDocs('.vitepress/theme/component-example-sources.ts'),
    readDocs('components/form.md'),
    readDocs('ko/components/form.md'),
    readDocs('scripts/generate-component-pages.mjs'),
    readDocs('data/components.json'),
  ]);

  for (const source of [catalog, preview, generated, generatedKo, generator]) {
    assert.match(source, /defineFormSubmission/u);
    assert.doesNotMatch(source, /createTypedForm|createFormComponents|useFormComponents/u);
  }
  assert.match(catalog, /<FormRoot v-bind="(?:account|profile|notifications|invitation)Submission">/u);
  assert.doesNotMatch(catalog, /FormSchemaSubmitHandler|FormSubmitHandler|:on-submit=/u);
  assert.match(preview, /<FormRoot[^>]+v-bind="submission"/u);
  assert.doesNotMatch(preview, /FormSchemaSubmitHandler|FormSubmitHandler|:on-submit=/u);
  assert.match(sources, /if \(component === 'form'\)[\s\S]+vue: exactVueSource[\s\S]+dom: domExampleCodeFor/u);
  const form = JSON.parse(componentData).components.find((component) => component.id === 'form');
  assert.deepEqual(form.scenarios.terminal, []);
});

test('Form migration and package manifests preserve the optional peer and Terminal exclusion', async () => {
  const [migration, rootPackage, docsPackage, domPackage, vuePackage, terminalPackage] = await Promise.all([
    readDocs('decisions/public-migration.md'),
    readRepository('package.json'),
    readDocs('package.json'),
    readRepository('packages/dom/package.json'),
    readRepository('packages/vue/package.json'),
    readRepository('packages/terminal/package.json'),
  ]);

  assert.match(migration, /Form package extraction in 0\.8\.0/u);
  assert.match(migration, /defineFormSubmission/u);
  assert.match(migration, /Terminal has no Form adapter/u);
  assert.match(rootPackage, /"@sectile\/form": "workspace:\*"/u);
  assert.match(docsPackage, /@sectile\/form/u);

  for (const manifestSource of [domPackage, vuePackage]) {
    const manifest = JSON.parse(manifestSource);
    assert.equal(manifest.peerDependencies['@sectile/form'], 'workspace:*');
    assert.equal(manifest.peerDependenciesMeta['@sectile/form'].optional, true);
  }

  const terminal = JSON.parse(terminalPackage);
  assert.equal(terminal.dependencies?.['@sectile/form'], undefined);
  assert.equal(terminal.peerDependencies?.['@sectile/form'], undefined);
  assert.equal(terminal.devDependencies?.['@sectile/form'], undefined);
  assert.equal(terminal.exports?.['./form'], undefined);
});
