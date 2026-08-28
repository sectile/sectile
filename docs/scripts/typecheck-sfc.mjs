import { createRequire } from 'node:module';
import { run } from 'vue-tsc';

const require = createRequire(import.meta.url);

// Keep the docs Compiler API on stock TypeScript 6 and inject TNB only into vue-tsc.
run(require.resolve('typescript-sfc/lib/tsc'));
