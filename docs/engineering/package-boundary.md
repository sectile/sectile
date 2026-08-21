# Package boundary

The pnpm workspace contains `@sectile/primitives`, `@sectile/dom`, and `@sectile/terminal`. Every package owns its source, build, tests, package contract, and package-specific verification. The repository root only orchestrates recursive package commands, validates workspace boundaries, checks repository documentation, and runs cross-package tests.

Workspace packages may depend on another package only through a declared `workspace:*` dependency and an exported package-name subpath. Relative imports that escape a package, direct imports from another package's `src`, `dist`, or `.verification-dist`, and package scripts that reach into another package are rejected by the workspace boundary gate.

For `@sectile/primitives`, production build input is `src/**/*.ts` excluding `src/internal/reference/**/*.ts`. Public structures live under `src/structures`; listbox and revision use stable public facades; internal state, editing, remaining composites, and kernel mechanisms remain non-exported. Verification build input includes mirrored reference models and emits to `.verification-dist`, which is never packaged.

Recurring verification requires these canonical exports:

```text
.
./sequence
./range
./grid
./tree
./listbox
./calendar
./combobox
./slider
./tree-view
./revision
./package.json
```

The check is additive: it verifies that these required entries exist and resolve to their expected production files. It does not treat every additional export as a regression. The absence of the pre-migration names was checked when the migration was performed; it is not maintained as a permanent blacklist.

The root runtime must remain empty. Consumer import checks execute the required canonical subpaths through Node package resolution and compile a separate strict TypeScript project against the emitted declarations.

The primitives package footprint gate rejects reference files and output larger than 250 KB. DOM and terminal code are emitted only by their own packages.
