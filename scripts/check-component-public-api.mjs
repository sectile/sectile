import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  checkComponentPackageModel,
  validateComponentPublicApiManifest,
} from './lib/component-public-api.mjs';

const manifest = validateComponentPublicApiManifest(
  JSON.parse(await readFile('verification/component-public-api.json', 'utf8')),
);
const familyArgument = process.argv.find((argument) => argument.startsWith('--family='));
const requestedFamily = familyArgument?.slice('--family='.length);
const families = requestedFamily === undefined ? Object.keys(manifest.families) : [requestedFamily];
for (const family of families) assert.ok(manifest.families[family] !== undefined, `Unknown family ${family}.`);

for (const family of families) {
  for (const packageName of ['core', 'dom', 'terminal', 'vue']) {
    const packageRoot = resolve('packages', packageName);
    const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
    const contract = manifest.families[family][packageName];
    const target = packageJson.exports?.[contract.subpath];
    assert.ok(target !== undefined, `${packageName}/${family}: package subpath missing.`);
    assert.deepEqual(Object.keys(target).sort(), ['default', 'import', 'types'], `${packageName}/${family}: export conditions must be exact.`);
    const expectedBase = `./dist/${family}`;
    assert.equal(target.types, `${expectedBase}.d.ts`, `${packageName}/${family}: declaration target mismatch.`);
    assert.equal(target.import, `${expectedBase}.js`, `${packageName}/${family}: runtime target mismatch.`);
    assert.equal(target.default, `${expectedBase}.js`, `${packageName}/${family}: default condition target mismatch.`);

    const [module, rootModule, declaration, rootDeclaration] = await Promise.all([
      import(pathToFileURL(resolve(packageRoot, target.import)).href),
      import(pathToFileURL(resolve(packageRoot, packageJson.exports['.'].import)).href),
      readFile(resolve(packageRoot, target.types), 'utf8'),
      readFile(resolve(packageRoot, packageJson.exports['.'].types), 'utf8'),
    ]);
    const declarationModel = declarationExports(declaration);
    const rootDeclarationModel = declarationExports(rootDeclaration);
    const issues = checkComponentPackageModel(contract, {
      subpath: contract.subpath,
      runtime: Object.keys(module).sort(),
      types: declarationModel.names.filter((name) => !Object.hasOwn(module, name)).sort(),
      rootExports: [...new Set([...Object.keys(rootModule), ...rootDeclarationModel.names])],
      imports: declarationModel.imports,
      forbiddenImports: manifest.forbiddenImports[packageName],
      hasDefault: declarationModel.hasDefault || Object.hasOwn(module, 'default'),
      hasWildcard: declarationModel.hasWildcard,
    });
    assert.deepEqual(issues, [], `${packageName}/${family}: public API mismatch.\n${issues.join('\n')}`);
  }
}

console.log(`component public API passed: ${families.join(', ')}`);

function declarationExports(source) {
  const names = [];
  for (const match of source.matchAll(/export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gu)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  for (const match of source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"]/gu)) {
    for (const raw of (match[1] ?? '').split(',')) {
      const entry = raw.trim().replace(/^type\s+/u, '');
      if (entry.length === 0) continue;
      names.push((entry.split(/\s+as\s+/u)[1] ?? entry.split(/\s+as\s+/u)[0]).trim());
    }
  }
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/gu)]
    .map((match) => match[1])
    .filter((value) => value !== undefined);
  return {
    names: [...new Set(names)].sort(),
    imports,
    hasDefault: /export\s+default\b|export\s*\{[^}]*\bdefault\b/gu.test(source),
    hasWildcard: /export\s*\*/gu.test(source),
  };
}
