import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
import { transform } from 'esbuild';

const mode = process.argv[2] ?? 'production';
if (mode !== 'production' && mode !== 'verification') throw new Error(`Unknown build mode: ${mode}`);
await rm(mode === 'verification' ? '.verification-dist' : 'dist', { recursive: true, force: true });
const result = spawnSync('tsc', [
  '--project',
  mode === 'verification' ? 'tsconfig.verify-build.json' : 'tsconfig.build.json',
  '--pretty',
  'false',
], { encoding: 'utf8', stdio: 'inherit' });
if (result.error !== undefined) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (mode === 'production') await compactJavaScript('dist');

async function compactJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await compactJavaScript(path);
      continue;
    }
    if (!entry.isFile() || !path.endsWith('.js')) continue;
    const mapPath = `${path}.map`;
    const sourceMap = await readFile(mapPath, 'utf8');
    const source = (await readFile(path, 'utf8')).replace(
      /\/\/# sourceMappingURL=.*$/u,
      `//# sourceMappingURL=data:application/json;base64,${Buffer.from(sourceMap).toString('base64')}`,
    );
    const compacted = await transform(source, {
      loader: 'js',
      format: 'esm',
      target: 'es2022',
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: true,
      sourcemap: 'external',
      sourcefile: basename(path),
      sourcesContent: false,
    });
    const outputMap = JSON.parse(compacted.map);
    if (outputMap.sources.length === 0) continue;
    outputMap.file = basename(path);
    await writeFile(path, `${compacted.code}//# sourceMappingURL=${basename(mapPath)}\n`);
    await writeFile(mapPath, JSON.stringify(outputMap));
  }
}
