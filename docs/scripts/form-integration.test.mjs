import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../', import.meta.url);
const repositoryRoot = new URL('../../', import.meta.url);
const readDocs = (path) => readFile(new URL(path, docsRoot), 'utf8');
const readRepository = (path) => readFile(new URL(path, repositoryRoot), 'utf8');

const guideNames = [
  'form.md',
  'form/vue/index.md',
  'form/dom/index.md',
  'form/vue/fields.md',
  'form/vue/validation.md',
  'form/vue/submission.md',
  'form/vue/custom-controls.md',
  'form/vue/ssr.md',
];

test('Form documentation provides a complete task-oriented guide in both locales', async () => {
  const [englishSources, koreanSources, apiChooser, koApiChooser, vueApi, koVueApi, domApi, koDomApi, config, hostSelector] = await Promise.all([
    Promise.all(guideNames.map((name) => readDocs(`packages/${name}`))),
    Promise.all(guideNames.map((name) => readDocs(`ko/packages/${name}`))),
    readDocs('packages/form/api.md'),
    readDocs('ko/packages/form/api.md'),
    readDocs('packages/form/vue/api.md'),
    readDocs('ko/packages/form/vue/api.md'),
    readDocs('packages/form/dom/api.md'),
    readDocs('ko/packages/form/dom/api.md'),
    readDocs('.vitepress/config.ts'),
    readDocs('.vitepress/theme/components/HostSelector.vue'),
  ]);

  const [overview, vue, dom, fields, validation, submission, customControls, ssr] = englishSources;
  const [koOverview, koVue, koDom, koFields, koValidation, koSubmission, koCustomControls, koSsr] = koreanSources;

  for (const source of [overview, koOverview]) {
    assert.match(source, /pnpm add [^\n`]*@sectile\/form/u);
    assert.match(source, /\.\/form\/api/u);
    assert.doesNotMatch(source, /<FormPackageExample/u);
    assert.doesNotMatch(source, /`FormRoot`|`FormField`|`FormConnection`|`createForm`/u);
  }

  for (const source of [apiChooser, koApiChooser]) {
    assert.match(source, /\.\/vue\/api/u);
    assert.match(source, /\.\/dom\/api/u);
    assert.doesNotMatch(source, /Generated|생성함/u);
  }

  for (const source of [vueApi, koVueApi]) {
    assert.match(source, /Generated|생성함/u);
    assert.match(source, /FormRoot/u);
    assert.match(source, /defineFormSubmission/u);
    assert.doesNotMatch(source, /FormConnection|DOMForm|createForm|registerParticipant|@sectile\/dom\/form/u);
  }

  for (const source of [domApi, koDomApi]) {
    assert.match(source, /Generated|생성함/u);
    assert.match(source, /createForm/u);
    assert.match(source, /FormConnection/u);
    assert.doesNotMatch(source, /FormRoot|useCompositeFormControl|@sectile\/vue\/form/u);
  }

  assert.match(overview, /\.\/form\/vue/u);
  assert.match(overview, /\.\/form\/dom/u);
  assert.match(overview, /\.\/form\/vue\/custom-controls/u);
  assert.match(overview, /- \[Vue\]\(\.\/form\/vue\/\)/u);
  assert.match(overview, /- \[Direct DOM\]\(\.\/form\/dom\/\)/u);
  assert.doesNotMatch(overview, /form-integration-table/u);
  assert.doesNotMatch(overview, /Browser without Vue/u);
  assert.match(koOverview, /\.\/form\/vue/u);
  assert.match(koOverview, /\.\/form\/dom/u);
  assert.match(koOverview, /\.\/form\/vue\/custom-controls/u);
  assert.match(koOverview, /## 연결 방식 선택/u);
  assert.match(koOverview, /- \[Vue\]\(\.\/form\/vue\/\)/u);
  assert.match(koOverview, /- \[DOM 직접 연결\]\(\.\/form\/dom\/\)/u);
  assert.doesNotMatch(koOverview, /form-integration-table/u);
  assert.doesNotMatch(koOverview, /Vue를 쓰지 않는/u);

  for (const source of [vue, koVue]) {
    assert.match(source, /@sectile\/vue\/form/u);
    assert.match(source, /<FormPackageExample/u);
    assert.match(source, /defineFormSubmission/u);
    assert.match(source, /<select/u);
    assert.match(source, /<TextField/u);
    assert.match(source, /submission\.status/u);
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
    '/packages/form/vue/api',
    '/packages/form/vue/fields',
    '/packages/form/vue/validation',
    '/packages/form/vue/submission',
    '/packages/form/vue/custom-controls',
    '/packages/form/vue/ssr',
    '/packages/form/dom',
    '/packages/form/dom/api',
    '/ko/packages/form/vue',
    '/ko/packages/form/vue/api',
    '/ko/packages/form/vue/fields',
    '/ko/packages/form/vue/validation',
    '/ko/packages/form/vue/submission',
    '/ko/packages/form/vue/custom-controls',
    '/ko/packages/form/vue/ssr',
    '/ko/packages/form/dom',
    '/ko/packages/form/dom/api',
  ]) {
    assert.match(config, new RegExp(path.replaceAll('/', '\\/'), 'u'));
  }

  assert.match(hostSelector, /formHosts = \['dom', 'vue'\]/u);
  assert.match(hostSelector, /router\.go\(withBase\(formTarget/u);
  assert.match(hostSelector, /path\.match\([\s\S]*\(dom\|vue\)/u);
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

test('Form examples and API are owned by the Form package documentation', async () => {
  const [example, sources, preview, generator, componentData, packageData, sections] = await Promise.all([
    readDocs('.vitepress/theme/components/FormPackageExample.vue'),
    readDocs('.vitepress/theme/form-package-example-source.ts'),
    readDocs('.vitepress/theme/components/ComponentExamplePreview.vue'),
    readDocs('scripts/generate-component-pages.mjs'),
    readDocs('data/components.json'),
    readDocs('data/form-package.json'),
    readDocs('data/component-sections.ts'),
  ]);

  for (const source of [example, sources]) {
    assert.match(source, /defineFormSubmission/u);
    assert.doesNotMatch(source, /createTypedForm|createFormComponents|useFormComponents/u);
  }
  assert.match(example, /<FormRoot[\s\S]+v-bind="submission"/u);
  assert.match(example, /<TextField[\s\S]+<SelectRoot/u);
  assert.match(example, /dirty[\s\S]+touched[\s\S]+submission\.status/u);
  assert.match(example, /reinitialize/u);
  assert.match(example, /v-model="profile\.displayName"/u);
  assert.match(example, /v-model="profile\.email"/u);
  assert.match(example, /v-model="profile\.timezone"/u);
  assert.match(example, /Object\.assign\(profile, baseline\.value\)/u);
  assert.match(example, /controlRevision\.value \+= 1/u);
  assert.match(example, /:key="controlRevision"/u);
  assert.match(example, /@click\.prevent="resetExample\(reinitialize\)"/u);
  assert.match(example, /await nextTick\(\)[\s\S]+reinitialize\(\)/u);
  assert.doesNotMatch(example, /@reset\.prevent/u);
  assert.match(example, /form-workbench__select-content:not\(\[hidden\]\)/u);
  assert.match(example, /form-workbench__state-row--stacked/u);
  assert.match(sources, /baseline\.value = \{ \.\.\.profile \}[\s\S]+reinitialize\(\)/u);
  assert.match(sources, /controlRevision\.value \+= 1/u);
  assert.match(sources, /:key="controlRevision"/u);
  assert.match(sources, /@click\.prevent="resetExample\(reinitialize\)"/u);
  assert.doesNotMatch(sources, /@reset\.prevent/u);
  assert.doesNotMatch(preview, /FormCase|case 'form'/u);
  assert.equal(JSON.parse(componentData).components.some((component) => component.id === 'form'), false);
  assert.equal(JSON.parse(packageData).id, 'form');
  assert.doesNotMatch(sections, /['"]form['"]/u);
  assert.match(generator, /packages', 'form', 'vue', 'api\.md'/u);
  assert.match(generator, /packages', 'form', 'dom', 'api\.md'/u);

  await assert.rejects(readDocs('components/form.md'), { code: 'ENOENT' });
  await assert.rejects(readDocs('ko/components/form.md'), { code: 'ENOENT' });
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
