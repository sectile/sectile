import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPublishedPackageGraph, loadWorkspacePackageVersions } from './lib/workspace-graph.mjs';
import {
  assertPackedDependencyRanges,
  assertPackedManifestMatchesSource,
  validatePackedPackageContents,
  validateTarballEntries,
} from './lib/packed-package-contract.mjs';

function fixture() {
  const manifest = {
    name: '@sectile/fixture',
    version: '1.0.0',
    type: 'module',
    sideEffects: false,
    files: ['dist'],
    publishConfig: { access: 'public' },
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
      './package.json': './package.json',
    },
  };
  return {
    contents: new Map([
      ['dist/index.js', 'export {};\n//# sourceMappingURL=index.js.map\n'],
      ['dist/index.js.map', JSON.stringify({
        version: 3,
        file: 'index.js',
        sources: ['../src/index.ts'],
        names: [],
        mappings: '',
      })],
      ['dist/index.d.ts', 'export {};\n'],
    ]),
    manifest,
    paths: ['LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js', 'dist/index.js.map', 'package.json'],
    sourceManifest: structuredClone(manifest),
  };
}

test('accepts a complete packed ESM distribution with JavaScript maps and declarations', () => {
  assert.deepEqual(validatePackedPackageContents(fixture()), {
    javascriptFiles: 1,
    declarationFiles: 1,
    sourceMapFiles: 1,
    declarationMapFiles: 0,
    files: 6,
  });
});

test('rejects incomplete exports, development files, workspace protocols, and declaration maps', () => {
  const missingExport = fixture();
  missingExport.manifest.exports['.'].import = './dist/missing.js';
  assert.throws(() => validatePackedPackageContents(missingExport), /target missing from tarball/u);

  const developmentFile = fixture();
  developmentFile.paths.push('src/index.ts');
  assert.throws(() => validatePackedPackageContents(developmentFile), /development files/u);

  const workspaceProtocol = fixture();
  workspaceProtocol.manifest.dependencies = { '@sectile/core': 'workspace:*' };
  assert.throws(() => validatePackedPackageContents(workspaceProtocol), /unresolved workspace protocol/u);

  const declarationMap = fixture();
  declarationMap.paths.push('dist/index.d.ts.map');
  declarationMap.contents.set('dist/index.d.ts.map', '{}');
  assert.throws(() => validatePackedPackageContents(declarationMap), /declaration maps are forbidden/u);
});

test('rejects unapproved root and distribution payloads', () => {
  for (const path of ['unexpected.bin', 'dist/archive.zip', 'dist/private.ts', 'dist/README.md']) {
    const input = fixture();
    input.paths.push(path);
    assert.throws(() => validatePackedPackageContents(input), /unexpected packed file/u);
  }
});

test('rejects manifest drift and tarball paths outside package/', () => {
  const { manifest, sourceManifest } = fixture();
  manifest.exports['.'].import = './dist/other.js';
  assert.throws(() => assertPackedManifestMatchesSource(manifest, sourceManifest), /packed exports differs/u);
  assert.throws(() => validateTarballEntries(['package/package.json', '../escape']), /must stay under package/u);
  assert.throws(() => validateTarballEntries(['package/package.json', 'package/../escape']), /parent traversal/u);
});

test('validates exact and caret workspace ranges after packing', () => {
  const sourceManifest = {
    name: '@sectile/form',
    dependencies: { '@sectile/core': 'workspace:^' },
    devDependencies: { '@sectile/virtual': 'workspace:*' },
  };
  const packedManifest = {
    name: '@sectile/form',
    dependencies: { '@sectile/core': '^0.14.1' },
    devDependencies: { '@sectile/virtual': '0.14.3' },
  };
  const versions = new Map([
    ['@sectile/core', '0.14.1'],
    ['@sectile/virtual', '0.14.3'],
  ]);
  assert.doesNotThrow(() => assertPackedDependencyRanges(packedManifest, sourceManifest, versions));
  packedManifest.dependencies['@sectile/core'] = '0.14.1';
  assert.throws(() => assertPackedDependencyRanges(packedManifest, sourceManifest, versions), /must be \^0\.14\.1/u);
});

test('discovers private workspace dependency versions before installation and validates packed development ranges', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectile-workspace-versions-'));
  try {
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'fixture-workspace', private: true }));
    await writeFile(join(directory, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n  - 'tools/*'\n");
    const manifests = [
      ['packages/runtime', { name: '@fixture/runtime', version: '1.2.3' }],
      ['tools/build', { name: '@fixture/build', version: '0.4.0', private: true }],
      ['outside/ignored', { name: '@fixture/ignored', version: '9.9.9' }],
    ];
    for (const [path, manifest] of manifests) {
      await mkdir(join(directory, path), { recursive: true });
      await writeFile(join(directory, path, 'package.json'), JSON.stringify(manifest));
    }
    assert.equal(existsSync(join(directory, 'node_modules')), false);
    const versions = loadWorkspacePackageVersions(directory);
    assert.deepEqual([...versions].sort(), [['@fixture/build', '0.4.0'], ['@fixture/runtime', '1.2.3']]);
    const source = {
      name: '@fixture/consumer',
      dependencies: { '@fixture/runtime': 'workspace:^' },
      devDependencies: { '@fixture/build': 'workspace:*' },
    };
    const packed = {
      dependencies: { '@fixture/runtime': '^1.2.3' },
      devDependencies: { '@fixture/build': '0.4.0' },
    };
    assert.doesNotThrow(() => assertPackedDependencyRanges(packed, source, versions));
    packed.devDependencies['@fixture/build'] = '0.5.0';
    assert.throws(() => assertPackedDependencyRanges(packed, source, versions), /devDependencies\.@fixture\/build must be 0\.4\.0/u);
    versions.delete('@fixture/build');
    assert.throws(() => assertPackedDependencyRanges(packed, source, versions), /missing workspace version for @fixture\/build/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('publication targets stay separate from private development version providers', async () => {
  const graph = await loadPublishedPackageGraph();
  const versions = loadWorkspacePackageVersions();
  assert.equal(versions.has('@sectile/tooling'), true);
  assert.equal(graph.byName.has('@sectile/tooling'), false);
  for (const { manifest } of graph.order) {
    assert.notEqual(manifest.private, true);
    assert.equal(versions.get(manifest.name), manifest.version);
  }
});
