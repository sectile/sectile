import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { transform } from 'esbuild';
import { minify } from 'terser';

export async function compactJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await compactJavaScript(path);
      continue;
    }
    if (!entry.isFile() || !path.endsWith('.js')) continue;

    const mapPath = `${path}.map`;
    const sourceMap = await readFile(mapPath, 'utf8');
    if (JSON.parse(sourceMap).sources.length === 0) continue;
    const file = basename(path);
    const source = await readFile(path, 'utf8');
    // Esbuild consumes pure annotations during whitespace minification. Keep
    // those modules on Terser so downstream bundlers retain tree-shaking proof.
    const compacted = source.includes('@__PURE__')
      ? await compactAnnotatedJavaScript(source, sourceMap, file, basename(mapPath))
      : await compactPlainJavaScript(source, sourceMap, file, basename(mapPath));
    if (compacted.map.sources.length === 0) continue;
    await writeFile(path, compacted.code);
    await writeFile(mapPath, JSON.stringify(compacted.map));
  }
}

async function compactAnnotatedJavaScript(source, sourceMap, file, mapFile) {
  const compacted = await minify({ [file]: source.replace(/\/\/# sourceMappingURL=.*$/u, '') }, {
    compress: false,
    ecma: 2022,
    mangle: false,
    module: true,
    format: {
      comments: false,
      keep_numbers: true,
      preserve_annotations: true,
      quote_style: 3,
    },
    sourceMap: {
      asObject: true,
      content: sourceMap,
      filename: file,
      url: mapFile,
    },
  });
  if (compacted.code === undefined || compacted.map === undefined) {
    throw new Error(`JavaScript compaction produced no output: ${file}`);
  }
  return { code: `${compacted.code}\n`, map: compacted.map };
}

async function compactPlainJavaScript(source, sourceMap, file, mapFile) {
  const embeddedSourceMap = `//# sourceMappingURL=data:application/json;base64,${Buffer.from(sourceMap).toString('base64')}`;
  const compacted = await transform(source.replace(/\/\/# sourceMappingURL=.*$/u, embeddedSourceMap), {
    loader: 'js',
    format: 'esm',
    target: 'es2022',
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: true,
    sourcemap: 'external',
    sourcefile: file,
    sourcesContent: false,
  });
  const map = JSON.parse(compacted.map);
  map.file = file;
  return { code: `${compacted.code}//# sourceMappingURL=${mapFile}\n`, map };
}
