import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { publishedPackageDirectories } from './lib/published-packages.mjs';
import { listFiles, readJSON, relativeToRoot, root } from './lib/repository.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

test('published packages follow their workspace dependency order', async () => {
  const graph = await loadPublishedPackageGraph();
  const position = new Map(graph.order.map(({ name }, index) => [name, index]));
  assert.deepEqual(new Set(graph.order.map(({ directory }) => directory)), new Set(publishedPackageDirectories));
  for (const entry of graph.order) {
    for (const dependency of entry.dependencies) {
      assert.ok(position.get(dependency) < position.get(entry.name), `${dependency} must precede ${entry.name}`);
    }
  }
});

test('runtime tests consume verification artifacts instead of production dist', async () => {
  const offenders = [];
  for (const directory of publishedPackageDirectories) {
    for (const relativeDirectory of ['tests', 'type-tests']) {
      const testRoot = join(root, 'packages', directory, relativeDirectory);
      let paths;
      try {
        paths = await listFiles(testRoot);
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw error;
      }
      for (const path of paths) {
        const source = await readFile(path, 'utf8');
        if (/(?:\.\.\/)+dist\//u.test(source)) offenders.push(relativeToRoot(path));
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('package scripts stay local and leave verification orchestration to the workspace', async () => {
  for (const directory of publishedPackageDirectories) {
    const manifest = await readJSON(join(root, 'packages', directory, 'package.json'));
    assert.equal(manifest.scripts.verify, undefined, `${manifest.name} owns a composite verify script`);
    for (const [task, command] of Object.entries(manifest.scripts)) {
      assert.equal(
        /(?:\.\.\/)+scripts\//u.test(command),
        false,
        `${manifest.name} ${task} reaches outside its package`,
      );
    }
  }
});

test('host package tests build isolated verification artifacts', async () => {
  for (const directory of ['dom', 'terminal', 'vue']) {
    const manifest = await readJSON(join(root, 'packages', directory, 'package.json'));
    assert.equal(manifest.scripts['build:verification'], 'node scripts/build.mjs verification');
    assert.match(manifest.scripts.test, /run build:verification/u);
  }
});

test('Vue tests use managed Happy DOM windows', async () => {
  const testRoot = join(root, 'packages', 'vue', 'tests');
  const offenders = [];
  for (const path of await listFiles(testRoot)) {
    if (!path.endsWith('.test.mjs')) continue;
    const source = await readFile(path, 'utf8');
    if (/from 'happy-dom'/u.test(source)) offenders.push(relativeToRoot(path));
  }
  assert.deepEqual(offenders, []);

  const helper = await readFile(join(testRoot, 'happy-dom.mjs'), 'utf8');
  assert.match(helper, /__VUE_DEVTOOLS_GLOBAL_HOOK__/u);
  assert.match(helper, /happyDOM\.abort\(\)/u);
  assert.match(helper, /happyDOM\.close\(\)/u);
});
