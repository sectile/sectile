# Existing package integration

## Scope

The maintainer requested local integration of the existing package changes into
`main`, keeping the styled packages on their work branch and rebasing that branch
after integration. This is not publication, a release, independent approval, or
completion of the wider UI workstream.

- Work ID: existing-package-integration-20261023
- Actor: Codex / Implementer
- Approved policy: `8a96dc7c50c73214f9af87554d2fbbf511a85175`
- Source branch snapshot: `ac06793f1a444ed27da0e2631af0944f7dd5361c`
- Existing runtime extraction: `240190bf4a71971cd2610148f6579373c87586cb`
- Original main: `8a96dc7c50c73214f9af87554d2fbbf511a85175`
- Completion surface: local source integration; registry publication is excluded.

The extraction includes Core, DOM, Vue, Form, Temporal, Tabular, Chart, Virtual,
and Terminal. Theme, Vue UI, Nuxt UI, Vite UI, their CSS compiler, their framework
integrations, and the internal preview remain excluded. Existing runtime source
does not import these new packages. The lockfile is regenerated for the existing
workspace, not copied from the expanded workspace. The shared JavaScript
compactor retains legal notices; no CSS compiler dependency is introduced.

## Integration corrections

The complete existing-package test run found two outdated Vue assertions. A
standalone inline menu retains its invoked item's focus, unlike a closed popup.
A ColorPicker area has the group role and publishes its value description through
`aria-description`, rather than the range-only `aria-valuetext`. The existing DOM
regressions and the corresponding producer changes establish these contracts.
Both assertions were corrected without changing runtime behavior or removing
focus, accessibility, or bounded-publication checks.

Previously omitted metadata is registered explicitly: DOM text-ink measurement
in the structure and signature inventories, Core transfer/tree-select subpaths
in the DAG, CascadeList's optional reading-direction signature in the migration
mapping, and the existing named bundle representatives. Generated inventories
use their existing owners. The DOM focus-visibility complexity contract keeps its
DOM evidence; the separate styled consumer test remains on the UI branch.

## Bundle baseline decision — 2026-10-23

The extracted runtime is stable. All 484 fixtures were measured with both Vite
and esbuild, and current closure/root-pair/unused-import checks passed. Four named
fixtures exceeded their historical relative budgets. All eight affected results
retain exactly the same module lists and external dependency lists as before.
The remaining 960 results satisfy their existing budgets.

| Fixture | Bundler | Previous raw/gzip/brotli bytes | Accepted raw/gzip/brotli bytes |
| --- | --- | --- | --- |
| DOM focus visibility | esbuild | 9094 / 3394 / 3004 | 9774 / 3633 / 3217 |
| DOM focus visibility | Vite | 8474 / 3186 / 2830 | 9155 / 3424 / 3049 |
| Vue data grid | esbuild | 42494 / 12528 / 11343 | 44431 / 13182 / 11920 |
| Vue data grid | Vite | 41667 / 12140 / 10992 | 43646 / 12796 / 11592 |
| Vue data table | esbuild | 35761 / 10859 / 9841 | 37270 / 11393 / 10303 |
| Vue data table | Vite | 34881 / 10466 / 9469 | 36430 / 11007 / 9949 |
| Vue data tree grid | esbuild | 42692 / 12562 / 11365 | 44629 / 13211 / 11950 |
| Vue data tree grid | Vite | 41865 / 12171 / 11001 | 43844 / 12826 / 11597 |

The focus owner grew after the historical measurement through retained spatial
transition handling (`59290c66e`). Tabular composition gained canonical SSR
selection, native-control projection, bulk-selection state, and editor visibility
handling (`b84753196`, `3867e72cd`, `b999a70c3`, `bf5d911a8`, `26f5fbd26`).
These are existing-consumer correctness capabilities, not styled component
dependencies. The maintainer delegated evidence-backed budget decisions; the
implementer accepts these specific feature deltas. Only the eight measured byte
rows change: the relative allowance, zero-unused-import requirement, dependency
checks, and all other rows stay unchanged. No automatic global rebaseline is used.

The diagnostic bundle audit and its output are local-only at
`/tmp/sectile-headless-bundle-audit-20261023.mjs` and
`/tmp/sectile-headless-bundle-audit-20261023.log`. The accepted measurements and
module/dependency inventories are preserved in the committed baseline. This is
an implementation decision, not independent reviewer approval.

## Verification — v1

- Record ID: existing-package-integration-20261023-verification-1
- Work ID / Run ID: existing-package-integration-20261023 / extraction-close-1
- Verifier / role: Codex / implementation self-check, not independent approval
- Verified at: 2026-10-23T14:40:00+09:00
- Phase: Implementation close
- Source full SHA: `98628b58bf9e3ae7f20d61268ba67864a4c1cb15`
- Policy/template: sectile-records/v1 / `8a96dc7c50c73214f9af87554d2fbbf511a85175`
- Environment: WSL Linux, Node 24.22.0, pnpm 11.24.0, TypeScript 7.0.2.
- Source state: clean committed extraction; later changes to this record are prose only.
- Package/registry artifact: N/A; local tarballs and isolated installations only.
- Accepted criteria: existing packages independently usable without new styled
  packages; existing public extensions, behavior, types, and tree-shaking retained.

| Criterion | Procedure | Outcome |
| --- | --- | --- |
| Production packages | Sequential builds of the existing nine packages | Passed |
| Existing package behavior | Package tests, then Vue rerun after two assertion repairs | 2721 passed, 38 explicitly skipped GC-dependent cases, zero remaining failures |
| Public types | Existing package public type projects, including Vue SFC projects | Passed |
| Package boundaries | Source and freshly rebuilt production structure graph | Passed: 642 source modules, 617 runtime modules, no recorded debt |
| Portable/host parity | Cross-host suite with exposed GC | 75 passed, zero skipped |
| Changed verification tools | Existing completeness, bundle, install, packed-content and source-map tests | 30 passed, zero skipped |
| Bundles | 484 fixtures, esbuild and Vite; root/direct, unused import and dependency checks | 968 results qualified; eight reviewed byte rows revalidated from the exact captured measurements |
| Isolated installation | Existing consumer runner, npm and pnpm | Passed: nine tarballs, two isolated installs; installed payloads 22311755 and 22319624 bytes |
| Source maps | Existing map validation | Passed: 617 JavaScript files and external maps; no declaration maps |
| Registered contracts | Public signatures, breaking mappings, semantic authority, DAG, algorithm reuse, complexity, Form scenarios, Tabular laws/implementation, crossover provenance and public-change registration | Passed |
| Git hygiene | Working and staged diff checks | Passed |

The package runtime and type inputs did not change after their qualifying checks.
The final two cross-host fixtures were then checked against the same production
artifacts. Their facade now models native containment, activeElement and
parentNode, and starts the virtual reveal scenario from a focused cell. Existing
trace, focus completion and reveal-order assertions remain intact.

Earlier failed checks remain explicit: stale Vue assertions; missing structure,
signature, DAG and optional-direction migration registrations; stale named bundle
representatives; four historical bundle budgets; outdated Tabular footprint;
and three cross-host failures caused by incomplete DOM facades or an unfocused
scenario. These were corrected at their owners and the affected checks rerun.
No timeout, global relative allowance, or zero-byte requirement was relaxed.

Local-only full logs use `/tmp/sectile-headless-*-20261023.log`; these are
disposable, not a remotely archived evidence store. Key SHA-256 receipts:

- Bundle audit: `b1008d7c75e473c3401f69199a2290c7d913a332295647f245e88a6aba6a632b`.
- Isolated install report: `bf9db54df7fd4e12c1d22ab36216e52dd645a05457d47a30f026f847032ea415`.
- Final cross-host/tooling log: `2995c59d6c4e739ed68aa3cff5aace27e7a8dd6669600c14f842a432bf149b6a`.

Heavy checks ran sequentially under a shared lock with MemoryHigh=3GiB,
MemoryMax=4GiB, MemorySwapMax=512MiB, CPUQuota=200%, and a 2GiB Node heap.
The 38 GC-only package cases, a fresh statistical performance certification,
browser certification, the documentation-site build, remote CI, publication and
independent review are not claimed by this integration receipt. Wider UI
verification and completion remain separate.

Conclusion: qualifying local source integration, not a published release.
