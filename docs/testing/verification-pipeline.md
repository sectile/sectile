# Verification pipeline

The default `npm run verify` gate performs:

1. strict TypeScript type checking;
2. reference law suites and 2,000-model differential tests for structures and internal state theories;
3. production build;
4. source/required-public-surface/declaration/law/document checks;
5. renderer-neutral output inspection;
6. runtime and type-consumer subpath imports;
7. package footprint validation;
8. deterministic implementation verifier replay.

`npm run verify:theory` reruns the Python theory model checker and compares exact output bytes. `npm run verify:reproducible-build` performs two clean production builds and compares a path-sensitive SHA-256 fingerprint.

The law registry contains all 37 currently public structure laws. Each law has an evidence file, and the optimized implementation has a separate differential evidence file.

Migration-only facts, such as the one-time removal of historical subpaths, are not encoded as permanent negative regression checks.
