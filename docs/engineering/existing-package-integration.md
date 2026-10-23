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
