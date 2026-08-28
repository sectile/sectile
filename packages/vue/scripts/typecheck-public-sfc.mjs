import { createRequire } from 'node:module';
import { run } from 'vue-tsc';

const require = createRequire(import.meta.url);

// Keep native TypeScript 7 for tsc and inject TNB only into vue-tsc.
run(require.resolve('typescript-sfc/lib/tsc'));
