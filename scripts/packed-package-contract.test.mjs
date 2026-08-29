import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

test('rejects manifest drift and tarball paths outside package/', () => {
  const { manifest, sourceManifest } = fixture();
  manifest.exports['.'].import = './dist/other.js';
  assert.throws(() => assertPackedManifestMatchesSource(manifest, sourceManifest), /packed exports differs/u);
  assert.throws(() => validateTarballEntries(['package/package.json', '../escape']), /must stay under package/u);
  assert.throws(() => validateTarballEntries(['package/package.json', 'package/../escape']), /parent traversal/u);
});
