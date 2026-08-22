import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
const exportsMap = packageJSON.exports;

assert.equal(packageJSON.name, contract.package);
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

for (const [subpath, target] of Object.entries(contract.runtimeTargets)) {
  assert.deepEqual(exportsMap[subpath], {
    types: `./dist/${target}.d.ts`,
    import: `./dist/${target}.js`,
    default: `./dist/${target}.js`,
  });
}

console.log(JSON.stringify({
  status: 'passed',
  package: 'core',
  requiredSubpaths: contract.requiredSubpaths.length,
  actualSubpaths: Object.keys(exportsMap).length,
}, null, 2));
