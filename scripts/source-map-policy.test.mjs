import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSourceMapFiles } from './lib/source-map-policy.mjs';

const valid = () => new Map([
  ['dist/index.js', 'export {};\n//# sourceMappingURL=index.js.map\n'],
  ['dist/index.js.map', JSON.stringify({ version: 3, file: 'index.js', sourceRoot: '', sources: ['../src/index.ts'], names: [], mappings: '' })],
  ['dist/index.d.ts', 'export {};\n'],
]);

test('external JavaScript maps without embedded sources pass', () => {
  assert.deepEqual(validateSourceMapFiles(valid()), {
    javascriptFiles: 1,
    declarationFiles: 1,
    sourceMapFiles: 1,
    declarationMapFiles: 0,
  });
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
});
