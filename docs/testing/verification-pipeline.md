# Verification pipeline

The default `pnpm verify` gate first runs each package's own `verify` script in dependency order, then performs cross-package adapter equivalence, workspace-boundary, component-completeness, and repository-documentation checks. Package-level gates perform:

1. strict TypeScript type checking;
2. reference law suites and 2,000-model differential tests for structures and internal state theories;
3. production build;
4. source/required-public-surface/declaration/law/document checks;
5. renderer-neutral output inspection;
6. runtime and type-consumer subpath imports;
7. package footprint validation;
8. deterministic implementation verifier replay.

`pnpm verify:theory` delegates to the package that owns the Python theory model. `pnpm verify:reproducible-build` delegates reproducibility checks to every package that declares one. The DOM and terminal packages test their host mappings independently; the root cross-host suite compares 160,000 operations through their exported package subpaths.

The law registry contains all 37 currently public structure laws. Each law has an evidence file, and the optimized implementation has a separate differential evidence file.

Migration-only facts, such as the one-time removal of historical subpaths, are not encoded as permanent negative regression checks.

The component-completeness check is a ratchet. It requires export parity across
`@sectile/primitives`, `@sectile/dom`, and `@sectile/terminal`, plus one audited entry for
every public component. Existing incomplete areas are listed as migration gaps; new public
components cannot add such gaps.
