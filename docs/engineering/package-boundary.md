# Package boundary

## November 2026 atomic reorder

Atomic reorder adds cohort admission, destination preview, and a single batch
commit shared by DOM and Vue. The Core transition keeps policy checks and tree
cycle admission in the same owner. The DOM preview checks only the selected
cohort against existing tree indexes. Replaying individual moves would expose
intermediate orders and repeat tree construction. A separate batch entry point
would also require consumers to choose a different control for the same gesture.

The direct and root named Reorder fixtures use updated budgets. These are the
direct fixture measurements and raw byte ceilings for both bundlers.

| Fixture | Raw / gzip / Brotli bytes | Raw ceiling |
| --- | --- | --- |
| DOM esbuild | 49,923 / 14,343 / 12,902 → 53,855 / 15,364 / 13,830 | 52,436 → 56,564 |
| DOM Vite | 50,448 / 14,387 / 12,951 → 54,454 / 15,413 / 13,886 | 52,987 → 57,193 |
| Vue esbuild | 61,956 / 18,363 / 16,489 → 65,968 / 19,417 / 17,454 | 65,070 → 69,283 |
| Vue Vite | 61,938 / 18,125 / 16,349 → 66,027 / 19,185 / 17,321 | 65,051 → 69,345 |

The root fixtures use their own measured compression results. All eight fixture
results retain their dependency closure. Unused Reorder imports erase on both
bundlers, and all nine packages fit the existing install ceilings.

## November 2026 remote selection and temporal formats

Remote group selection raises the Tabular JavaScript ceiling from 165,000 to
174,000 bytes. The previous install baseline contained 161,497 JavaScript bytes.
The build measures 173,253 bytes and leaves 747 bytes below the new ceiling. The
versioned group contract, stale response checks, bounded delta application, and
query-scope reconciliation account for the added runtime. The implementation
uses the existing Core selection algebra and accepts only changed IDs from the
adapter, so the host retains neither the remote membership list nor a second
selection index.

The measured Tabular payload grows from 322,764 to 346,947 bytes, including
declarations and source maps. Its packed tarball grows from 70,916 to 76,197
bytes. The existing 5% allowance and 32-byte margin give a replacement payload
ceiling of 364,327 bytes, up from 338,935. The absolute declaration and source-map
ceilings continue to apply. The isolated npm and pnpm runs used the candidate
tarballs and reported the same dependency names as the existing baseline.

The focused named imports below exceeded the existing bundle allowances.
The measurements are raw, gzip, and Brotli bytes, respectively.

| Entry point | esbuild before → after | Vite before → after |
| --- | --- | --- |
| DOM Tabular | 28,871 / 8,665 / 7,809 → 30,447 / 9,136 / 8,256 | 28,548 / 8,490 / 7,647 → 30,038 / 8,930 / 8,063 |
| Tabular DataTable | 33,619 / 8,801 / 7,883 → 39,184 / 10,067 / 9,028 | 33,539 / 8,754 / 7,828 → 39,162 / 10,028 / 8,983 |
| Vue DataTable | 37,570 / 11,534 / 10,430 → 39,689 / 12,160 / 11,018 | 36,723 / 11,145 / 10,087 → 38,759 / 11,751 / 10,633 |
| Vue DataTreeGrid | 44,929 / 13,344 / 12,074 → 47,073 / 13,976 / 12,697 | 44,137 / 12,945 / 11,714 → 46,202 / 13,569 / 12,320 |
| Vue DateTimePicker | 165,190 / 46,349 / 39,146 → 175,214 / 49,887 / 42,081 | 165,733 / 46,159 / 39,002 → 175,720 / 49,682 / 41,849 |
| Vue DateTimeRangePicker | 155,050 / 44,951 / 38,142 → 165,998 / 48,808 / 41,315 | 155,486 / 44,764 / 37,977 → 166,408 / 48,533 / 41,110 |

Date-time format resolution and admission live in the two date-time picker
capabilities. Moving them out of the common picker reduced the esbuild Calendar
fixture from 62,244 to 46,362 bytes and kept it within its original allowance.
The six listed fixtures use the measured replacement baselines. The dependency
closure, unused-import erasure, and remaining fixture budgets use their existing
checks.

The October 25 input command addition raises Core's JavaScript package ceiling
from 467,000 to 468,000 bytes. The complete production artifact measures 467,600
JavaScript bytes before strict decimal-text admission, and 467,635 bytes after
rejecting JavaScript numeric/object coercion at the new step boundary. The added
NumberField set-value and decimal-step transitions
reuse Core's existing validation and exact decimal arithmetic; moving them into
Vue would duplicate portable semantics and increase host cost. Named NumberField
consumer fixtures and both bundlers pass, and all other package/install ceilings
remain unchanged. This admits the required additive commands with 365 bytes of
headroom rather than resetting the aggregate package budget.

The October 2026 performance repair makes consumer-install the shared owner of delivered-payload admission. Performance comparisons continue to report the historical complete-dist totals and ratios, but take the admitted byte ceiling from the existing `verification/consumer-install/baseline.json` through the same collector as installation checks. Reports record that policy's path, SHA-256 and per-package ceilings. Neither the performance baseline nor the packaging baseline is replaced. The independent runtime, allocation, retained-heap, category, absolute-package and installed-payload checks remain active.

The old performance totals predate the integrated features and disagreed with the already-recorded package surface. The five affected total-byte ceilings change ownership as follows; these replacement values were already enforced by the canonical packaging check:

| Package | Historical performance ceiling | Existing consumer payload ceiling |
| --- | ---: | ---: |
| Core | 868,401 | 1,056,313 |
| Form | 158,011 | 178,246 |
| Temporal | 204,942 | 284,879 |
| DOM | 1,525,797 | 2,242,137 |
| Vue | 1,890,118 | 2,412,190 |

This resolves conflicting package-admission decisions for the accepted Core JSON, Temporal, DOM and Vue additions; it does not classify measured runtime or allocation excesses as fixed. Preserving a second percentage over a different historical artifact would require either removing accepted functionality or maintaining two diverging budget decisions. The shared owner keeps one recorded payload allowance and preserves the stricter category/absolute gates. Identifier mangling was measured and rejected as a remedy: including source maps, it reduced most package totals by only 4–6% and increased Terminal's total. Runtime optimizations and their correctness/performance evidence are evaluated separately.

The October 2026 headless integration raises Tabular's JavaScript package ceiling from 160,000 to 165,000 bytes. The published 0.16.3 artifact contains 159,925 JavaScript bytes; the integrated build contains 162,388, an increase of 2,463 bytes (1.54%) and an excess of 2,388 over the old ceiling. Column reconciliation adds 1,264 bytes, row-selection semantics add 833, model state adds 294, and table/profile projection adds 72. These are the already-integrated column/default reconciliation and matching-selection contracts, not a new dependency or aggregate export. Removing those contracts would discard accepted functionality; their existing focused implementations are retained. All Tabular tests, both consumer bundlers and isolated installation checks passed before this decision. The replacement leaves 2,612 bytes of headroom; declaration, source-map, install and consumer-bundle budgets remain unchanged. The generated group evidence and implementation inventory are refreshed from the corresponding passing tests.

The October 2026 Form integration fixes ratchet only the `CalendarRoot` named-import consumer baseline. Across 130 Vue fixtures (260 independent esbuild/Vite results), only this fixture exceeded the existing 5%-plus-16-byte compressed-size limits; no external dependency names were added. Under esbuild, raw/gzip/brotli sizes move from 42,245/13,299/12,000 to 44,026/14,073/12,681 bytes. The old ceilings were 44,374/13,980/12,616, exceeded by 93 gzip and 65 brotli bytes. Under Vite, sizes move from 41,078/12,866/11,629 to 42,825/13,617/12,268; old ceilings were 43,148/13,526/12,227, exceeded by 91 gzip and 41 brotli bytes. The shared picker now respects inherited Form flags and native metadata ownership; its focused native-input helper enters this closure. Removing Calendar's redundant component wrapper and restricting DateTime submission-layout scanning to DateTime factories reduced the cost before accepting this increase. Duplicating Form semantics or weakening metadata precedence to meet the old ceiling would compromise the corrected behavior. After the Vue suite, SSR/hydration, Chromium, isolated installs, source maps, and reproducible builds passed, the measured sizes above became the replacement baselines; the existing tolerance formula and every other fixture remain unchanged. The maintainer explicitly authorized evidence-backed adjustments without a separate approval step. This decision accepts the measured consumer cost of the Form fixes and does not grant general bundle growth.

The pnpm workspace contains the published libraries `@sectile/core`, `@sectile/temporal`, `@sectile/virtual`, `@sectile/dom`, `@sectile/terminal`, and `@sectile/vue`, plus the documentation site. Every workspace project owns its source, build, tests, package contract, and project-specific verification. The repository root only orchestrates recursive project commands, validates workspace boundaries, checks repository documentation, and runs cross-package tests.

Workspace projects may depend on another package only through a declared `workspace:` protocol dependency and an exported package-name subpath. Published runtime and peer edges declare a tested floor, for example `workspace:^0.18.0`. Development-only edges may use `workspace:*`. Packaging preserves each declared floor. The release plan displays range updates when a planned workspace version leaves the supported range. Relative imports that escape a project, direct imports from another package's `src`, `dist`, or `.verification-dist`, and project scripts that reach into another project are rejected by the workspace boundary gate. This applies equally to libraries under `packages/*` and the documentation site.

The workspace lockfile pins the development toolchain. The published Vue peer floor is 3.5.42, which includes the [SSR renderer security fix](https://github.com/advisories/GHSA-g2v6-rqmx-r4w6). The Vue consumer compatibility unit installs the packed package with both its declared minimum Vue and the latest stable Vue allowed by the peer range. Each isolated consumer checks runtime imports, server rendering, hydration, interaction, and public declarations with TypeScript 5.7.3. The Vue and server renderer versions match within each fixture. The install footprint check uses the declared minimum so routine development upgrades preserve its comparison point.

For `@sectile/core`, production build input is `src/**/*.ts` excluding `src/internal/reference/**/*.ts`. Public structures live under `src/structures`; promoted composites, text, and revision use public facade files under `src`; state utilities, the editing implementation behind the text facade, reference models, and kernel mechanisms remain non-exported. Verification build input includes mirrored reference models and emits to `.verification-dist`, which is never packaged. `@sectile/temporal` owns civil date and wall-clock semantics. `@sectile/virtual` owns extent indexing and layout engines. Both depend only on exported Core subpaths and package only their own `dist` output. DOM and Vue expose these capabilities through the optional `./temporal` and `./virtual` entry points; their root entry points must remain loadable without either peer. Host adapters may consume those exported contracts, but renderer-neutral packages never depend back on a host package.

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

The August 2026 Core foundation expansion replaced the previous 1,125,000-byte total, 451,000-byte JavaScript, and 165,000-byte declaration ceilings with 1,140,000, 466,000, and 167,000 bytes respectively. The measured artifact was 1,132,182 bytes total, including 461,629 bytes of JavaScript and 165,166 bytes of declarations; the delta comes from the focused identity surface, canonical controller helpers, and public result-helper ownership. Two-bundler evidence showed zero raw-byte growth for existing focused Core imports, at most 34 bytes of brotli variation, and a 20-byte gzip side-effect closure for the new identity subpath. The replacement therefore ratchets aggregate install capacity without accepting a focused consumer tree-shaking regression.

The same work replaced Form's 40,000-byte JavaScript ceiling with 55,000 bytes after the built engine reached 52,462 bytes. The measured increase owns retained field/source indexes, chunked structural sharing, and selector-routed state publication; these remove whole-form work from field updates but add 4,653 bytes gzip in the largest measured `@sectile/vue/form` named fixture. Side-effect fixtures remained empty, optional Form installation remains isolated, and this explicit cost is accepted because runtime work and allocation take priority over compatibility and package convenience.

`@sectile/core/adapter-runtime` owns host-independent controller revision, reconciliation, notification, command projection, facade, and destruction behavior. Its public `createHostAdapter` contract connects deterministic host decoding to semantic reduction and projected effects without executing platform work. DOM and terminal packages retain host input decoding, listener lifecycle, and effect execution. Host state equality is semantic and component-specific; adapter runtime code must not serialize arbitrary state to compare it.

Node-specific terminal integration is isolated behind `@sectile/terminal/node`; importing the terminal package root or another terminal subpath does not load `node:*` modules. Portable terminal keyboard and layout helpers remain separate exported subpaths so browser terminals can provide their own byte source while sharing normalized adapter input.

`@sectile/vue` depends on exported `@sectile/dom` projections rather than importing core implementation files or mutating elements after mount. Vue components own reactivity, lifecycle, compound-part context, and rendering. ARIA state, host event normalization, interaction semantics, and virtual scroll scheduling remain in `@sectile/dom`; aesthetic styling remains with the consumer. `@sectile/vue/virtual/core` renders only a layout plan and composes with existing semantic parts instead of moving collection state into the framework adapter. Its collection, popup, geometry, text, form, SSR/hydration, and dynamic-domain witnesses establish the public framework contract. Component export parity and family evidence are release gates rather than best-effort wrapper coverage.

The Virtual JavaScript package ceiling moved from 125,000 to 140,000 bytes after bounded measurement repair stabilized at 136,435 bytes. The 11,435-byte overage is owned by the 5,154-byte blocked-vector implementation plus repair, partition, and diagnostics paths in the grid and spatial engines. The accepted replacement ceiling leaves 2.6% headroom; it does not permit aggregate-import growth. Every layout remains an explicit side-effect-free subpath, and the consumer-bundle matrix verifies unused layout engines are absent from named imports. This trades package tarball bytes for bounded update allocation and avoids the former Proxy-backed array compatibility layer.

The September 2026 Virtual surface-framing migration moves portable collection reconciliation and surface-frame algebra into focused `@sectile/virtual/collection` and `@sectile/virtual/surface` subpaths. The built JavaScript package is 148,707 bytes, 12,272 bytes above the previous stabilized 136,435-byte artifact and 8,707 bytes above the old 140,000-byte ceiling. The two new emitted modules account for 19,255 bytes (`collection.js`) and 3,682 bytes (`surface.js`) before consumer tree-shaking. The declaration artifact is 48,147 bytes; its growth comes from the new collection/surface public contracts plus the Linear cross-extent surface added by the migration. Source maps remain within the existing 175,000-byte ceiling at 112,168 bytes. Independent esbuild and Vite evidence shows existing root and side-effect fixtures retain their prior closures; the representative Linear named import changes by only 144 raw bytes under esbuild and is byte-identical under Vite, with no added dependency closure. The new collection named fixture is 6,063/5,966 raw bytes and the surface named fixture is 2,605/1,879 raw bytes under esbuild/Vite respectively, while both side-effect-only fixtures erase to zero raw bytes. Consumer-install evidence moves the Virtual tarball baseline from 54,692 to 64,336 bytes; the packed runtime, declaration, and source-map categories are the same 148,707, 48,147, and 112,168 byte artifacts above. The npm and pnpm Vue install trees increase by 67,239 and 46,306 bytes respectively but remain within their previous install budgets, add no dependency names, and keep optional peers absent, so their baselines and every non-Virtual packed-package baseline remain unchanged. The accepted ceilings are therefore 153,000 bytes of JavaScript and 50,000 bytes of declarations, leaving about 2.9% and 3.8% headroom respectively without permitting aggregate-import growth. This ratchet accepts the install and type-surface cost of moving portable ownership into Virtual while preserving focused-subpath tree-shaking for existing consumers.

The same migration intentionally ratchets only the four existing Vue high-level Virtual named bundle baselines. A two-bundler audit of all 409 fixtures whose definitions were unchanged from the protected baseline found that only `VirtualList`, `VirtualGrid`, `VirtualMasonry`, and `VirtualSpatial` exceeded their prior 5%-plus-16-byte budgets; the other 810 comparable bundle results remain on their previous baselines and no external dependency closure expanded. Under esbuild/Vite, List moves from 45,047/45,280 to 65,826/66,111 raw bytes, 14,032/14,004 to 19,046/18,952 gzip bytes, and 12,537/12,525 to 17,092/17,013 brotli bytes. Grid moves from 57,620/57,975 to 71,668/72,066 raw, 17,493/17,420 to 20,640/20,548 gzip, and 15,673/15,654 to 18,557/18,504 brotli. Masonry moves from 53,119/53,367 to 68,598/68,908 raw, 16,413/16,329 to 19,780/19,643 gzip, and 14,677/14,661 to 17,757/17,657 brotli. Spatial moves from 50,971/51,343 to 62,887/63,282 raw, 15,791/15,751 to 18,564/18,484 gzip, and 14,055/14,038 to 16,611/16,543 brotli. In each case the old Vue-only `virtual-collection-model` leaves the closure while the focused Virtual collection and surface owners enter it; List also now reaches the shared Vue collection projector and Primitive through the stable surface anatomy. Side-effect fixtures still erase to zero, the low-level core representative shrinks slightly, and a separate DOM focused-import regression was removed rather than accepted. This targeted ratchet accepts the consumer-byte cost of canonical portable ownership, surface framing, bounded reconciliation, and direct high-level projection without granting broader Vue bundle growth.
