# Package boundary

The pnpm workspace contains the published-library candidates `@sectile/primitives`, `@sectile/dom`, and `@sectile/terminal`, plus independent private projects under `playgrounds/*`. Every workspace project owns its source, build, tests, package contract, and project-specific verification. The repository root only orchestrates recursive project commands, validates workspace boundaries, checks repository documentation, and runs cross-package tests.

Workspace projects may depend on another package only through a declared `workspace:*` dependency and an exported package-name subpath. Relative imports that escape a project, direct imports from another package's `src`, `dist`, or `.verification-dist`, and project scripts that reach into another project are rejected by the workspace boundary gate. This applies equally to libraries under `packages/*` and adapter examples under `playgrounds/*`.

For `@sectile/primitives`, production build input is `src/**/*.ts` excluding `src/internal/reference/**/*.ts`. Public structures live under `src/structures`; promoted composites, text, and revision use public facade files under `src`; state utilities, the editing implementation behind the text facade, reference models, and kernel mechanisms remain non-exported. Verification build input includes mirrored reference models and emits to `.verification-dist`, which is never packaged.

Recurring verification requires these canonical exports:

```text
.
./sequence
./range
./grid
./tree
./result
./listbox
./calendar
./combobox
./slider
./tree-view
./tree-grid
./revision
./text
./package.json
```

The check is additive: it verifies that these required entries exist and resolve to their expected production files. It does not treat every additional export as a regression. The absence of the pre-migration names was checked when the migration was performed; it is not maintained as a permanent blacklist.

The root runtime must remain empty. Consumer import checks execute the required canonical subpaths through Node package resolution and compile a separate strict TypeScript project against the emitted declarations.

The primitives package footprint gate rejects reference files and applies separate byte ceilings to JavaScript, declarations, source maps, and the complete package. This keeps runtime growth visible without treating optional debugging metadata as runtime code. DOM and terminal code are emitted only by their own packages.

Node-specific terminal integration is isolated behind `@sectile/terminal/node`; importing the terminal package root or another terminal subpath does not load `node:*` modules. Portable terminal keyboard and layout helpers remain separate exported subpaths so browser terminals can provide their own byte source while sharing normalized adapter input.
