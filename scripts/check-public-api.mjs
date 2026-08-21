import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
const packageJson = JSON.parse(await readFile('packages/primitives/package.json', 'utf8'));
const exportsMap = packageJson.exports;

assert.equal(packageJson.name, contract.package);
assert.equal(typeof exportsMap, 'object');
assert.notEqual(exportsMap, null);

for (const subpath of contract.requiredSubpaths) {
  assert.equal(
    Object.hasOwn(exportsMap, subpath),
    true,
    `missing required public subpath ${subpath}`,
  );
}

assert.deepEqual(exportsMap['.'], {
  types: './dist/index.d.ts',
  import: './dist/index.js',
  default: './dist/index.js',
});
assert.equal(exportsMap['./package.json'], './package.json');

for (const subpath of contract.requiredRuntimeSubpaths) {
  const name = subpath.slice(2);
  assert.deepEqual(exportsMap[subpath], {
    types: `./dist/${name}.d.ts`,
    import: `./dist/${name}.js`,
    default: `./dist/${name}.js`,
  });
}

console.log(JSON.stringify({
  status: 'passed',
  package: 'primitives',
  requiredSubpaths: contract.requiredSubpaths.length,
  actualSubpaths: Object.keys(exportsMap).length,
}, null, 2));
