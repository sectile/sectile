import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const vitePackageURL = new URL('../../packages/vue/node_modules/vite/package.json', import.meta.url);
const requireFromVite = createRequire(pathToFileURL(realpathSync(vitePackageURL)));
const { build: esbuild } = await import(pathToFileURL(requireFromVite.resolve('esbuild')).href);
const { build: viteBuild } = await import('../../packages/vue/node_modules/vite/dist/node/index.js');

export async function bundleFixture(repoRoot, fixture, bundler) {
  const source = fixtureSource(fixture);
  const report = bundler === 'esbuild'
    ? await bundleWithEsbuild(repoRoot, fixture, source)
    : bundler === 'vite'
      ? await bundleWithVite(repoRoot, fixture, source)
      : assert.fail(`unknown bundler ${bundler}`);
  const bytes = Buffer.from(report.code);
  return Object.freeze({
    id: fixture.id,
    bundler,
    mode: fixture.mode,
    source: fixture.source,
    exportName: fixture.exportName,
    platform: fixture.platform,
    raw: bytes.byteLength,
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotliCompressSync(bytes).byteLength,
    modules: Object.freeze([...new Set(report.modules.map((path) => normalizeModule(repoRoot, path)))].sort()),
    dependencies: Object.freeze([...new Set(report.dependencies)].sort()),
  });
}

export function deriveFixtures(fragments) {
  const fixtures = [];
  for (const fragment of fragments) {
    for (const surface of fragment.surfaces) {
      const source = packageSpecifier(fragment.package, surface.subpath);
      for (const mode of surface.fixtureModes) {
        const exportName = mode === 'root-named'
          ? surface.rootEquivalentExport
          : mode === 'named'
            ? representativeNamedExport(fragment.package, surface.subpath, surface)
            : null;
        fixtures.push(Object.freeze({
          id: `${fragment.package}:${surface.subpath}:${mode}`,
          package: fragment.package,
          subpath: surface.subpath,
          source: mode === 'root-named' ? `@sectile/${fragment.package}` : source,
          exportName,
          mode,
          platform: surface.platform,
          pair: mode === 'root-named' ? `${fragment.package}:${surface.subpath}:named` : null,
        }));
      }
    }
  }
  return Object.freeze(fixtures.sort((left, right) => left.id.localeCompare(right.id)));
}

function representativeNamedExport(packageName, subpath, surface) {
  const preferred = new Map([
    ['core:./index-span', 'createIndexSpanSet'],
    ['core:./selection-expression', 'createSelectionExpression'],
    ['core:./metric-index', 'createMetricIndex'],
    ['core:./geometry', 'intersectRects'],
    ['core:./anchored-layout', 'solveAnchoredLayout'],
    ['core:./color', 'srgbToOklch'],
    ['core:./color-text', 'parseColorText'],
    ['core:./range', 'createExactRatio'],
  ]).get(`${packageName}:${subpath}`);
  if (preferred !== undefined) {
    assert.ok(surface.runtimeExports.includes(preferred), `${packageName}:${subpath}: representative export missing`);
    return preferred;
  }
  return surface.rootEquivalentExport ?? surface.runtimeExports[0];
}

function fixtureSource(fixture) {
  if (fixture.mode === 'side-effect') return `import ${JSON.stringify(fixture.source)};`;
  if (fixture.mode === 'namespace') return `import * as value from ${JSON.stringify(fixture.source)}; globalThis.__sectileBundleSink = Object.keys(value);`;
  assert.equal(typeof fixture.exportName, 'string', `${fixture.id}: named fixture export required`);
  return `import { ${fixture.exportName} as value } from ${JSON.stringify(fixture.source)}; globalThis.__sectileBundleSink = value;`;
}

async function bundleWithEsbuild(repoRoot, fixture, source) {
  const result = await esbuild({
    stdin: { contents: source, loader: 'js', resolveDir: repoRoot, sourcefile: `fixture-${fixture.id}.mjs` },
    absWorkingDir: repoRoot,
    bundle: true,
    format: 'esm',
    platform: fixture.platform === 'node' ? 'node' : 'browser',
    target: 'es2022',
    minify: true,
    metafile: true,
    treeShaking: true,
    write: false,
    external: ['vue', 'node:*'],
    logLevel: 'silent',
  });
  const output = result.outputFiles.find(({ path }) => path.endsWith('<stdout>')) ?? result.outputFiles[0];
  assert.ok(output !== undefined, `${fixture.id}: esbuild output missing`);
  const modules = [];
  for (const outputMetadata of Object.values(result.metafile.outputs)) {
    for (const [path, input] of Object.entries(outputMetadata.inputs ?? {})) {
      if ((input.bytesInOutput ?? 0) > 0) modules.push(path);
    }
  }
  const dependencies = Object.values(result.metafile.outputs)
    .flatMap(({ imports = [] }) => imports)
    .filter(({ external }) => external)
    .map(({ path }) => dependencyName(path));
  return { code: output.text.trim(), modules, dependencies };
}

async function bundleWithVite(repoRoot, fixture, source) {
  const virtualID = `\0sectile-fixture:${fixture.id}`;
  const result = await viteBuild({
    configFile: false,
    root: repoRoot,
    logLevel: 'silent',
    plugins: [{
      name: 'sectile-consumer-fixture',
      resolveId(id) { return id === virtualID.slice(1) ? virtualID : null; },
      load(id) { return id === virtualID ? source : null; },
    }],
    build: {
      write: false,
      minify: 'esbuild',
      target: 'es2022',
      rollupOptions: {
        input: virtualID.slice(1),
        external: ['vue', /^node:/u],
        treeshake: true,
        onwarn(warning, warn) {
          if (warning.code !== 'EMPTY_BUNDLE') warn(warning);
        },
        output: { format: 'es', entryFileNames: 'fixture.js' },
      },
    },
  });
  assert.ok(!Array.isArray(result), `${fixture.id}: unexpected multiple Vite outputs`);
  const chunks = result.output.filter((entry) => entry.type === 'chunk');
  const code = chunks.map(({ code: chunkCode }) => chunkCode.trim()).filter(Boolean).join('\n');
  const modules = chunks.flatMap(({ modules: chunkModules }) => Object.entries(chunkModules)
    .filter(([, metadata]) => (metadata.renderedLength ?? 0) > 0)
    .map(([path]) => path));
  const dependencies = chunks.flatMap(({ imports }) => imports)
    .filter((path) => !chunks.some(({ fileName }) => fileName === path))
    .map(dependencyName);
  return { code, modules, dependencies };
}

function normalizeModule(repoRoot, path) {
  const normalized = path.replaceAll('\\', '/');
  const root = repoRoot.replaceAll('\\', '/').replace(/\/$/u, '');
  const relative = normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
  const workspace = relative.match(/^packages\/([^/]+)\/(.*)$/u);
  if (workspace !== null) return `@sectile/${workspace[1]}/${workspace[2]}`;
  const dependency = dependencyName(relative);
  if (relative.includes('node_modules/')) return `dependency:${dependency}`;
  if (relative.includes('sectile-fixture') || relative.includes('fixture-')) return 'fixture';
  return relative;
}

function dependencyName(path) {
  if (path.startsWith('node:')) return path;
  const normalized = path.replaceAll('\\', '/');
  const marker = normalized.lastIndexOf('/node_modules/');
  const specifier = marker >= 0 ? normalized.slice(marker + '/node_modules/'.length) : normalized;
  const parts = specifier.split('/');
  return parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function packageSpecifier(packageName, subpath) {
  return subpath === '.' ? `@sectile/${packageName}` : `@sectile/${packageName}/${subpath.slice(2)}`;
}
