# Package boundary

The pnpm workspace contains the published libraries `@sectile/core`, `@sectile/temporal`, `@sectile/virtual`, `@sectile/dom`, `@sectile/terminal`, and `@sectile/vue`, plus the documentation site. Every workspace project owns its source, build, tests, package contract, and project-specific verification. The repository root only orchestrates recursive project commands, validates workspace boundaries, checks repository documentation, and runs cross-package tests.

Workspace projects may depend on another package only through a declared `workspace:*` dependency and an exported package-name subpath. Relative imports that escape a project, direct imports from another package's `src`, `dist`, or `.verification-dist`, and project scripts that reach into another project are rejected by the workspace boundary gate. This applies equally to libraries under `packages/*` and the documentation site.

For `@sectile/core`, production build input is `src/**/*.ts` excluding `src/internal/reference/**/*.ts`. Public structures live under `src/structures`; promoted composites, text, and revision use public facade files under `src`; state utilities, the editing implementation behind the text facade, reference models, and kernel mechanisms remain non-exported. Verification build input includes mirrored reference models and emits to `.verification-dist`, which is never packaged. `@sectile/temporal` owns civil date and wall-clock semantics. `@sectile/virtual` owns extent indexing and layout engines. Both depend only on exported Core subpaths and package only their own `dist` output. `@sectile/dom/virtual` may consume those exported layout contracts to own browser measurement and scheduling, but `@sectile/virtual` never depends back on a host package.

Recurring verification requires these canonical exports:

```text
.
./sequence
./range
./grid
./tree
./result
./adapter-runtime
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

The check is additive: it verifies that these required entries exist and resolve to their expected production files. It does not treat every additional export as a regression.

The root runtime must remain empty. Consumer import checks execute the required canonical subpaths through Node package resolution and compile a separate strict TypeScript project against the emitted declarations.

Every published package fingerprints its exported subpaths and complete public declaration closure, so a type-surface or export-map change cannot pass as incidental implementation work. Core additionally applies the semantic API gate: subpath additions are minor, export or error-code removals are breaking, new error codes require contract-impact review, and changed declarations require widening/addition versus narrowing/removal analysis. High-impact defaults are tied to exact source evidence; changing one is semantic breaking even when its TypeScript signature is unchanged. Updating a declaration baseline is explicit for each affected package; updating the Core semantic baseline also requires a classification and reason.

The core package footprint gate rejects reference files and applies separate byte ceilings to JavaScript, declarations, source maps, and the complete package. This keeps runtime growth visible without treating optional debugging metadata as runtime code. DOM and terminal code are emitted only by their own packages.

`@sectile/core/adapter-runtime` owns host-independent controller revision, reconciliation, notification, command projection, facade, and destruction behavior. Its public `createHostAdapter` contract connects deterministic host decoding to semantic reduction and projected effects without executing platform work. DOM and terminal packages retain host input decoding, listener lifecycle, and effect execution. Host state equality is semantic and component-specific; adapter runtime code must not serialize arbitrary state to compare it.

Node-specific terminal integration is isolated behind `@sectile/terminal/node`; importing the terminal package root or another terminal subpath does not load `node:*` modules. Portable terminal keyboard and layout helpers remain separate exported subpaths so browser terminals can provide their own byte source while sharing normalized adapter input.

`@sectile/vue` depends on exported `@sectile/dom` projections rather than importing core implementation files or mutating elements after mount. Vue components own reactivity, lifecycle, compound-part context, and rendering. ARIA state, host event normalization, interaction semantics, and virtual scroll scheduling remain in `@sectile/dom`; aesthetic styling remains with the consumer. `@sectile/vue/virtual` renders only a layout plan and composes with existing semantic parts instead of moving collection state into the framework adapter. Its collection, popup, geometry, text, form, SSR/hydration, and dynamic-domain witnesses establish the public framework contract. Component export parity and family evidence are release gates rather than best-effort wrapper coverage.
