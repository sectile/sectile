import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../', import.meta.url);
const repositoryRoot = new URL('../../', import.meta.url);
const readDocs = (path) => readFile(new URL(path, docsRoot), 'utf8');
const readRepository = (path) => readFile(new URL(path, repositoryRoot), 'utf8');

const guideNames = [
  'form.md',
  'form/vue.md',
  'form/dom.md',
  'form/fields.md',
  'form/validation.md',
  'form/submission.md',
  'form/custom-controls.md',
  'form/ssr.md',
];

test('Form documentation provides a complete task-oriented guide in both locales', async () => {
  const [englishSources, koreanSources, config] = await Promise.all([
    Promise.all(guideNames.map((name) => readDocs(`packages/${name}`))),
    Promise.all(guideNames.map((name) => readDocs(`ko/packages/${name}`))),
    readDocs('.vitepress/config.ts'),
  ]);

  const [overview, vue, dom, fields, validation, submission, customControls, ssr] = englishSources;
  const [koOverview, koVue, koDom, koFields, koValidation, koSubmission, koCustomControls, koSsr] = koreanSources;

  for (const source of [overview, koOverview]) {
    assert.match(source, /pnpm add [^\n`]*@sectile\/form/u);
    assert.match(source, /defineFormSubmission/u);
  }

  assert.match(overview, /\.\/form\/vue/u);
  assert.match(overview, /\.\/form\/dom/u);
  assert.match(overview, /\.\/form\/custom-controls/u);
  assert.match(koOverview, /\.\/form\/vue/u);
  assert.match(koOverview, /\.\/form\/dom/u);
  assert.match(koOverview, /\.\/form\/custom-controls/u);

  for (const source of [vue, koVue]) {
    assert.match(source, /@sectile\/vue\/form/u);
    assert.match(source, /defineFormSubmission/u);
    assert.match(source, /<select/u);
    assert.match(source, /<TextField/u);
    assert.match(source, /submissionStatus/u);
  }

  for (const source of [dom, koDom]) {
    assert.match(source, /@sectile\/dom\/form/u);
    assert.match(source, /createForm/u);
    assert.match(source, /\.destroy/u);
    assert.match(source, /native|네이티브/u);
    assert.match(source, /managed|관리형/u);
    assert.match(source, /registerParticipant/u);
  }

  for (const source of [fields, koFields]) {
    assert.match(source, /<input/u);
    assert.match(source, /<SwitchRoot|<SelectRoot/u);
    assert.match(source, /radio/u);
    assert.match(source, /profile[\s\S]*displayName/u);
    assert.match(source, /Teleport/u);
  }

  for (const source of [validation, koValidation]) {
    assert.match(source, /required/u);
    assert.match(source, /validate/u);
    assert.match(source, /Standard Schema/u);
    assert.match(source, /issues/u);
    assert.match(source, /mapSubmitError/u);
  }

  for (const source of [submission, koSubmission]) {
    assert.match(source, /defineFormSubmission/u);
    assert.match(source, /FormData/u);
    assert.match(source, /File/u);
    assert.match(source, /action=/u);
    assert.match(source, /FormReset/u);
  }

  for (const source of [customControls, koCustomControls]) {
    assert.match(source, /useTemplateRef/u);
    assert.match(source, /shallowRef/u);
    assert.match(source, /useNativeInputFormControl/u);
    assert.match(source, /useCompositeFormControl/u);
    assert.match(source, /provideFormControlOwner/u);
  }

  for (const source of [ssr, koSsr]) {
    assert.match(source, /hydration/iu);
    assert.match(source, /Teleport/u);
    assert.match(source, /issues/u);
    assert.match(source, /initialLocale/u);
  }

  for (const path of [
    '/packages/form/vue',
    '/packages/form/dom',
    '/packages/form/fields',
    '/packages/form/validation',
    '/packages/form/submission',
    '/packages/form/custom-controls',
    '/packages/form/ssr',
    '/ko/packages/form/vue',
    '/ko/packages/form/dom',
    '/ko/packages/form/fields',
    '/ko/packages/form/validation',
    '/ko/packages/form/submission',
    '/ko/packages/form/custom-controls',
    '/ko/packages/form/ssr',
  ]) {
    assert.match(config, new RegExp(path.replaceAll('/', '\\/'), 'u'));
  }
});

test('Form public documentation stays consumer-facing', async () => {
  const [englishSources, koreanSources, readme, migration, dom, koDom, vue, koVue, terminal, koTerminal] = await Promise.all([
    Promise.all(guideNames.map((name) => readDocs(`packages/${name}`))),
    Promise.all(guideNames.map((name) => readDocs(`ko/packages/${name}`))),
    readRepository('packages/form/README.md'),
    readDocs('decisions/public-migration.md'),
    readDocs('packages/dom.md'),
    readDocs('ko/packages/dom.md'),
    readDocs('packages/vue.md'),
    readDocs('ko/packages/vue.md'),
    readDocs('packages/terminal.md'),
    readDocs('ko/packages/terminal.md'),
  ]);

  const publicFormSources = [...englishSources, ...koreanSources, readme];
  for (const source of publicFormSources) {
    assert.doesNotMatch(source, /createTypedForm|createFormComponents|useFormComponents/u);
    assert.doesNotMatch(source, /participant registry|validation generations?|reset commands?|migration examples?/iu);
    assert.doesNotMatch(source, /참여 요소 레지스트리|검증 세대|초기화 명령|마이그레이션/u);
  }

  assert.doesNotMatch(migration, /Form package extraction|createTypedForm|@sectile\/form/u);

  for (const source of [dom, koDom, vue, koVue]) {
    assert.match(source, /@sectile\/form/u);
    assert.match(source, /optional/iu);
  }
  assert.match(terminal, /does not expose a Form adapter/u);
  assert.match(koTerminal, /Form 어댑터를 제공하지 않/u);
  for (const source of [terminal, koTerminal]) {
    assert.doesNotMatch(source, /@sectile\/form\/state/u);
  }
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

test('Form remains an optional DOM and Vue peer with no Terminal adapter', async () => {
  const [rootPackage, docsPackage, domPackage, vuePackage, terminalPackage] = await Promise.all([
    readRepository('package.json'),
    readDocs('package.json'),
    readRepository('packages/dom/package.json'),
    readRepository('packages/vue/package.json'),
    readRepository('packages/terminal/package.json'),
  ]);

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
