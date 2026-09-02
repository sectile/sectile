import { verifyReproducibleBuild } from '../../../scripts/lib/reproducible-build.mjs';

await verifyReproducibleBuild(new URL('../', import.meta.url));
