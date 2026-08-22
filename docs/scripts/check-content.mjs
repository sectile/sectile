import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import catalog from '../data/components.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const markdown = await paths(root, '.md');

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

const componentFiles = (await readdir(resolve(root, 'components')))
  .filter((name) => name.endsWith('.md') && name !== 'index.md')
  .map((name) => name.slice(0, -3))
  .sort();
const componentIds = catalog.components.map((component) => component.id).sort();
assert.deepEqual(componentFiles, componentIds, 'component docs must match the docs catalog');

const checkbox = await readFile(resolve(root, 'components/checkbox.md'), 'utf8');
for (const heading of [
  '## Features',
  '## Installation',
  '## Anatomy',
  '## Vue usage',
  '## State ownership',
  '## Core and host APIs',
  '## Data attributes',
  '## Keyboard interaction',
  '## Accessibility',
]) {
  assert.equal(checkbox.includes(heading), true, `checkbox.md requires ${heading}`);
}
assert.equal(checkbox.includes('<CheckboxDemo />'), true, 'checkbox.md must render the real example');
await access(resolve(root, 'examples/checkbox/BasicCheckbox.vue'));

console.log(JSON.stringify({ status: 'passed', markdown: markdown.length, components: componentIds.length }, null, 2));

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
