import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, normalize, relative, resolve, sep } from 'node:path';
import { listFiles, root } from './lib/repository.mjs';
import { renderTree } from './lib/tree.mjs';

const docsRoot = resolve(root, 'docs');
const markdownFiles = (await listFiles(docsRoot)).filter((path) => path.endsWith('.md'));
assert.equal(markdownFiles.length, 23, 'documentation inventory changed without updating its contract');
const relativePath = (path) => relative(root, path).split(sep).join('/');
const byPath = new Set(markdownFiles.map(relativePath));
for (const path of markdownFiles) {
  const source = await readFile(path, 'utf8');
  const withoutFrontmatter = source.startsWith('---\n')
    ? source.slice(source.indexOf('\n---\n', 4) + 5)
    : source;
  const withoutFences = withoutFrontmatter.replace(/```[\s\S]*?```/gu, '');
  assert.match(withoutFences, /^# [^#\n]+/mu, `${relativePath(path)} requires one H1`);
}

const reachable = new Set();
const pending = ['docs/README.md'];
while (pending.length > 0) {
  const current = pending.pop();
  if (current === undefined || reachable.has(current)) continue;
  reachable.add(current);
  const source = await readFile(resolve(root, current), 'utf8');
  const links = [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)].map((match) => match[1]);
  for (const link of links) {
    if (link.startsWith('http:') || link.startsWith('https:') || link.startsWith('#')) continue;
    const target = normalize(resolve(dirname(resolve(root, current)), link.split('#')[0]));
    const targetRelative = relativePath(target);
    if (byPath.has(targetRelative)) pending.push(targetRelative);
  }
}
assert.deepEqual([...reachable].filter((path) => byPath.has(path)).sort(), [...byPath].sort());

for (const name of ['sequence', 'range', 'grid', 'tree']) {
  assert.equal(byPath.has(`docs/primitives/${name}.md`), true);
}
const theory = await readFile('docs/references/sectile-theory.md', 'utf8');
assert.equal(theory.includes('> Status: Accepted'), true);
const tree = await readFile('TREE.txt', 'utf8');
assert.equal(tree, await renderTree(root), 'TREE.txt is stale; run npm run update:tree');
console.log(JSON.stringify({ status: 'passed', files: markdownFiles.length, reachable: reachable.size, publicSubpaths: 4 }, null, 2));
