import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import catalog from '../data/components.json' with { type: 'json' };
import { componentAnatomy } from '../.vitepress/theme/component-anatomy.ts';
import { documentedScenarios, documentedSections } from '../data/component-documentation.mjs';

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
  assert.equal(source.toLowerCase().includes('playground'), false, `${relative(root, path)} must describe the documentation surface, not a separate playground`);
  assert.equal(source.includes('Use this case to inspect'), false, `${relative(root, path)} contains placeholder scenario copy`);
  assert.equal(/demonstrates\s+\S+\s+as a separate/iu.test(source), false, `${relative(root, path)} contains generated placeholder copy`);
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
    const catalogEntry = catalog.components.find((entry) => entry.id === componentId);
    assert.ok(catalogEntry, `catalog entry required for ${componentId}`);
    const scenarios = documentedScenarios(catalogEntry);
    const sections = documentedSections(catalogEntry);
    assert.ok(scenarios.length >= 1, `${componentId} requires at least one meaningful DOM documentation example`);
    for (const scenario of scenarios) {
      const marker = `<ComponentExample component="${componentId}" scenario="${scenario}"`;
      assert.equal(
        component.split(marker).length - 1,
        1,
        `${localeRoot || 'English'} ${componentId} must render scenario ${scenario} exactly once`,
      );
    }
    const renderedScenarios = [...component.matchAll(/<ComponentExample\s+component="[^"]+"\s+scenario="([^"]+)"/gu)]
      .map((match) => match[1]);
    assert.deepEqual(
      renderedScenarios,
      [...sections.usage, ...sections.examples],
      `${localeRoot || 'English'} ${componentId} must render only its curated DOM examples in order`,
    );
    const requiredHeadings = localeRoot === 'ko'
      ? ['## 용법', '## API', '## 파트', '## 키보드 동작', '## 접근성']
      : ['## Usage', '## API', '## Parts', '## Keyboard interaction', '## Accessibility'];
    if (sections.examples.length > 0) {
      requiredHeadings.splice(1, 0, localeRoot === 'ko' ? '## 예시' : '## Examples');
    }
    for (const heading of requiredHeadings) {
      assert.equal(component.includes(heading), true, `${localeRoot || 'English'} ${componentId} requires ${heading}`);
    }
    for (const heading of ['## Features', '## 지원 기능', '## Example cases', '## 추가 예시']) {
      assert.equal(component.includes(heading), false, `${localeRoot || 'English'} ${componentId} must expose specific behavior sections instead of ${heading}`);
    }
    assert.doesNotMatch(component, /^## Anatomy$/mu, `${localeRoot || 'English'} ${componentId} must not duplicate Parts with Anatomy`);
    assert.doesNotMatch(component, /^## 구성$/mu, `${localeRoot || 'English'} ${componentId} must not duplicate Parts with 구성`);
    assert.equal(component.includes('<ComponentAnatomy'), false, `${localeRoot || 'English'} ${componentId} must not render ComponentAnatomy`);
    assert.equal(
      component.includes(`@sectile/vue/${componentId}`),
      true,
      `${localeRoot || 'English'} ${componentId} must identify its public Vue package`,
    );
    const anatomy = componentAnatomy[componentId];
    assert.ok(anatomy, `anatomy definition required for ${componentId}`);
    for (const part of anatomy.parts.filter((part) => part !== 'provider')) {
      const marker = `<code class="component-part-token">${part}</code>`;
      assert.equal(
        component.split(marker).length - 1,
        1,
        `${localeRoot || 'English'} ${componentId} must document public part ${part} exactly once`,
      );
    }
    assert.equal(component.includes('Non-visual state owner'), false, `${localeRoot || 'English'} ${componentId} must not expose implementation-only providers in visual anatomy`);
    assert.equal(component.includes('Stable attributes'), false, `${localeRoot || 'English'} ${componentId} must not repeat stable attributes per part`);
    assert.equal(component.includes('안정 속성'), false, `${localeRoot || 'English'} ${componentId} must not repeat stable attributes per part`);
    const repeatedHeadings = localeRoot === 'ko'
      ? ['## 상태 관리 방식', '## 비활성 상태와 읽기 전용 상태', '## 패키지 지원', '## 의미 규칙']
      : ['## State ownership', '## Disabled and readonly', '## Package availability', '## Semantics'];
    for (const heading of repeatedHeadings) {
      assert.equal(
        component.includes(heading),
        false,
        `${localeRoot || 'English'} ${componentId} must keep shared guidance out of component pages: ${heading}`,
      );
    }
  }
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
