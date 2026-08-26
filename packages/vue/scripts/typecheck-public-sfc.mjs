import { createRequire } from 'node:module';
import { run } from 'vue-tsc';

const require = createRequire(import.meta.url);

// vue-tsc does not yet load TypeScript 7's exported compiler entry point.
// Keep the package source on TypeScript 7 while checking SFC consumers with
// the explicitly pinned compatible compiler.
run(require.resolve('typescript-sfc/lib/tsc'));
