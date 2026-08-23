import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import catalog from '../data/components.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const markdown = await paths(root, '.md');

for (const localeRoot of ['', 'ko']) {
  for (const route of ['components', 'packages', 'theory']) {
    await access(resolve(root, localeRoot, route, 'index.md')).catch(() => {
      assert.fail(`/${localeRoot === '' ? '' : `${localeRoot}/`}${route}/ requires an index.md route entry`);
    });
  }
}

for (const page of ['structures', 'state-and-text', 'transitions', 'composition', 'scope']) {
  for (const localeRoot of ['', 'ko']) {
    await access(resolve(root, localeRoot, 'theory', `${page}.md`)).catch(() => {
      assert.fail(`/${localeRoot === '' ? '' : `${localeRoot}/`}theory/${page} requires a public theory page`);
    });
  }
}

for (const path of markdown) {
  const source = await readFile(path, 'utf8');
  const withoutFrontmatter = source.replace(/^---\n[\s\S]*?\n---\n/u, '');
  const isHome = /^---\n[\s\S]*?\blayout:\s*home\b[\s\S]*?\n---\n/u.test(source);
  if (!isHome) assert.match(withoutFrontmatter, /^#\s+\S+/mu, `${relative(root, path)} requires an H1`);
  for (const link of localLinks(source)) {
    const target = resolveLink(path, link);
    await access(target).catch(() => {
      assert.fail(`${relative(root, path)} has a broken link: ${link}`);
    });
  }
}

const publicRoots = ['guide', 'components', 'packages', 'theory', 'ko'];
const publicMarkdown = markdown.filter((path) => {
  const pathFromRoot = relative(root, path);
  return pathFromRoot === 'index.md' || publicRoots.some((directory) => pathFromRoot.startsWith(`${directory}/`));
});
const privateRoutes = ['architecture', 'decisions', 'engineering', 'getting-started', 'internals', 'performance', 'primitives', 'references', 'testing'];
for (const path of publicMarkdown) {
  const source = await readFile(path, 'utf8');
  for (const route of privateRoutes) {
    assert.equal(
      source.includes(`](/${route}/`) || source.includes(`](/${route})`),
      false,
      `${relative(root, path)} must not expose internal /${route} documentation`,
    );
  }
}

const componentFiles = (await readdir(resolve(root, 'components')))
  .filter((name) => name.endsWith('.md') && name !== 'index.md')
  .map((name) => name.slice(0, -3))
  .sort();
const componentIds = catalog.components.map((component) => component.id).sort();
assert.deepEqual(componentFiles, componentIds, 'component docs must match the docs catalog');
const koComponentFiles = (await readdir(resolve(root, 'ko', 'components')))
  .filter((name) => name.endsWith('.md') && name !== 'index.md')
  .map((name) => name.slice(0, -3))
  .sort();
assert.deepEqual(koComponentFiles, componentIds, 'Korean component docs must match the docs catalog');

for (const localeRoot of ['', 'ko']) {
  const gettingStarted = await readFile(resolve(root, localeRoot, 'guide/getting-started.md'), 'utf8');
  assert.equal(gettingStarted.includes('<HostInstall />'), true, `${localeRoot || 'English'} getting started must include installation guidance`);
  for (const componentId of componentIds) {
    const component = await readFile(resolve(root, localeRoot, 'components', `${componentId}.md`), 'utf8');
    assert.equal(component.includes('<HostInstall />'), false, `${localeRoot || 'English'} ${componentId} must not repeat installation guidance`);
    if (componentId !== 'checkbox') {
      const anatomyHeading = localeRoot === 'ko' ? '## 구성' : '## Anatomy';
      assert.equal(component.includes(anatomyHeading), true, `${localeRoot || 'English'} ${componentId} requires ${anatomyHeading}`);
      assert.equal(
        component.includes(`<ComponentAnatomy component="${componentId}" />`),
        true,
        `${localeRoot || 'English'} ${componentId} must render its anatomy explorer`,
      );
    }
  }
}

const checkbox = await readFile(resolve(root, 'components/checkbox.md'), 'utf8');
for (const heading of [
  '## Basic usage',
  '## Indeterminate state',
  '## State ownership',
  '## Form participation',
  '## Disabled and readonly',
  '## Anatomy',
  '## API reference',
  '## Data attributes',
  '## Keyboard interaction',
  '## Accessibility',
]) {
  assert.equal(checkbox.includes(heading), true, `checkbox.md requires ${heading}`);
}
assert.equal(checkbox.includes('<CheckboxDemo />'), true, 'checkbox.md must render the real example');
assert.equal(checkbox.includes('<CheckboxIndeterminateDemo />'), true, 'checkbox.md must separate the indeterminate example');
assert.equal(checkbox.includes('<CheckboxAttributesDemo />'), true, 'checkbox.md must render the data-attribute explorer');
for (const example of [
  'CheckboxOwnershipDemo',
  'CheckboxFormDemo',
  'CheckboxInteractionDemo',
]) {
  assert.equal(checkbox.includes(`<${example} />`), true, `checkbox.md must render ${example}`);
}
for (const example of [
  'BasicCheckbox.vue',
  'ControlledCheckbox.vue',
  'DataAttributes.vue',
  'FormCheckbox.vue',
  'IndeterminateCheckbox.vue',
  'InteractionCheckboxes.vue',
]) {
  await access(resolve(root, 'examples/checkbox', example));
}
await access(resolve(root, 'examples/checkbox/sources.ts'));

const koCheckbox = await readFile(resolve(root, 'ko/components/checkbox.md'), 'utf8');
for (const heading of [
  '## 기본 사용법',
  '## 일부 선택 상태',
  '## 상태 관리 방식',
  '## 양식 제출',
  '## 비활성 상태와 읽기 전용 상태',
  '## 구성',
  '## 속성',
  '## 상태 속성',
  '## 키보드 동작',
  '## 접근성',
]) {
  assert.equal(koCheckbox.includes(heading), true, `ko/components/checkbox.md requires ${heading}`);
}
assert.equal(koCheckbox.includes('<CheckboxDemo />'), true, 'Korean checkbox docs must render the real example');
assert.equal(koCheckbox.includes('<CheckboxIndeterminateDemo />'), true, 'Korean checkbox docs must separate the indeterminate example');
assert.equal(koCheckbox.includes('<CheckboxAttributesDemo />'), true, 'Korean checkbox docs must render the data-attribute explorer');
for (const example of [
  'CheckboxOwnershipDemo',
  'CheckboxFormDemo',
  'CheckboxInteractionDemo',
]) {
  assert.equal(koCheckbox.includes(`<${example} />`), true, `Korean checkbox docs must render ${example}`);
}

console.log(JSON.stringify({ status: 'passed', markdown: markdown.length, publicMarkdown: publicMarkdown.length, components: componentIds.length }, null, 2));

async function paths(directory, extension) {
  const result = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.vitepress-dist') continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && extname(entry.name) === extension) result.push(path);
    }
  }
  return result;
}

function localLinks(source) {
  return [...source.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/gu)]
    .map((match) => match[1].split('#')[0])
    .filter(Boolean);
}

function resolveLink(sourcePath, link) {
  const clean = decodeURIComponent(link);
  const target = clean.startsWith('/') ? resolve(root, clean.slice(1)) : resolve(dirname(sourcePath), clean);
  if (extname(target) !== '') return target;
  return clean.endsWith('/') ? resolve(target, 'index.md') : `${target}.md`;
}
