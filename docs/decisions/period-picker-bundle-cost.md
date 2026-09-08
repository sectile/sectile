# Period picker consumer cost

Accepted on 2026-09-08 for issues #38/#41 after the user delegated resolution of the measured functionality/closure tradeoff. This decision covers the eight DOM/Vue month/year scalar/range named consumers and both existing bundlers. It does not authorize changes to unrelated budgets or to the comparison formula.

## Implementation and consumer impact

Temporal owns period navigation, canonical-date eligibility and bounded scans. The four period reducers share one internal kernel. DOM period entrypoints supply private key translation and cell projection capabilities; ordinary date hosts retain only the generic dispatch points. Existing native listener ownership and disconnect behavior remain unchanged. Setup, retained callbacks and per-cell host work are O(1), excluding the application availability predicate. No external dependency was added.

The existing baseline predates already-shipped period-value and visibility repairs. In the same esbuild setup, the MonthRangePicker baseline was 51,026 raw bytes, while the pre-task HEAD bbf2b875 produced 53,158. Before final host isolation, Temporal changes contributed 1,944 more raw bytes and DOM wiring contributed 878. The Temporal kernel itself contributed 1,879 bytes in the bundle metafile. These are required period navigation/policy behaviors, not a module relocation alone.

Final host isolation changes ordinary DateRangePicker from 53,091 to 52,463 raw bytes: 628 bytes removed, with no retained DOM or Temporal period module. Relative to the pre-task HEAD's 52,302 bytes, 161 bytes remain for generic capability dispatch. Ordinary Temporal Calendar remains 8,858 bytes, unchanged from the pre-task HEAD. In exchange for keeping period-specific projection out of ordinary hosts, MonthRangePicker is 56,358 rather than 55,980 raw bytes (378 bytes higher). Its final gzip size is 16,829 versus the pre-task HEAD's 15,880. This limited period-only cost is accepted to preserve correct behavior and focused consumer closures.

The production-factory checks explicitly bundle createDatePicker and createDateRangePicker in esbuild and Vite. This is important because the generic DatePicker named inventory fixture chooses calendarID rather than its factory. The guard rejects retained period kernels in base date factories and allows them in period factories.

## Measurement and approved values

Node v24.20.0; existing scripts/consumer-bundles/bundle.mjs, ES2022, minification and tree-shaking enabled. Raw is the minified byte count; gzip uses level 9; Brotli uses the existing compressor defaults. The complete affected set comprised 301 fixtures / 602 bundles. Exactly the 16 rows below exceeded a previous size ceiling. Other fixture records, fixture identities, dependencies and the 5% + 16-byte tolerance stay unchanged.

Each triple is raw / gzip / Brotli bytes. The previous ceiling for each component is ceil(previous * 1.05) + 16; the approved new ceiling is ceil(accepted * 1.05) + 16. This exact formula applies independently to all three numbers and remains implemented in the existing comparison owner. For example, the esbuild MonthRangePicker raw ceiling changes from 53,594 to 59,192 bytes.

| Consumer | Bundler | Previous measurement | Accepted measurement |
|---|---|---|---|
| DOM MonthPicker | esbuild | 67862 / 19144 / 17106 | 72967 / 20612 / 18391 |
| DOM MonthPicker | Vite | 68296 / 19177 / 17131 | 73448 / 20665 / 18428 |
| DOM MonthRangePicker | esbuild | 51026 / 15297 / 13669 | 56358 / 16829 / 15016 |
| DOM MonthRangePicker | Vite | 51374 / 15335 / 13690 | 56752 / 16874 / 15032 |
| DOM YearPicker | esbuild | 67862 / 19144 / 17106 | 72885 / 20608 / 18353 |
| DOM YearPicker | Vite | 68296 / 19177 / 17131 | 73366 / 20660 / 18462 |
| DOM YearRangePicker | esbuild | 51026 / 15297 / 13669 | 56228 / 16804 / 14977 |
| DOM YearRangePicker | Vite | 51374 / 15335 / 13690 | 56622 / 16856 / 15039 |
| Vue MonthPicker | esbuild | 89208 / 25934 / 22801 | 94234 / 27404 / 23991 |
| Vue MonthPicker | Vite | 87386 / 25434 / 22407 | 93030 / 27021 / 23741 |
| Vue MonthRangePicker | esbuild | 72859 / 21940 / 19514 | 78106 / 23351 / 20769 |
| Vue MonthRangePicker | Vite | 70924 / 21493 / 19121 | 76797 / 22985 / 20493 |
| Vue YearPicker | esbuild | 89259 / 25933 / 22793 | 94207 / 27390 / 24044 |
| Vue YearPicker | Vite | 87440 / 25438 / 22430 | 93006 / 27015 / 23757 |
| Vue YearRangePicker | esbuild | 72909 / 21955 / 19516 | 78030 / 23352 / 20798 |
| Vue YearRangePicker | Vite | 70977 / 21509 / 19176 | 76724 / 22985 / 20502 |

## Temporal packed-artifact costs

The same delegated repair also requires an isolated update to the Temporal entries in the install and source-map size baselines. Current `consumer-install` and `source-maps` checks completed their structural/import checks but rejected the previous Temporal size ceilings. Diagnostic collection through the existing owners showed that replacing only the Temporal records satisfies every remaining comparison; all other package records, dependency rules and installed-size limits stay unchanged.

Temporal now ships 63 files rather than 60. The additional internal period kernel consists of JavaScript (3221 bytes), its declaration (1013 bytes), and its external source map (2233 bytes). Existing period public declarations/reducers, policy normalization, page-limit/error documentation and earlier fixes also contribute to the increase from the older baseline. There are still three non-build files; no tests, temporary diagnostics or embedded source content were added to the package. Every JavaScript artifact has an adjacent portable external map; declaration maps remain absent.

| Install measurement | Previous | Accepted | Previous ceiling | Approved ceiling |
|---|---:|---:|---:|---:|
| pnpm tarball | 31825 | 36065 | 33449 | 37901 |
| Runtime JavaScript | 76211 | 86329 | 80054 | 90678 |
| Declarations | 34037 | 39072 | 35771 | 41058 |
| External source maps | 54433 | 61702 | 57187 | 64820 |

The install comparison retains ceil(value * 1.05) + 32. Unpacked size changes from 170230 to 192612 bytes. The source-map owner independently uses npm dry-run packaging, so its package metadata/compressed sizes differ: tarball 31286 to 35544 (ceiling 32867 to 37338), unpacked 170236 to 192623 (ceiling 178764 to 202271). Its formula remains ceil(value * 1.05) + 16. These scoped updates accept required shipped functionality while preserving all file, import, map-path, dependency and installation checks.

## Evidence ownership

The existing consumer baseline receives only these reviewed results. Consumer fixtures and all other rows remain unchanged. Existing package interaction and declaration suites protect behavior. scripts/consumer-bundles.test.mjs verifies actual base factories plus valid/invalid closure examples, and scripts/consumer-bundles/check.mjs applies the closure guard to measured results. Diagnostic attribution and batch measurement helpers stay in ignored .tmp output; they are not new production or package commands.
