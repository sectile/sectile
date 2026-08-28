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
const packageArgument = process.argv.find((argument) => argument.startsWith('--package='));
const requestedPackage = packageArgument?.slice('--package='.length);
const supportedPackages = ['core', 'dom', 'terminal', 'vue'];
const packageNames = requestedPackage === undefined ? supportedPackages : [requestedPackage];
for (const packageName of packageNames) {
  assert.ok(supportedPackages.includes(packageName), `Unknown package ${packageName}.`);
}

for (const family of families) {
  for (const packageName of packageNames) {
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

for (const [profile, profileContract] of Object.entries(manifest.profiles ?? {})) {
  const expectedPackages = ['dom', 'tabular', 'vue'];
  assert.deepEqual(Object.keys(profileContract).sort(), expectedPackages,
    `${profile}: package contracts must be exact.`);
  for (const packageName of expectedPackages) {
    const packageRoot = resolve('packages', packageName);
    const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
    const subpath = packageName === 'tabular' ? `./${profile}` : './tabular';
    const target = packageJson.exports?.[subpath];
    assert.ok(target !== undefined, `${packageName}/${profile}: package subpath missing.`);
    assert.deepEqual(Object.keys(target).sort(), ['default', 'import', 'types'],
      `${packageName}/${profile}: export conditions must be exact.`);
    const expectedBase = packageName === 'tabular' ? `./dist/${profile}` : './dist/tabular';
    assert.deepEqual(target, { types: `${expectedBase}.d.ts`, import: `${expectedBase}.js`, default: `${expectedBase}.js` });
    const [module, rootModule, declaration, rootDeclaration] = await Promise.all([
      import(pathToFileURL(resolve(packageRoot, target.import)).href),
      import(pathToFileURL(resolve(packageRoot, packageJson.exports['.'].import)).href),
      readFile(resolve(packageRoot, target.types), 'utf8'),
      readFile(resolve(packageRoot, packageJson.exports['.'].types), 'utf8'),
    ]);
    const declarationModel = declarationExports(declaration);
    const rootNames = new Set([...Object.keys(rootModule), ...declarationExports(rootDeclaration).names]);
    const publicNames = new Set([...Object.keys(module), ...declarationModel.names]);
    assert.ok(publicNames.size > 0, `${packageName}/${profile}: public API must not be empty.`);
    const rootPolicy = profileContract[packageName].root;
    assert.equal(typeof rootPolicy, 'boolean', `${packageName}/${profile}: root policy required.`);
    for (const name of Object.keys(module)) assert.equal(rootNames.has(name), rootPolicy,
      `${packageName}/${profile}: root export ${rootPolicy ? 'missing' : 'forbidden'} ${name}.`);
    assert.equal(declarationModel.hasDefault, false, `${packageName}/${profile}: default export is forbidden.`);
    assert.equal(declarationModel.hasWildcard, packageName !== 'tabular',
      `${packageName}/${profile}: aggregate hosts use wildcard re-exports; the core profile does not.`);
    const allowedImports = new Set(profileContract[packageName].imports);
    for (const specifier of declarationModel.imports) {
      assert.equal(!specifier.startsWith('.') && (specifier.includes('/src/') || specifier.includes('/internal/')), false,
        `${packageName}/${profile}: deep import forbidden: ${specifier}`);
      if (!specifier.startsWith('.')) assert.ok(allowedImports.has(specifier),
        `${packageName}/${profile}: undeclared declaration import ${specifier}.`);
    }
  }
  const terminal = JSON.parse(await readFile('packages/terminal/package.json', 'utf8'));
  assert.equal(terminal.exports?.[`./${profile}`], undefined,
    `${profile}: terminal projection is intentionally unsupported.`);
}

function declarationExports(source) {
  const names = [];
  for (const match of source.matchAll(/export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gu)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  for (const match of source.matchAll(/export\s*(?:type\s*)?\{([\s\S]*?)\}\s*from\s*['"][^'"]+['"]/gu)) {
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
