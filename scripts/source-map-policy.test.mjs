import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSourceMapReport, validateSourceMapFiles } from './lib/source-map-policy.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { compactJavaScriptModule } from '../tools/tooling/compact-javascript.mjs';

test('JavaScript compaction retains full legal notices and pure annotations with adjacent maps', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sectile-legal-'));
  const notice = '/*!\nCopyright fixture contributors.\nPermission to redistribute this fixture.\n*/';
  try {
    for (const annotated of [false, true]) {
      const path = join(directory, 'fixture.js');
      await writeFile(path, `${notice}\nexport const value = ${annotated ? '/* @__PURE__ */ Object.freeze({})' : '{}'};\n//# sourceMappingURL=fixture.js.map\n`);
      await writeFile(path + '.map', JSON.stringify({ version: 3, file: 'fixture.js', sources: ['fixture.js'], names: [], mappings: ';;;;AAAA' }));
      await compactJavaScriptModule(path);
      const code = await readFile(path, 'utf8');
      assert.ok(code.replace(/\s+/gu, ' ').includes(notice.replace(/\s+/gu, ' ')));
      if (annotated) assert.ok(code.includes('@__PURE__'));
      const map = JSON.parse(await readFile(path + '.map', 'utf8'));
      assert.deepEqual(map.sources, ['fixture.js']);
      assert.equal(map.file, 'fixture.js');
      assert.match(code, /sourceMappingURL=fixture.js.map/u);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

const valid = () => new Map([
  ['dist/index.js', 'export {};\n//# sourceMappingURL=index.js.map\n'],
  ['dist/index.js.map', JSON.stringify({ version: 3, file: 'index.js', sourceRoot: '', sources: ['../src/index.ts'], names: [], mappings: '' })],
  ['dist/index.d.ts', 'export {};\n'],
]);

test('source-map checks require exact package coverage without duplicates', () => {
  const entry = { package: 'fixture', declarationMapFiles: 0, packed: { tarballBytes: 100, unpackedBytes: 100 } };
  const baseline = { schemaVersion: 1, packages: [entry] };
  assert.doesNotThrow(() => validateSourceMapReport(structuredClone(baseline), baseline));
  for (const packages of [[], [entry, entry], [{ ...entry, package: 'unexpected' }]]) {
    assert.throws(() => validateSourceMapReport({ schemaVersion: 1, packages }, baseline), /package coverage/u);
  }
  assert.throws(() => validateSourceMapReport(baseline, { schemaVersion: 1, packages: [entry, entry] }), /duplicate source-map baseline/u);
  const current = structuredClone(baseline);
  current.packages[0].packed = { tarballBytes: 1_000_000, unpackedBytes: 1_000_000 };
  assert.doesNotThrow(() => validateSourceMapReport(current, baseline));
});

test('external JavaScript maps without embedded sources pass', () => {
  assert.deepEqual(validateSourceMapFiles(valid()), {
    javascriptFiles: 1,
    declarationFiles: 1,
    sourceMapFiles: 1,
    declarationMapFiles: 0,
  });
});

test('CSS maps resolve to shipped sources and reject dangling, orphan and private inputs', () => {
  const data = valid();
  data.set('dist/default.css', '.a{}\n/*# sourceMappingURL=default.css.map */');
  data.set('dist/default.source.css', '.a {}');
  data.set('dist/default.css.map', JSON.stringify({ version: 3, file: 'default.css', sources: ['default.source.css'], names: [], mappings: '' }));
  assert.equal(validateSourceMapFiles(data).cssSourceMapFiles, 1);
  const missing = new Map(data); missing.delete('dist/default.source.css');
  assert.throws(() => validateSourceMapFiles(missing), /CSS source must be shipped/u);
  const orphan = new Map(data); orphan.delete('dist/default.css');
  assert.throws(() => validateSourceMapFiles(orphan), /every CSS map/u);
  const dangling = new Map(data); dangling.delete('dist/default.css.map');
  assert.throws(() => validateSourceMapFiles(dangling), /dangling CSS/u);
  const inline = new Map(data); inline.set('dist/default.css', '/*# sourceMappingURL=data:application/json;base64,e30= */');
  assert.throws(() => validateSourceMapFiles(inline), /CSS map must be adjacent/u);
  const privateSource = new Map(data); privateSource.set('dist/default.css.map', JSON.stringify({ version: 3, file: 'default.css', sources: ['/private/source.css'] }));
  assert.throws(() => validateSourceMapFiles(privateSource), /private or URL source path/u);
});

test('intentional unmapped, inline, dangling, declaration-map, and sourcesContent fixtures fail', () => {
  const unmapped = valid(); unmapped.set('dist/index.js', 'export {};\n');
  assert.throws(() => validateSourceMapFiles(unmapped), /exactly one external/u);
  const inline = valid(); inline.set('dist/index.js', 'export {};\n//# sourceMappingURL=data:application\/json;base64,e30=\n');
  assert.throws(() => validateSourceMapFiles(inline), /inline source maps/u);
  const dangling = valid(); dangling.delete('dist/index.js.map');
  assert.throws(() => validateSourceMapFiles(dangling), /dangling sourceMappingURL/u);
  const declarations = valid(); declarations.set('dist/index.d.ts.map', '{}');
  assert.throws(() => validateSourceMapFiles(declarations), /declaration maps/u);
  const staleDeclaration = valid(); staleDeclaration.set('dist/index.d.ts', 'export {};\n//# sourceMappingURL=index.d.ts.map\n');
  assert.throws(() => validateSourceMapFiles(staleDeclaration), /stale declaration-map/u);
  const embedded = valid(); embedded.set('dist/index.js.map', JSON.stringify({ version: 3, file: 'index.js', sources: ['../src/index.ts'], sourcesContent: [''], names: [], mappings: '' }));
  assert.throws(() => validateSourceMapFiles(embedded), /sourcesContent/u);
  const privatePath = valid(); privatePath.set('dist/index.js.map', JSON.stringify({ version: 3, file: 'index.js', sources: ['/Users/private/src/index.ts'], names: [], mappings: '' }));
  assert.throws(() => validateSourceMapFiles(privatePath), /private or URL source path/u);
});
